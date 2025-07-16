// Content script for full-screen scanning and page QR detection
const chrome = window.chrome // Declare the chrome variable

class FullscreenQRScanner {
  constructor() {
    this.isActive = false
    this.overlay = null
    this.video = null
    this.scanner = null
  }

  async activate() {
    if (this.isActive) return

    this.isActive = true
    this.createOverlay()
    await this.startCamera()
  }

  createOverlay() {
    this.overlay = document.createElement("div")
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.9);
      z-index: 999999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    `

    const container = document.createElement("div")
    container.style.cssText = `
      background: white;
      border-radius: 20px;
      padding: 30px;
      max-width: 600px;
      width: 90%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    `

    const title = document.createElement("h2")
    title.textContent = "AI QR Scanner Pro - Full Screen"
    title.style.cssText = `
      margin: 0 0 20px 0;
      color: #333;
      font-size: 24px;
    `

    this.video = document.createElement("video")
    this.video.style.cssText = `
      width: 100%;
      max-width: 400px;
      height: 300px;
      border-radius: 15px;
      object-fit: cover;
      background: #000;
      margin-bottom: 20px;
    `
    this.video.autoplay = true
    this.video.muted = true
    this.video.playsInline = true

    const closeBtn = document.createElement("button")
    closeBtn.textContent = "Close Scanner"
    closeBtn.style.cssText = `
      background: #ff4757;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      margin-top: 15px;
    `
    closeBtn.onclick = () => this.deactivate()

    const resultDiv = document.createElement("div")
    resultDiv.id = "fullscreen-result"
    resultDiv.style.cssText = `
      margin-top: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 10px;
      min-height: 50px;
      display: none;
    `

    container.appendChild(title)
    container.appendChild(this.video)
    container.appendChild(resultDiv)
    container.appendChild(closeBtn)
    this.overlay.appendChild(container)
    document.body.appendChild(this.overlay)

    // ESC key to close
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isActive) {
        this.deactivate()
      }
    })
  }

  async startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      this.video.srcObject = stream
      await this.video.play()
      this.startScanning()
    } catch (error) {
      console.error("Camera error:", error)
      this.showError("Failed to access camera")
    }
  }

  startScanning() {
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")

    const scan = () => {
      if (!this.isActive) return

      if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
        canvas.width = this.video.videoWidth
        canvas.height = this.video.videoHeight
        context.drawImage(this.video, 0, 0, canvas.width, canvas.height)

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

        try {
          // Use QR detection library here
          const result = this.detectQR(imageData)
          if (result) {
            this.showResult(result)
            return
          }
        } catch (error) {
          // Continue scanning
        }
      }

      requestAnimationFrame(scan)
    }

    scan()
  }

  detectQR(imageData) {
    // Placeholder for QR detection
    // In real implementation, use jsQR or similar library
    return null
  }

  showResult(data) {
    const resultDiv = document.getElementById("fullscreen-result")
    resultDiv.style.display = "block"
    resultDiv.innerHTML = `
      <h3 style="margin: 0 0 10px 0; color: #2ecc71;">QR Code Detected!</h3>
      <p style="margin: 0 0 15px 0; word-break: break-all;">${data}</p>
      <button onclick="navigator.clipboard.writeText('${data}')" 
              style="background: #3498db; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer; margin-right: 10px;">
        Copy
      </button>
      <button onclick="window.open('${data}', '_blank')" 
              style="background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">
        Open
      </button>
    `

    // Send result to background script
    chrome.runtime.sendMessage({
      action: "scanComplete",
      data: data,
    })
  }

  showError(message) {
    const resultDiv = document.getElementById("fullscreen-result")
    resultDiv.style.display = "block"
    resultDiv.innerHTML = `
      <h3 style="margin: 0 0 10px 0; color: #e74c3c;">Error</h3>
      <p style="margin: 0; color: #666;">${message}</p>
    `
  }

  deactivate() {
    this.isActive = false

    if (this.video && this.video.srcObject) {
      this.video.srcObject.getTracks().forEach((track) => track.stop())
    }

    if (this.overlay) {
      document.body.removeChild(this.overlay)
      this.overlay = null
    }
  }
}

// Page QR code detection
function scanPageQRCodes() {
  const images = document.querySelectorAll("img")
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")
  const results = []

  images.forEach((img) => {
    if (img.complete && img.naturalWidth > 0) {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      context.drawImage(img, 0, 0)

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

      try {
        // Detect QR code in image
        const result = detectQRInImage(imageData)
        if (result) {
          results.push({
            data: result,
            element: img,
            src: img.src,
          })
        }
      } catch (error) {
        // Continue with next image
      }
    }
  })

  if (results.length > 0) {
    showPageQRResults(results)
  } else {
    alert("No QR codes found on this page")
  }
}

function detectQRInImage(imageData) {
  // Placeholder for QR detection in images
  return null
}

function showPageQRResults(results) {
  const overlay = document.createElement("div")
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.8);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  `

  const content = document.createElement("div")
  content.style.cssText = `
    background: white;
    border-radius: 15px;
    padding: 30px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  `

  content.innerHTML = `
    <h2 style="margin: 0 0 20px 0;">QR Codes Found (${results.length})</h2>
    ${results
      .map(
        (result, index) => `
      <div style="margin-bottom: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
        <strong>QR Code ${index + 1}:</strong><br>
        <span style="word-break: break-all; font-family: monospace;">${result.data}</span><br>
        <button onclick="navigator.clipboard.writeText('${result.data}')" 
                style="margin-top: 10px; background: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
          Copy
        </button>
      </div>
    `,
      )
      .join("")}
    <button onclick="this.parentElement.parentElement.remove()" 
            style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; width: 100%; margin-top: 15px;">
      Close
    </button>
  `

  overlay.appendChild(content)
  document.body.appendChild(overlay)
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openFullscreenScanner") {
    const scanner = new FullscreenQRScanner()
    scanner.activate()
  } else if (request.action === "scanPageQR") {
    scanPageQRCodes()
  }
})
