let isListenerActive = false;

document.addEventListener("DOMContentLoaded", () => {
    const exportCsvBtn = document.getElementById("exportCSV");
    const exportWordBtn = document.getElementById("exportWord");
    const messagesCounter = document.getElementById("numMessages");
    const includeIconsCheckbox = document.getElementById("includeIcons");
    const loadingIndicator = document.getElementById("loading");
    const cancelExportBtn = document.getElementById("cancelExport");
    const applyMarkdownCheckbox = document.getElementById("applyMarkdown");

    function setLoadingState(isLoading) {
        exportCsvBtn.disabled = isLoading;
        exportWordBtn.disabled = isLoading;
        cancelExportBtn.style.display = isLoading ? "block" : "none";
        loadingIndicator.style.display = isLoading ? "block" : "none";
    }

    function resetUIState() {
        setLoadingState(false);
        console.log("UI reset: buttons enabled, loading hidden.");
    }

    async function startExport(format) {
        setLoadingState(true); // Disable buttons and show loading

        const includeIcons = includeIconsCheckbox.checked;
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const numMessages = messagesCounter.value ? parseInt(messagesCounter.value, 10) : null;
        const applyMarkdown = applyMarkdownCheckbox.checked;

        chrome.runtime.sendMessage({
            action: "startExport",
            limit: numMessages,
            format: format,
            includeIcons: includeIcons,
            applyMarkdown: applyMarkdown,
            tabId: tab.id
        });

        if (isListenerActive) {
            chrome.runtime.onMessage.removeListener(messageListener);
            isListenerActive = false;
        }

        function messageListener(message) {
            if (message.action === "exportComplete" || message.action === "exportStopped") {
                resetUIState();
                chrome.runtime.onMessage.removeListener(messageListener);
            }
        }

        chrome.runtime.onMessage.addListener(messageListener);
    }

    function cancelExport() {
        chrome.runtime.sendMessage({ action: "stopExport" });
        resetUIState();
        console.log("Export process stopped.");
    }

    exportCsvBtn.addEventListener("click", () => startExport("csv"));
    exportWordBtn.addEventListener("click", () => startExport("word"));
    cancelExportBtn.addEventListener("click", cancelExport);
});