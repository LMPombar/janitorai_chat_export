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
        loadingIndicator.style.display = isLoading ? "block" : "none";
    }

    async function startExport(format) {
        setLoadingState(true); // Disable buttons and show loading

        console.log('StartingExport Function call')

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

        function messageListener(message) {
            if (message.action === "exportComplete" || message.action === "exportStopped") {
                setLoadingState(false);
                chrome.runtime.onMessage.removeListener(messageListener);
            }
        }
        chrome.runtime.onMessage.addListener(messageListener);
    }

    function cancelExport() {
        chrome.runtime.sendMessage({ action: "stopExport" });
    }

    exportCsvBtn.addEventListener("click", () => startExport("csv"));
    exportWordBtn.addEventListener("click", () => startExport("word"));
    cancelExportBtn.addEventListener("click", cancelExport);
});
