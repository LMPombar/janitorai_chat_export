// Background script for Manifest V3
// First, load the docx library dynamically

// Store the docx library when loaded
let docxLib = null;
let exportRunning = false;
let isExporting = false; // Track if export is running
let currentTabId = null; // Store the tab ID of the running export

chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension Installed");
});

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
    return true;
});

// Disable the extension in tabs that are not janitorAI
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.url && tab.url.includes("janitorai.com")) {
        chrome.action.enable(tabId);
    } else {
        chrome.action.disable(tabId);
    }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    let tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url && tab.url.includes("janitorai.com")) {
        chrome.action.enable(tab.id);
    } else {
        chrome.action.disable(tab.id);
    }
});