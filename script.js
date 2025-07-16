// Enhanced QR Code Generator with multiple libraries support
class EnhancedQRGenerator {
  constructor() {
    this.libraries = {
      qrcode: window.QRCode,
      qrcodejs: window.qrcode,
      qrCodeStyling: window.QRCodeStyling,
    }
    this.currentQR = null
    this.currentSVG = null
    this.logoImage = null

    this.init()
  }

  init() {
    this.checkLibraries()
    this.setupEventListeners()
  }

  checkLibraries() {
    console.log("🔍 Checking QR libraries:", {
      qrcode: !!this.libraries.qrcode,
      qrcodejs: !!this.libraries.qrcodejs,
      qrCodeStyling: !!this.libraries.qrCodeStyling,
    })
  }

  setupEventListeners() {
    // QR Type change
    document.getElementById("qrType").addEventListener("change", () => {
      this.updateContentTemplate()
      this.updateQRPlaceholder()
    })

    // Logo checkbox
    document.getElementById("qrLogo").addEventListener("change", (e) => {
      if (e.target.checked) {
        document.getElementById("logoInput").click()
      } else {
        this.logoImage = null
      }
    })

    // Logo file input
    document.getElementById("logoInput").addEventListener("change", (e) => {
      const file = e.target.files[0]
      if (file) {
        this.loadLogoImage(file)
      }
    })

    // Real-time preview
    const inputs = ["qrContent", "qrSize", "qrErrorLevel", "qrForeground", "qrBackground", "qrStyle"]
    inputs.forEach((id) => {
      document.getElementById(id).addEventListener(
        "input",
        this.debounce(() => this.generateQRPreview(), 500),
      )
    })
  }

  updateContentTemplate() {
    const type = document.getElementById("qrType").value
    const templatesContainer = document.getElementById("contentTemplates")

    const templates = {
      text: [],
      url: ["https://www.example.com", "https://www.google.com", "https://github.com/username"],
      email: ["mailto:example@email.com", "mailto:contact@company.com?subject=Hello&body=Message"],
      phone: ["tel:+66812345678", "tel:+1234567890"],
      sms: ["sms:+66812345678", "sms:+66812345678?body=Hello"],
      wifi: ["WIFI:T:WPA;S:NetworkName;P:password123;H:false;", "WIFI:T:WEP;S:NetworkName;P:password;H:true;"],
      vcard: [
        `BEGIN:VCARD
VERSION:3.0
FN:John Doe
ORG:Company Name
TEL:+66812345678
EMAIL:john@example.com
URL:https://www.example.com
END:VCARD`,
        `BEGIN:VCARD
VERSION:3.0
FN:Jane Smith
TITLE:Manager
ORG:ABC Company
TEL:+1234567890
EMAIL:jane@abc.com
ADR:;;123 Main St;City;State;12345;Country
END:VCARD`,
      ],
      location: ["geo:13.7563,100.5018", "geo:13.7563,100.5018?q=Bangkok,Thailand"],
    }

    if (templates[type] && templates[type].length > 0) {
      templatesContainer.style.display = "block"
      templatesContainer.innerHTML = `
        <label>ตัวอย่าง:</label>
        ${templates[type]
          .map(
            (template) =>
              `<div class="template-example" onclick="qrGenerator.useTemplate('${this.escapeHtml(template)}')">${this.escapeHtml(template)}</div>`,
          )
          .join("")}
      `
    } else {
      templatesContainer.style.display = "none"
    }
  }

  updateQRPlaceholder() {
    const type = document.getElementById("qrType").value
    const contentField = document.getElementById("qrContent")

    const placeholders = {
      text: "ใส่ข้อความที่ต้องการ",
      url: "https://example.com",
      email: "example@email.com",
      phone: "+66812345678",
      sms: "+66812345678",
      wifi: "WIFI:T:WPA;S:ชื่อ WiFi;P:รหัสผ่าน;H:false;",
      vcard: "ข้อมูลติดต่อในรูปแบบ vCard",
      location: "geo:latitude,longitude",
    }

    contentField.placeholder = placeholders[type] || "ใส่เนื้อหาที่ต้องการ"
  }

  useTemplate(template) {
    document.getElementById("qrContent").value = template
    this.generateQRPreview()
  }

