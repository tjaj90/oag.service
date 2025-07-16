const fs = require("fs").promises
const path = require("path")
const archiver = require("archiver")

class ExtensionBuilder {
  constructor() {
    this.extensionDir = path.join(__dirname, "extension")
    this.buildDir = path.join(__dirname, "build")
  }

  async build() {
    console.log("🔨 Building QR Scanner Extension...")

    try {
      // Create build directory
      await fs.mkdir(this.buildDir, { recursive: true })

      // Copy extension files
      await this.copyExtensionFiles()

      // Update manifest for production
      await this.updateManifest()

      // Create extension package
      await this.createPackage()

      console.log("✅ Extension built successfully!")
      console.log(`📦 Package created at: ${path.join(this.buildDir, "extension.zip")}`)
    } catch (error) {
      console.error("❌ Build failed:", error)
      process.exit(1)
    }
  }

  async copyExtensionFiles() {
    const files = [
      "manifest.json",
      "popup.html",
      "popup.js",
      "background.js",
      "content.js",
      "qr-scanner.min.js",
      "scanner.html",
    ]

    for (const file of files) {
      const src = path.join(this.extensionDir, file)
      const dest = path.join(this.buildDir, file)

      try {
        await fs.copyFile(src, dest)
        console.log(`📄 Copied: ${file}`)
      } catch (error) {
        console.warn(`⚠️  Warning: Could not copy ${file}`)
      }
    }

    // Copy icons directory
    try {
      await this.copyDirectory(path.join(this.extensionDir, "icons"), path.join(this.buildDir, "icons"))
      console.log("🎨 Copied: icons/")
    } catch (error) {
      console.warn("⚠️  Warning: Could not copy icons directory")
    }
  }

  async copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true })
    const entries = await fs.readdir(src, { withFileTypes: true })

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name)
      const destPath = path.join(dest, entry.name)

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath)
      } else {
        await fs.copyFile(srcPath, destPath)
      }
    }
  }

  async updateManifest() {
    const manifestPath = path.join(this.buildDir, "manifest.json")

    try {
      const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"))

      // Update for production
      manifest.version = process.env.VERSION || manifest.version
      manifest.name = process.env.EXTENSION_NAME || manifest.name

      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2))
      console.log("📝 Updated manifest.json")
    } catch (error) {
      console.warn("⚠️  Warning: Could not update manifest.json")
    }
  }

  async createPackage() {
    const zipPath = path.join(this.buildDir, "extension.zip")

    return new Promise((resolve, reject) => {
      const output = require("fs").createWriteStream(zipPath)
      const archive = archiver("zip", { zlib: { level: 9 } })

      output.on("close", () => {
        console.log(`📦 Package size: ${archive.pointer()} bytes`)
        resolve()
      })

      archive.on("error", reject)
      archive.pipe(output)
      archive.directory(this.buildDir, false, (entry) => {
        return entry.name !== "extension.zip" ? entry : false
      })
      archive.finalize()
    })
  }
}

// Run build if called directly
if (require.main === module) {
  const builder = new ExtensionBuilder()
  builder.build()
}

module.exports = ExtensionBuilder
