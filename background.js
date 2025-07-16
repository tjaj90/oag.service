// Service Worker for Chrome Extension
const chrome = window.chrome // Declare the chrome variable

chrome.runtime.onInstalled.addListener(() => {
  console.log("AI QR Scanner Pro installed")
})

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scanComplete") {
    // Handle scan completion
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "QR Code Scanned",
      message: `Found: ${request.data.substring(0, 50)}...`,
    })
  }
})

// Context menu for scanning QR codes on pages
chrome.contextMenus.create({
  id: "scanPageQR",
  title: "Scan QR codes on this page",
  contexts: ["page"],
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "scanPageQR") {
    chrome.tabs.sendMessage(tab.id, { action: "scanPageQR" })
  }
})