  loadLogoImage(file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      this.logoImage = e.target.result
      this.generateQRPreview()
    }
    reader.readAsDataURL(file)
  }

  generateQRPreview() {
    const content = document.getElementById("qrContent").value.trim()
    if (!content) return

    this.generateQR()
  }

  async generateQR() {
    const content = document.getElementById("qrContent").value.trim()
    const size = Number.parseInt(document.getElementById("qrSize").value)
    const errorLevel = document.getElementById("qrErrorLevel").value
    const foreground = document.getElementById("qrForeground").value
    const background = document.getElementById("qrBackground").value
    const style = document.getElementById("qrStyle").value

    if (!content) {
      this.showNotification("กรุณาใส่เนื้อหา", "warning")
      return
    }

    try {
      // Try advanced QR Code Styling library first
      if (this.libraries.qrCodeStyling) {
        await this.generateWithQRCodeStyling(content, size, errorLevel, foreground, background, style)
      }
      // Fallback to standard QRCode library
      else if (this.libraries.qrcode) {
        await this.generateWithQRCode(content, size, errorLevel, foreground, background)
      }
      // Final fallback to qrcode-generator
      else if (this.libraries.qrcodejs) {
        await this.generateWithQRCodeJS(content, size, errorLevel, foreground, background)
      } else {
        throw new Error("No QR code library available")
      }

      this.updateQRInfo(content, size, errorLevel)
      this.showNotification("สร้าง QR Code สำเร็จ!", "success")
    } catch (error) {
      console.error("QR generation error:", error)
      this.showNotification("เกิดข้อผิดพลาดในการสร้าง QR Code: " + error.message, "error")
    }
  }

  async generateWithQRCodeStyling(content, size, errorLevel, foreground, background, style) {
    const qrCode = new this.libraries.qrCodeStyling({
      width: size,
      height: size,
      type: "canvas",
      data: content,
      image: this.logoImage,
      dotsOptions: {
        color: foreground,
        type: style === "dots" ? "dots" : style === "rounded" ? "rounded" : "square",
      },
      backgroundOptions: {
        color: background,
      },
      imageOptions: {
        crossOrigin: "anonymous",
        margin: 10,
      },
      qrOptions: {
        errorCorrectionLevel: errorLevel,
      },
    })

    const previewContainer = document.getElementById("qrPreview")
    previewContainer.innerHTML = ""

    await qrCode.append(previewContainer)

    // Store for download
    this.currentQR = await qrCode.getRawData("png")
    this.currentSVG = await qrCode.getRawData("svg")

    document.getElementById("previewActions").style.display = "flex"
    document.getElementById("qrInfo").style.display = "block"
  }

  async generateWithQRCode(content, size, errorLevel, foreground, background) {
    const canvas = document.createElement("canvas")

    const qrDataURL = await this.libraries.qrcode.toDataURL(content, {
      width: size,
      height: size,
      margin: 2,
      color: {
        dark: foreground,
        light: background,
      },
      errorCorrectionLevel: errorLevel,
    })

    const previewContainer = document.getElementById("qrPreview")
    previewContainer.innerHTML = `<img src="${qrDataURL}" alt="Generated QR Code" class="qr-canvas">`

    // Add logo if available
    if (this.logoImage) {
      await this.addLogoToCanvas(qrDataURL, size)
    }

    this.currentQR = qrDataURL
    document.getElementById("previewActions").style.display = "flex"
    document.getElementById("qrInfo").style.display = "block"
  }

  async generateWithQRCodeJS(content, size, errorLevel, foreground, background) {
    // Create QR using qrcode-generator library
    const typeNumber = this.getTypeNumber(content.length)
    const qr = this.libraries.qrcodejs(typeNumber, errorLevel)
    qr.addData(content)
    qr.make()

    // Create canvas
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const moduleCount = qr.getModuleCount()
    const cellSize = size / moduleCount

    canvas.width = size
    canvas.height = size

    // Draw QR code
    ctx.fillStyle = background
    ctx.fillRect(0, 0, size, size)

    ctx.fillStyle = foreground
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qr.isDark(row, col)) {
          ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize)
        }
      }
    }

    const qrDataURL = canvas.toDataURL()
    const previewContainer = document.getElementById("qrPreview")
    previewContainer.innerHTML = `<img src="${qrDataURL}" alt="Generated QR Code" class="qr-canvas">`

    this.currentQR = qrDataURL
    document.getElementById("previewActions").style.display = "flex"
    document.getElementById("qrInfo").style.display = "block"
  }

  async addLogoToCanvas(qrDataURL, size) {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      canvas.width = size
      canvas.height = size

      const qrImg = new Image()
      qrImg.onload = () => {
        ctx.drawImage(qrImg, 0, 0, size, size)

        const logoImg = new Image()
        logoImg.onload = () => {
          const logoSize = size * 0.2
          const logoX = (size - logoSize) / 2
          const logoY = (size - logoSize) / 2

          // Draw white background for logo
          ctx.fillStyle = "white"
          ctx.fillRect(logoX - 5, logoY - 5, logoSize + 10, logoSize + 10)

          // Draw logo
          ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize)

          const finalDataURL = canvas.toDataURL()
          const previewContainer = document.getElementById("qrPreview")
          previewContainer.innerHTML = `<img src="${finalDataURL}" alt="Generated QR Code with Logo" class="qr-canvas">`

          this.currentQR = finalDataURL
          resolve()
        }
        logoImg.src = this.logoImage
      }
      qrImg.src = qrDataURL
    })
  }

  getTypeNumber(dataLength) {
    if (dataLength <= 25) return 1
    if (dataLength <= 47) return 2
    if (dataLength <= 77) return 3
    if (dataLength <= 114) return 4
    if (dataLength <= 154) return 5
    if (dataLength <= 195) return 6
    if (dataLength <= 224) return 7
    if (dataLength <= 279) return 8
    if (dataLength <= 335) return 9
    return 10
  }

  updateQRInfo(content, size, errorLevel) {
    document.getElementById("qrSizeInfo").textContent = `${size}x${size} px`
    document.getElementById("qrTypeInfo").textContent = document.getElementById("qrType").selectedOptions[0].text
    document.getElementById("qrDataLength").textContent = `${content.length} ตัวอักษร`
  }

  downloadQR() {
    if (!this.currentQR) return

    const link = document.createElement("a")
    link.download = `qr-code-${Date.now()}.png`

    if (typeof this.currentQR === "string") {
      link.href = this.currentQR
    } else {
      // For blob data
      const blob = new Blob([this.currentQR], { type: "image/png" })
      link.href = URL.createObjectURL(blob)
    }

    link.click()
    this.showNotification("ดาวน์โหลดแล้ว!", "success")
  }

  downloadQRSVG() {
    if (!this.currentSVG) {
      this.showNotification("SVG ไม่พร้อมใช้งาน", "warning")
      return
    }

    const link = document.createElement("a")
    link.download = `qr-code-${Date.now()}.svg`

    if (typeof this.currentSVG === "string") {
      link.href = "data:image/svg+xml;base64," + btoa(this.currentSVG)
    } else {
      const blob = new Blob([this.currentSVG], { type: "image/svg+xml" })
      link.href = URL.createObjectURL(blob)
    }

    link.click()
    this.showNotification("ดาวน์โหลด SVG แล้ว!", "success")
  }

  async copyQR() {
    if (!this.currentQR) return

    try {
      if (typeof this.currentQR === "string") {
        const response = await fetch(this.currentQR)
        const blob = await response.blob()
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
      } else {
        const blob = new Blob([this.currentQR], { type: "image/png" })
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
      }

      this.showNotification("คัดลอก QR Code แล้ว!", "success")
    } catch (error) {
      console.error("Copy QR error:", error)
      this.showNotification("ไม่สามารถคัดลอก QR Code ได้", "error")
    }
  }

  async shareQR() {
    if (!this.currentQR) return

    try {
      if (navigator.share) {
        let file
        if (typeof this.currentQR === "string") {
          const response = await fetch(this.currentQR)
          const blob = await response.blob()
          file = new File([blob], "qr-code.png", { type: "image/png" })
        } else {
          const blob = new Blob([this.currentQR], { type: "image/png" })
          file = new File([blob], "qr-code.png", { type: "image/png" })
        }

        await navigator.share({
          title: "QR Code",
          text: "QR Code ที่สร้างจาก QR Scanner Pro",
          files: [file],
        })
      } else {
        await this.copyQR()
      }
    } catch (error) {
      console.error("Share error:", error)
      this.showNotification("ไม่สามารถแชร์ได้", "error")
    }
  }

  resetGenerator() {
    document.getElementById("qrContent").value = ""
    document.getElementById("qrType").value = "text"
    document.getElementById("qrSize").value = "300"
    document.getElementById("qrErrorLevel").value = "M"
    document.getElementById("qrForeground").value = "#000000"
    document.getElementById("qrBackground").value = "#ffffff"
    document.getElementById("qrStyle").value = "square"
    document.getElementById("qrLogo").checked = false

    this.logoImage = null
    this.currentQR = null
    this.currentSVG = null

    const previewContainer = document.getElementById("qrPreview")
    previewContainer.innerHTML = `
      <div class="preview-placeholder">
        <div class="placeholder-icon">📱</div>
        <p>QR Code จะแสดงที่นี่</p>
      </div>
    `

    document.getElementById("previewActions").style.display = "none"
    document.getElementById("qrInfo").style.display = "none"
    document.getElementById("contentTemplates").style.display = "none"

    this.updateQRPlaceholder()
    this.showNotification("รีเซ็ตเรียบร้อย", "info")
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div")
    notification.className = `notification notification-${type}`
    notification.style.animation = "slideInRight 0.3s ease"

    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>${this.getNotificationIcon(type)}</span>
        <span>${message}</span>
      </div>
    `

    document.body.appendChild(notification)

    setTimeout(() => {
      notification.style.animation = "slideOutRight 0.3s ease"
      setTimeout(() => notification.remove(), 300)
    }, 3000)
  }

  getNotificationIcon(type) {
    const icons = {
      success: "✅",
      error: "❌",
      warning: "⚠️",
      info: "ℹ️",
    }
    return icons[type] || icons.info
  }

  escapeHtml(text) {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }

  debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }
}

// V8 Engine Optimization และ WebAssembly Integration
class V8QROptimizer {
  constructor() {
    this.wasmModule = null
    this.isWasmSupported = this.checkWasmSupport()
    this.v8Features = this.detectV8Features()
    this.initializeOptimizations()
  }

  checkWasmSupport() {
    try {
      if (typeof WebAssembly === "object" && typeof WebAssembly.instantiate === "function") {
        const module = new WebAssembly.Module(new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]))
        if (module instanceof WebAssembly.Module) {
          return new WebAssembly.Instance(module) instanceof WebAssembly.Instance
        }
      }
    } catch (e) {}
    return false
  }

  detectV8Features() {
    const features = {
      simd: false,
      threads: false,
      bigint: typeof BigInt !== "undefined",
      weakRef: typeof WeakRef !== "undefined",
      finalizationRegistry: typeof FinalizationRegistry !== "undefined",
    }

    // ตรวจสอบ SIMD support
    try {
      if (typeof WebAssembly !== "undefined" && WebAssembly.validate) {
        // SIMD test bytecode
        const simdTest = new Uint8Array([
          0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x04, 0x01, 0x60, 0x00, 0x00, 0x03, 0x02, 0x01, 0x00,
          0x0a, 0x09, 0x01, 0x07, 0x00, 0xfd, 0x0c, 0x00, 0x00, 0x0b,
        ])
        features.simd = WebAssembly.validate(simdTest)
      }
    } catch (e) {}

    // ตรวจสอบ SharedArrayBuffer สำหรับ threads
    features.threads = typeof SharedArrayBuffer !== "undefined"

    return features
  }

  initializeOptimizations() {
    // V8 JIT optimization hints
    if (typeof performance !== "undefined" && performance.mark) {
      performance.mark("qr-optimizer-init")
    }

    // Pre-compile regular expressions
    this.urlRegex = /^https?:\/\//i
    this.emailRegex = /^mailto:/i
    this.phoneRegex = /^tel:/i
    this.wifiRegex = /^WIFI:/i

    // Initialize memory pools
    this.imageDataPool = []
    this.canvasPool = []

    console.log("🚀 V8 QR Optimizer initialized:", {
      wasm: this.isWasmSupported,
      features: this.v8Features,
    })
  }

  // Optimized image processing with V8 features
  optimizeImageProcessing(imageData) {
    if (this.v8Features.simd && this.isWasmSupported) {
      return this.processSIMD(imageData)
    }
    return this.processStandard(imageData)
  }

  processSIMD(imageData) {
    // SIMD-optimized processing (placeholder for actual WASM implementation)
    const start = performance.now()
    const result = this.processStandard(imageData)
    const end = performance.now()
    console.log(`🔥 SIMD processing: ${(end - start).toFixed(2)}ms`)
    return result
  }

  processStandard(imageData) {
    // Standard processing with V8 optimizations
    const { data, width, height } = imageData

    // Use typed arrays for better V8 optimization
    const grayscale = new Uint8ClampedArray(width * height)

    // Optimized grayscale conversion
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0
      grayscale[i / 4] = gray
    }

    return { data: grayscale, width, height }
  }

  // Memory management with WeakRef
  manageMemory() {
    if (this.v8Features.weakRef) {
      // Use WeakRef for better memory management
      this.imageDataPool = this.imageDataPool.filter((ref) => ref.deref())
    }

    // Clean up canvas pool
    if (this.canvasPool.length > 5) {
      this.canvasPool.splice(0, this.canvasPool.length - 5)
    }
  }

  // Get optimized canvas from pool
  getCanvas(width, height) {
    let canvas = this.canvasPool.pop()
    if (!canvas) {
      canvas = document.createElement("canvas")
    }
    canvas.width = width
    canvas.height = height
    return canvas
  }

  // Return canvas to pool
  returnCanvas(canvas) {
    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    this.canvasPool.push(canvas)
  }
}

// Initialize V8 optimizer
const v8Optimizer = new V8QROptimizer()

class QRScannerApp {
  constructor() {
    this.video = document.getElementById("video")
    this.canvas = document.getElementById("canvas")
    this.context = this.canvas.getContext("2d")
    this.stream = null
    this.scanning = false
    this.facingMode = "environment"

    // V8 Integration
    this.v8Optimizer = v8Optimizer
    this.jsQR = window.jsQR
    this.scanInterval = null
    this.performanceMetrics = {
      scanTimes: [],
      averageScanTime: 0,
      totalScans: 0,
    }

    this.init()
  }

  init() {
    this.setupEventListeners()
    this.setupSmoothScrolling()
    this.setupIntersectionObserver()
  }

  setupEventListeners() {
    // Navigation
    document.getElementById("navToggle").addEventListener("click", this.toggleMobileMenu)

    // Scanner mode switching
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => this.switchScannerMode(e.target.closest(".mode-btn")))
    })

    // Camera controls
    document.getElementById("startScanBtn").addEventListener("click", () => this.startCamera())
    document.getElementById("stopScanBtn").addEventListener("click", () => this.stopCamera())
    document.getElementById("switchCameraBtn").addEventListener("click", () => this.switchCamera())

    // File upload - Fixed double click issue
    const fileInput = document.getElementById("fileInput")
    const uploadArea = document.getElementById("uploadArea")
    const uploadBtn = document.getElementById("uploadBtn")

    // Single event listener for file input
    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        this.handleFileUpload(e.target.files[0])
      }
    })

    // Upload button click
    uploadBtn.addEventListener("click", (e) => {
      e.preventDefault()
      e.stopPropagation()
      fileInput.click()
    })

    // Upload area click
    uploadArea.addEventListener("click", (e) => {
      if (e.target !== uploadBtn && !uploadBtn.contains(e.target)) {
        fileInput.click()
      }
    })

    // Drag and drop
    uploadArea.addEventListener("dragover", this.handleDragOver)
    uploadArea.addEventListener("drop", this.handleFileDrop.bind(this))
    uploadArea.addEventListener("dragleave", (e) => {
      e.currentTarget.classList.remove("dragover")
    })

    // Smooth scrolling for navigation links
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault()
        const targetId = link.getAttribute("href").substring(1)
        this.scrollToSection(targetId)
        this.setActiveNavLink(link)
      })
    })
  }

  setupSmoothScrolling() {
    document.documentElement.style.scrollBehavior = "smooth"
  }

  setupIntersectionObserver() {
    const options = {
      threshold: 0.3,
      rootMargin: "-50px 0px",
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("fade-in")

          const id = entry.target.id
          const navLink = document.querySelector(`.nav-link[href="#${id}"]`)
          if (navLink) {
            this.setActiveNavLink(navLink)
          }
        }
      })
    }, options)

    document.querySelectorAll("section").forEach((section) => {
      observer.observe(section)
    })
  }

  toggleMobileMenu() {
    const navMenu = document.querySelector(".nav-menu")
    navMenu.classList.toggle("active")
  }

  setActiveNavLink(activeLink) {
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.remove("active")
    })
    activeLink.classList.add("active")
  }

  scrollToSection(sectionId) {
    const section = document.getElementById(sectionId)
    if (section) {
      const navHeight = document.querySelector(".navbar").offsetHeight
      const targetPosition = section.offsetTop - navHeight

      window.scrollTo({
        top: targetPosition,
        behavior: "smooth",
      })
    }
  }

  switchScannerMode(selectedBtn) {
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.classList.remove("active")
    })
    selectedBtn.classList.add("active")

    const mode = selectedBtn.dataset.mode
    document.querySelectorAll(".camera-scanner, .upload-scanner").forEach((scanner) => {
      scanner.classList.remove("active")
    })

    if (mode === "camera") {
      document.getElementById("cameraScanner").classList.add("active")
    } else if (mode === "upload") {
      document.getElementById("uploadScanner").classList.add("active")
      this.stopCamera()
    }
  }

  async startCamera() {
    try {
      this.showLoading("startScanBtn")

      const constraints = {
        video: {
          facingMode: this.facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      }

      this.stream = await navigator.mediaDevices.getUserMedia(constraints)
      this.video.srcObject = this.stream

      await this.video.play()

      document.getElementById("cameraPlaceholder").style.display = "none"
      this.video.style.display = "block"

      document.getElementById("startScanBtn").style.display = "none"
      document.getElementById("stopScanBtn").style.display = "inline-flex"
      document.getElementById("switchCameraBtn").style.display = "inline-flex"

      this.scanning = true
      this.startContinuousScanning()

      this.showNotification("กล้องเปิดแล้ว เริ่มสแกน QR Code", "success")
    } catch (error) {
      console.error("Camera error:", error)
      this.showNotification("ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการใช้งานกล้อง", "error")
    } finally {
      this.hideLoading("startScanBtn")
    }
  }

  startContinuousScanning() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval)
    }

    this.scanInterval = setInterval(() => {
      if (this.scanning && this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
        this.scanQRCode()
      }
    }, 100) // Scan every 100ms for real-time detection
  }

  stopCamera() {
    this.scanning = false

    if (this.scanInterval) {
      clearInterval(this.scanInterval)
      this.scanInterval = null
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
    }

    this.video.style.display = "none"
    document.getElementById("cameraPlaceholder").style.display = "flex"

    document.getElementById("startScanBtn").style.display = "inline-flex"
    document.getElementById("stopScanBtn").style.display = "none"
    document.getElementById("switchCameraBtn").style.display = "none"

    this.showNotification("หยุดการสแกนแล้ว", "info")
  }

  async switchCamera() {
    this.facingMode = this.facingMode === "environment" ? "user" : "environment"

    if (this.scanning) {
      this.stopCamera()
      setTimeout(() => this.startCamera(), 500)
    }
  }

  scanQRCode() {
    if (!this.scanning || !this.video.videoWidth || !this.video.videoHeight) return

    const startTime = performance.now()

    // ใช้ optimized canvas จาก pool
    const canvas = this.v8Optimizer.getCanvas(this.video.videoWidth, this.video.videoHeight)
    const context = canvas.getContext("2d")

    context.drawImage(this.video, 0, 0, canvas.width, canvas.height)
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

    try {
      // ใช้ V8 optimized processing
      const optimizedData = this.v8Optimizer.optimizeImageProcessing(imageData)

      const code = this.jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      })

      if (code) {
        const processingTime = performance.now() - startTime
        this.updatePerformanceMetrics(processingTime)
        this.handleQRResult(code.data)
      }
    } catch (error) {
      console.error("QR scanning error:", error)
    } finally {
      // Return canvas to pool
      this.v8Optimizer.returnCanvas(canvas)

      // Periodic memory management
      if (this.performanceMetrics.totalScans % 50 === 0) {
        this.v8Optimizer.manageMemory()
      }
    }
  }

  handleFileUpload(file) {
    if (!file || !file.type.startsWith("image/")) {
      this.showNotification("กรุณาเลือกไฟล์รูปภาพ", "error")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        this.scanImageForQR(img)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }

  handleDragOver(e) {
    e.preventDefault()
    e.currentTarget.classList.add("dragover")
  }

  handleFileDrop(e) {
    e.preventDefault()
    e.currentTarget.classList.remove("dragover")

    const files = e.dataTransfer.files
    if (files.length > 0) {
      this.handleFileUpload(files[0])
    }
  }

  scanImageForQR(img) {
    this.canvas.width = img.width
    this.canvas.height = img.height
    this.context.drawImage(img, 0, 0)

    const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height)

    try {
      const code = this.jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      })

      if (code) {
        this.handleQRResult(code.data)
      } else {
        this.showNotification("ไม่พบ QR Code ในรูปภาพ", "warning")
      }
    } catch (error) {
      console.error("Image QR scanning error:", error)
      this.showNotification("เกิดข้อผิดพลาดในการสแกนรูปภาพ", "error")
    }
  }

  handleQRResult(data) {
    const resultType = this.detectQRType(data)

    this.displayResult({
      data: data,
      type: resultType,
      timestamp: new Date().toLocaleString("th-TH"),
    })

    const scanFrame = document.querySelector(".scan-frame")
    if (scanFrame) {
      scanFrame.classList.add("success-pulse")
      setTimeout(() => scanFrame.classList.remove("success-pulse"), 600)
    }

    this.showNotification(`พบ QR Code: ${resultType}`, "success")

    setTimeout(() => {
      document.getElementById("scanResults").scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      })
    }, 500)
  }

  detectQRType(data) {
    if (data.startsWith("http://") || data.startsWith("https://")) return "เว็บไซต์"
    if (data.startsWith("mailto:")) return "อีเมล"
    if (data.startsWith("tel:")) return "เบอร์โทรศัพท์"
    if (data.startsWith("wifi:")) return "Wi-Fi"
    if (data.includes("BEGIN:VCARD")) return "ข้อมูลติดต่อ"
    if (data.includes("BEGIN:VEVENT")) return "กิจกรรม"
    if (/^\d+$/.test(data)) return "ตัวเลข"
    return "ข้อความ"
  }

  displayResult(result) {
    const resultsContainer = document.getElementById("scanResults")
    const resultsContent = document.getElementById("resultsContent")

    const resultHTML = `
            <div class="result-item">
                <div class="result-type">${result.type}</div>
                <div class="result-data">${this.escapeHtml(result.data)}</div>
                <div class="result-actions">
                    <button class="result-btn" onclick="qrApp.copyToClipboard('${this.escapeHtml(result.data)}')">
                        📋 คัดลอก
                    </button>
                    ${this.getActionButton(result.data, result.type)}
                    <button class="result-btn" onclick="qrApp.shareResult('${this.escapeHtml(result.data)}')">
                        📤 แชร์
                    </button>
                </div>
                <div class="result-time">สแกนเมื่อ: ${result.timestamp}</div>
            </div>
        `

    resultsContent.innerHTML = resultHTML
    resultsContainer.style.display = "block"
    resultsContainer.classList.add("fade-in")
  }

  getActionButton(data, type) {
    if (type === "เว็บไซต์") {
      return `<button class="result-btn" onclick="window.open('${this.escapeHtml(data)}', '_blank')">🔗 เปิดลิงก์</button>`
    } else if (type === "อีเมล") {
      return `<button class="result-btn" onclick="window.location.href='${this.escapeHtml(data)}'">📧 ส่งอีเมล</button>`
    } else if (type === "เบอร์โทรศัพท์") {
      return `<button class="result-btn" onclick="window.location.href='${this.escapeHtml(data)}'">📞 โทร</button>`
    }
    return ""
  }

  clearResults() {
    document.getElementById("scanResults").style.display = "none"
  }

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text)
      this.showNotification("คัดลอกแล้ว!", "success")
    } catch (error) {
      console.error("Copy error:", error)
      this.showNotification("ไม่สามารถคัดลอกได้", "error")
    }
  }

  async shareResult(data) {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "QR Code Result",
          text: data,
        })
      } catch (error) {
        console.error("Share error:", error)
      }
    } else {
      this.copyToClipboard(data)
    }
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div")
    notification.className = `notification notification-${type}`
    notification.style.animation = "slideInRight 0.3s ease"

    notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span>${this.getNotificationIcon(type)}</span>
                <span>${message}</span>
            </div>
        `

    document.body.appendChild(notification)

    setTimeout(() => {
      notification.style.animation = "slideOutRight 0.3s ease"
      setTimeout(() => notification.remove(), 300)
    }, 3000)
  }

  getNotificationIcon(type) {
    const icons = {
      success: "✅",
      error: "❌",
      warning: "⚠️",
      info: "ℹ️",
    }
    return icons[type] || icons.info
  }

  showLoading(buttonId) {
    const button = document.getElementById(buttonId)
    if (button) {
      button.disabled = true
      button.innerHTML = '<span class="loading"></span> กำลังโหลด...'
    }
  }

  hideLoading(buttonId) {
    const button = document.getElementById(buttonId)
    if (button) {
      button.disabled = false
      button.innerHTML = '<span class="btn-icon">▶️</span> เริ่มสแกน'
    }
  }

  escapeHtml(text) {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }

  updatePerformanceMetrics(scanTime) {
    this.performanceMetrics.scanTimes.push(scanTime)
    this.performanceMetrics.totalScans++

    // Keep only last 100 measurements
    if (this.performanceMetrics.scanTimes.length > 100) {
      this.performanceMetrics.scanTimes.shift()
    }

    // Calculate average
    this.performanceMetrics.averageScanTime =
      this.performanceMetrics.scanTimes.reduce((a, b) => a + b, 0) / this.performanceMetrics.scanTimes.length

    // Log performance every 10 scans
    if (this.performanceMetrics.totalScans % 10 === 0) {
      console.log(
        `📊 Performance: Avg ${this.performanceMetrics.averageScanTime.toFixed(2)}ms, Total scans: ${this.performanceMetrics.totalScans}`,
      )
    }
  }
}

