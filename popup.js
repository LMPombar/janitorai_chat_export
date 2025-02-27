function exportChat(format) {
    let numMessages = document.getElementById("numMessages").value;
    let includeIcons = document.getElementById("includeIcons").checked;

    numMessages = numMessages ? parseInt(numMessages, 10) : null; // Si está vacío, será `null`

    // Obtener la pestaña activa antes de ejecutar el script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) {
            console.error("Could not find active tab.");
            return;
        }

        let tabId = tabs[0].id;

        chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: runExportScript,
            args: [format, numMessages, includeIcons]
        });
    });
}

// Función que se ejecutará en la página
function runExportScript(format, limit, includeIcons) {
    if (typeof scrollAndExportChat === "function") {
        scrollAndExportChat(limit, includeIcons, format);
    } else {
        console.error("The exporting script is not loaded.");
    }
}


document.addEventListener("DOMContentLoaded", () => {
    const exportCsvBtn = document.getElementById("exportCSV");
    const exportWordBtn = document.getElementById("exportWord");
    const messagesCounter = document.getElementById("numMessages");
    const includeIconsCheckbox = document.getElementById("includeIcons");
    const loadingIndicator = document.getElementById("loading");

    async function startExport(format) {
        // Disable buttons and show loader
        exportCsvBtn.disabled = true;
        exportWordBtn.disabled = true;
        loadingIndicator.style.display = "block";

        const includeIcons = includeIconsCheckbox.checked;
        const numMessages = messagesCounter.value ? parseInt(messagesCounter.value, 10) : null;

        try {
            // Send message to content script to start export
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: runExportScript,
                args: [numMessages, format, includeIcons]
            });
        } catch (error) {
            console.error("Error executing export:", error);
            alert("Failed to start export.");
        } finally {
            // Re-enable buttons and hide loader after completion
            exportCsvBtn.disabled = false;
            exportWordBtn.disabled = false;
            loadingIndicator.style.display = "none";
        }
    }

    exportCsvBtn.addEventListener("click", () => startExport("csv"));
    exportWordBtn.addEventListener("click", () => startExport("word"));
});

// This function runs in the content script (inside the web page)
function runExportScript(numMessages, format, includeIcons) {
    window.scrollAndExportChat(numMessages, includeIcons, format);
}
