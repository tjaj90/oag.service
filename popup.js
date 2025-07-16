class AdvancedQRScanner {
  constructor() {
    this.video = document.getElementById("video")
    this.overlay = document.getElementById("overlay")
    this.placeholder = document.getElementById("placeholder")
    this.startBtn = document.getElementById("startBtn")
    this.stopBtn = document.getElementById("stopBtn")
    this.historyBtn = document.getElementById("historyBtn")
    this.settingsBtn = document.getElementById("settingsBtn")
    this.resultContent = document.getElementById("resultContent")
    this.resultCount = document.getElementById("resultCount")
    this.resultActions = document.getElementById("resultActions")
    this.statusBar = document.getElementById("statusBar")
    this.loading = document.getElementById("loading")

    this.scanner = null
    this.isScanning = false
    this.scanMode = "standard"
    this.results = []
    this.scanHistory = []

    this.init()
  }

  async init() {
    this.setupEventListeners()
    await this.loadHistory()
    this.updateUI()
  }

  setupEventListeners() {
    // Scan mode selection
    document.querySelectorAll(".scan-mode").forEach((mode) => {
      mode.addEventListener("click", (e) => {
        document.querySelectorAll(".scan-mode").forEach((m) => m.classList.remove("active"))
        e.currentTarget.classList.add("active")
        this.scanMode = e.currentTarget.dataset.mode
        this.updateStatusBar(`Switched to ${this.scanMode} mode`)
      })
    })

    // Control buttons
    this.startBtn.addEventListener("click", () => this.startScanning())
    this.stopBtn.addEventListener("click", () => this.stopScanning())
    this.historyBtn.addEventListener("click", () => this.showHistory())
    this.settingsBtn.addEventListener("click", () => this.showSettings())

    // Result actions
    document.getElementById("copyAllBtn").addEventListener("click", () => this.copyAllResults())
    document.getElementById("exportBtn").addEventListener("click", () => this.exportResults())
    document.getElementById("clearBtn").addEventListener("click", () => this.clearResults())
  }

  async startScanning() {
    try {
      this.updateStatusBar("Requesting camera access...")
      this.loading.style.display = "inline-block"
      this.startBtn.disabled = true

      if (this.scanMode === "fullscreen") {
        await this.openFullscreenScanner()
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      this.video.srcObject = stream
      await this.video.play()

      this.placeholder.style.display = "none"
      this.video.style.display = "block"
      this.overlay.style.display = "block"
      this.startBtn.style.display = "none"
      this.stopBtn.style.display = "inline-block"
      this.loading.style.display = "none"

      this.isScanning = true
      this.startQRDetection()
      this.updateStatusBar("Scanning for QR codes...")
    } catch (error) {
      this.handleError(error)
    }
  }

  async openFullscreenScanner() {
    try {
      const [tab] = await window.chrome.tabs.query({ active: true, currentWindow: true })
      await window.chrome.tabs.sendMessage(tab.id, { action: "openFullscreenScanner" })
      window.close()
    } catch (error) {
      console.error("Failed to open fullscreen scanner:", error)
    }
  }

  startQRDetection() {
    if (!this.isScanning) return

    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")

    const detectQR = () => {
      if (!this.isScanning) return

      if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
        canvas.width = this.video.videoWidth
        canvas.height = this.video.videoHeight
        context.drawImage(this.video, 0, 0, canvas.width, canvas.height)

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

        try {
          const code = window.QrScanner.scanImage(imageData)
          if (code) {
            this.processQRResult(code)
          }
        } catch (error) {
          // No QR code found, continue scanning
        }
      }

      if (this.isScanning) {
        requestAnimationFrame(detectQR)
      }
    }

    detectQR()
  }

  processQRResult(data) {
    const result = {
      id: Date.now(),
      data: data,
      type: this.detectQRType(data),
      timestamp: new Date().toISOString(),
      mode: this.scanMode,
    }

    // Check for duplicates in current session
    if (!this.results.find((r) => r.data === data)) {
      this.results.push(result)
      this.addToHistory(result)
      this.updateResultsDisplay()
      this.showScanFeedback()

      if (this.scanMode !== "batch") {
        // Auto-stop for single scan modes
        setTimeout(() => this.stopScanning(), 1000)
      }
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

  showScanFeedback() {
    this.overlay.style.borderColor = "#00ff88"
    this.overlay.style.boxShadow = "0 0 20px rgba(0, 255, 136, 0.6)"

    setTimeout(() => {
      this.overlay.style.borderColor = "#00ff88"
      this.overlay.style.boxShadow = "none"
    }, 500)
  }

  updateResultsDisplay() {
    if (this.results.length === 0) {
      this.resultContent.innerHTML = '<div class="no-result">No QR codes detected yet</div>'
      this.resultActions.style.display = "none"
      this.resultCount.textContent = "0 found"
      return
    }

    this.resultContent.innerHTML = this.results
      .map(
        (result) => `
      <div class="result-item">
        <span class="result-type">${result.type}</span>
        <div class="result-text">${this.formatResultText(result)}</div>
        <button class="btn-small btn-secondary" onclick="scanner.copyResult('${result.data}')">📋</button>
        <button class="btn-small btn-secondary" onclick="scanner.openResult('${result.data}', '${result.type}')">🔗</button>
      </div>
    `,
      )
      .join("")

    this.resultActions.style.display = "flex"
    this.resultCount.textContent = `${this.results.length} found`
  }

  formatResultText(result) {
    const maxLength = 50
    if (result.data.length > maxLength) {
      return result.data.substring(0, maxLength) + "..."
    }
    return result.data
  }

  async copyResult(data) {
    try {
      await navigator.clipboard.writeText(data)
      this.updateStatusBar("Copied to clipboard!")
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  openResult(data, type) {
    if (type === "URL") {
      window.chrome.tabs.create({ url: data })
    } else if (type === "EMAIL") {
      window.chrome.tabs.create({ url: data })
    } else if (type === "PHONE") {
      window.chrome.tabs.create({ url: data })
    } else {
      this.copyResult(data)
    }
  }

  async copyAllResults() {
    const allData = this.results.map((r) => r.data).join("\n")
    await this.copyResult(allData)
  }

  exportResults() {
    const exportData = {
      timestamp: new Date().toISOString(),
      mode: this.scanMode,
      results: this.results,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)

    window.chrome.downloads.download({
      url: url,
      filename: `qr-scan-results-${Date.now()}.json`,
    })
  }

  clearResults() {
    this.results = []
    this.updateResultsDisplay()
    this.updateStatusBar("Results cleared")
  }

  stopScanning() {
    this.isScanning = false

    if (this.video.srcObject) {
      this.video.srcObject.getTracks().forEach((track) => track.stop())
    }

    this.video.style.display = "none"
    this.overlay.style.display = "none"
    this.placeholder.style.display = "flex"
    this.startBtn.style.display = "inline-block"
    this.stopBtn.style.display = "none"
    this.startBtn.disabled = false
    this.loading.style.display = "none"

    this.updateStatusBar("Scanning stopped")
  }

  async addToHistory(result) {
    this.scanHistory.unshift(result)
    if (this.scanHistory.length > 100) {
      this.scanHistory = this.scanHistory.slice(0, 100)
    }
    await this.saveHistory()
  }

  async loadHistory() {
    try {
      const result = await window.chrome.storage.local.get(["scanHistory"])
      this.scanHistory = result.scanHistory || []
    } catch (error) {
      console.error("Failed to load history:", error)
    }
  }

  async saveHistory() {
    try {
      await window.chrome.storage.local.set({ scanHistory: this.scanHistory })
    } catch (error) {
      console.error("Failed to save history:", error)
    }
  }

  showHistory() {
    // Open history in a new tab or modal
    window.chrome.tabs.create({ url: window.chrome.runtime.getURL("history.html") })
  }

  showSettings() {
    // Open settings in a new tab or modal
    window.chrome.tabs.create({ url: window.chrome.runtime.getURL("settings.html") })
  }

  updateStatusBar(message) {
    this.statusBar.textContent = message
    setTimeout(() => {
      this.statusBar.textContent = "Ready to scan QR codes"
    }, 3000)
  }

  updateUI() {
    // Update UI based on current state
  }

  handleError(error) {
    this.loading.style.display = "none"
    this.startBtn.disabled = false

    let message = "Failed to access camera. "
    if (error.name === "NotAllowedError") {
      message += "Please allow camera access."
    } else if (error.name === "NotFoundError") {
      message += "No camera found."
    } else {
      message += error.message
    }

    this.updateStatusBar(message)
  }
}

// Initialize scanner when popup loads
let scanner
document.addEventListener("DOMContentLoaded", () => {
  scanner = new AdvancedQRScanner()
})
