const express = require("express")
const http = require("http")
const socketIo = require("socket.io")
const cors = require("cors")
const helmet = require("helmet")
const compression = require("compression")
const multer = require("multer")
const sharp = require("sharp")
const jsQR = require("jsqr")
const fs = require("fs").promises
const path = require("path")
const archiver = require("archiver")

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})

const PORT = process.env.PORT || 3000
const EXTENSION_PORT = process.env.EXTENSION_PORT || 8080

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow extension resources
  }),
)
app.use(compression())
app.use(cors())
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))

// Static files for extension
app.use("/extension", express.static(path.join(__dirname, "extension")))
app.use("/assets", express.static(path.join(__dirname, "assets")))

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
})

// Extension development server
class ExtensionServer {
  constructor() {
    this.clients = new Set()
    this.scanHistory = []
    this.setupRoutes()
    this.setupWebSocket()
  }

  setupRoutes() {
    // Serve extension files
    app.get("/", (req, res) => {
      res.sendFile(path.join(__dirname, "public", "index.html"))
    })

    // Extension manifest
    app.get("/extension/manifest.json", (req, res) => {
      res.sendFile(path.join(__dirname, "extension", "manifest.json"))
    })

    // QR Code scanning API
    app.post("/api/scan", upload.single("image"), async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No image provided" })
        }

        const result = await this.processQRImage(req.file.buffer)

        if (result) {
          const scanResult = {
            id: Date.now(),
            data: result.data,
            type: this.detectQRType(result.data),
            timestamp: new Date().toISOString(),
            source: "api",
          }

          this.scanHistory.push(scanResult)

          // Broadcast to connected clients
          io.emit("qr_detected", scanResult)

          res.json({
            success: true,
            result: scanResult,
          })
        } else {
          res.json({
            success: false,
            message: "No QR code found in image",
          })
        }
      } catch (error) {
        console.error("Scan error:", error)
        res.status(500).json({ error: "Failed to process image" })
      }
    })

    // Get scan history
    app.get("/api/history", (req, res) => {
      const limit = Number.parseInt(req.query.limit) || 50
      const offset = Number.parseInt(req.query.offset) || 0

      const results = this.scanHistory.slice(offset, offset + limit).reverse()

      res.json({
        results,
        total: this.scanHistory.length,
        limit,
        offset,
      })
    })

    // Clear history
    app.delete("/api/history", (req, res) => {
      this.scanHistory = []
      io.emit("history_cleared")
      res.json({ success: true })
    })

    // Export history
    app.get("/api/export", async (req, res) => {
      try {
        const format = req.query.format || "json"

        if (format === "json") {
          res.setHeader("Content-Type", "application/json")
          res.setHeader("Content-Disposition", "attachment; filename=qr-history.json")
          res.json(this.scanHistory)
        } else if (format === "csv") {
          const csv = this.convertToCSV(this.scanHistory)
          res.setHeader("Content-Type", "text/csv")
          res.setHeader("Content-Disposition", "attachment; filename=qr-history.csv")
          res.send(csv)
        }
      } catch (error) {
        res.status(500).json({ error: "Export failed" })
      }
    })

    // Extension package download
    app.get("/api/download-extension", async (req, res) => {
      try {
        const zipPath = await this.createExtensionPackage()
        res.download(zipPath, "qr-scanner-extension.zip")
      } catch (error) {
        res.status(500).json({ error: "Failed to create extension package" })
      }
    })

    // Health check
    app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        clients: this.clients.size,
        scans: this.scanHistory.length,
      })
    })
  }

  setupWebSocket() {
    io.on("connection", (socket) => {
      console.log("Client connected:", socket.id)
      this.clients.add(socket)

      socket.on("scan_request", async (data) => {
        try {
          const result = await this.processQRData(data)
          socket.emit("scan_result", result)
        } catch (error) {
          socket.emit("scan_error", { error: error.message })
        }
      })

      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id)
        this.clients.delete(socket)
      })
    })
  }

  async processQRImage(imageBuffer) {
    try {
      // Convert image to RGB format
      const { data, info } = await sharp(imageBuffer).raw().ensureAlpha(false).toBuffer({ resolveWithObject: true })

      // Convert to RGBA for jsQR
      const rgbaData = new Uint8ClampedArray(info.width * info.height * 4)
      for (let i = 0; i < data.length; i += 3) {
        const pixelIndex = (i / 3) * 4
        rgbaData[pixelIndex] = data[i] // R
        rgbaData[pixelIndex + 1] = data[i + 1] // G
        rgbaData[pixelIndex + 2] = data[i + 2] // B
        rgbaData[pixelIndex + 3] = 255 // A
      }

      // Scan for QR code
      const code = jsQR(rgbaData, info.width, info.height)
      return code
    } catch (error) {
      console.error("Image processing error:", error)
      throw error
    }
  }

  detectQRType(data) {
    if (data.startsWith("http://") || data.startsWith("https://")) return "URL"
    if (data.startsWith("mailto:")) return "EMAIL"
    if (data.startsWith("tel:")) return "PHONE"
    if (data.startsWith("wifi:")) return "WIFI"
    if (data.includes("BEGIN:VCARD")) return "CONTACT"
    if (data.includes("BEGIN:VEVENT")) return "EVENT"
    if (/^\d+$/.test(data)) return "NUMBER"
    return "TEXT"
  }

  convertToCSV(data) {
    const headers = ["ID", "Data", "Type", "Timestamp", "Source"]
    const rows = data.map((item) => [
      item.id,
      `"${item.data.replace(/"/g, '""')}"`,
      item.type,
      item.timestamp,
      item.source,
    ])

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")
  }

  async createExtensionPackage() {
    const zipPath = path.join(__dirname, "temp", "extension.zip")

    // Ensure temp directory exists
    await fs.mkdir(path.dirname(zipPath), { recursive: true })

    return new Promise((resolve, reject) => {
      const output = require("fs").createWriteStream(zipPath)
      const archive = archiver("zip", { zlib: { level: 9 } })

      output.on("close", () => resolve(zipPath))
      archive.on("error", reject)

      archive.pipe(output)
      archive.directory(path.join(__dirname, "extension"), false)
      archive.finalize()
    })
  }
}

// Initialize extension server
const extensionServer = new ExtensionServer()

// Start servers
server.listen(PORT, () => {
  console.log(`🚀 QR Scanner Extension Server running on port ${PORT}`)
  console.log(`📱 Extension available at: http://localhost:${PORT}/extension`)
  console.log(`🔧 API available at: http://localhost:${PORT}/api`)
})

// Extension hosting server
const extensionApp = express()
extensionApp.use(cors())
extensionApp.use("/extension", express.static(path.join(__dirname, "extension")))

extensionApp.listen(EXTENSION_PORT, () => {
  console.log(`📦 Extension hosting server running on port ${EXTENSION_PORT}`)
})