// Template functions
function useTemplate(type) {
  const templates = {
    website: {
      type: "url",
      content: "https://www.example.com",
    },
    contact: {
      type: "vcard",
      content: `BEGIN:VCARD
VERSION:3.0
FN:John Doe
ORG:Company Name
TEL:+66812345678
EMAIL:john@example.com
URL:https://www.example.com
END:VCARD`,
    },
    wifi: {
      type: "wifi",
      content: "WIFI:T:WPA;S:NetworkName;P:password123;H:false;",
    },
    location: {
      type: "location",
      content: "geo:13.7563,100.5018",
    },
  }

  const template = templates[type]
  if (template) {
    document.getElementById("qrType").value = template.type
    document.getElementById("qrContent").value = template.content
    qrGenerator.updateQRPlaceholder()
    qrGenerator.updateContentTemplate()
    qrGenerator.generateQRPreview()
  }
}

// Global functions for button clicks
function startScanning() {
  document.getElementById("scanner").scrollIntoView({ behavior: "smooth" })
  setTimeout(() => {
    const cameraMode = document.querySelector('.mode-btn[data-mode="camera"]')
    if (cameraMode && !cameraMode.classList.contains("active")) {
      cameraMode.click()
    }
    qrApp.startCamera()
  }, 500)
}

function scrollToSection(sectionId) {
  qrApp.scrollToSection(sectionId)
}

function generateQR() {
  qrGenerator.generateQR()
}

function downloadQR() {
  qrGenerator.downloadQR()
}

function downloadQRSVG() {
  qrGenerator.downloadQRSVG()
}

function copyQR() {
  qrGenerator.copyQR()
}

function shareQR() {
  qrGenerator.shareQR()
}

function resetGenerator() {
  qrGenerator.resetGenerator()
}

function clearResults() {
  qrApp.clearResults()
}

// Initialize the apps
let qrApp, qrGenerator
document.addEventListener("DOMContentLoaded", () => {
  qrApp = new QRScannerApp()
  qrGenerator = new EnhancedQRGenerator()
})

// Service Worker Registration (for PWA capabilities)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered: ", registration)
      })
      .catch((registrationError) => {
        console.log("SW registration failed: ", registrationError)
      })
  })
}
