document.getElementById("exportCSV").addEventListener("click", () => exportChat("csv"));
document.getElementById("exportWord").addEventListener("click", () => exportChat("word"));

function exportChat(format) {
    let numMessages = document.getElementById("numMessages").value;
    let includeIcons = document.getElementById("includeIcons").checked;

    numMessages = numMessages ? parseInt(numMessages, 10) : null;

    chrome.scripting.executeScript({
        target: { allFrames: true },
        func: runExportScript,
        args: [format, numMessages, includeIcons]
    });
}

function runExportScript(format, limit, includeIcons) {
    if (typeof scrollAndExportChat === "function") {
        scrollAndExportChat(limit, includeIcons, format);
    } else {
        console.error("The exporting script is not loaded.");
    }
}
