// Background script for Manifest V3
// First, load the docx library dynamically

// Store the docx library when loaded
let docxLib = null;
let exportRunning = false;
let isExporting = false; // Track if export is running
let currentTabId = null; // Store the tab ID of the running export

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "startExport") {
        if (exportRunning) {
            console.warn("⚠️ Export is already running. Ignoring duplicate request.");
            return;
        }
        console.log('startExport message arrived')

        isExporting = true;
        currentTabId = message.tabId; // Store the current tab ID

        chrome.scripting.executeScript({
            target: { tabId: message.tabId },
            func: (limit, format, includeIcons, applyMarkdown) => {
                window.stopExport = false; // Ensure it's false at start
                window.scrollAndExportChat(limit, includeIcons, format, applyMarkdown)
                    .then(() => {
                        if (!window.stopExport) {
                            chrome.runtime.sendMessage({ action: "exportComplete" });
                        }
                    });
            },
            args: [message.limit, message.format, message.includeIcons, message.applyMarkdown]
        });
    } 
    else if (message.action === "stopExport") {
        console.log("🛑 Export canceled.");
        if (!currentTabId) return; // No active tab to stop
        
        isExporting = false;
        exportRunning = false;
        chrome.runtime.sendMessage({ action: "exportStopped" });

        // Explicitly stop the process in the webpage for the active tab
        chrome.scripting.executeScript({
            target: { tabId: currentTabId },
            func: () => {
                window.stopExport = true;
            }
        });

        currentTabId = null; // Reset the tab ID after stopping
    } else if (message.action === "exportComplete") {
        console.log("✅ Export completed.");
        exportRunning = false;
        chrome.runtime.sendMessage({ action: "exportComplete" });
    }
});

// Load the docx library
async function loadDocxLibrary() {
    if (docxLib) {
      return docxLib;
    }
  
    try {
      // Fetch the docx library file
      const response = await fetch(chrome.runtime.getURL('docx.min.js'));
      const libText = await response.text();
      
      // Create a module URL
      const blob = new Blob([libText], { type: 'application/javascript' });
      const moduleURL = URL.createObjectURL(blob);
      
      // Import the module
      docxLib = await import(moduleURL);
      console.log('Docx library loaded in background:', docxLib);
      return docxLib;
    } catch (error) {
      console.error('Failed to load docx library in background:', error);
      throw error;
    }
  }
  
  chrome.runtime.onInstalled.addListener(() => {
      console.log("Extension Installed");
  });