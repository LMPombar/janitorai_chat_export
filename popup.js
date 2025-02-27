document.getElementById("exportCSV").addEventListener("click", () => exportChat("csv"));
document.getElementById("exportWord").addEventListener("click", () => exportChat("word"));

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
