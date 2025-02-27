// Track the running export process
let exportRunning = false;

function resetExportState() {
    console.log("Resetting export state...");
    exportRunning = false;
    if (typeof messageHandler !== "undefined") {
        window.removeEventListener("message", messageHandler);
    }
    messages = new Map();
    const cancelButton = document.getElementById("cancelExport");
    if (cancelButton) {
        cancelButton.style.display = "none";
    }
    console.log("Export state fully reset.");
}

async function scrollAndExportChat(limit = null, includeIcons = false, format = "csv", markdown = false) {
    console.log('Starting scrollAndExportChat');
    if (exportRunning) {
        console.warn("Export is already running. Please wait or cancel before starting a new one.");
        return;
    }
    exportRunning = true;

    try{
        let messages = new Map();
        let chatContainer = document.querySelector("[data-testid='virtuoso-scroller']");
        let messagesContainer = document.querySelector("[data-testid='virtuoso-item-list']");
        const { extractFormattedText } = await import(chrome.runtime.getURL("scripts/utils.js"));

        if (!chatContainer || !messagesContainer) {
            console.error("No chat container found.");
            resetExportState();
            return;
        }

        function getMessages() {
            document.querySelectorAll("[data-testid='virtuoso-item-list'] > div[data-index]").forEach(msg => {
                let index = msg.getAttribute("data-index");
                let authorElem = msg.querySelector(".css-16u3s6f");
                let contentElems = msg.querySelectorAll(".css-0 p");
                let iconElem = msg.querySelector(".css-uul55m img");

                let author = authorElem ? authorElem.innerText.trim() : "Unknown";
                
                var content = Array.from(contentElems)
                content = content.map(p =>
                    (format === "word" && markdown)? extractFormattedText(p) : p.innerText.trim()
                )
                content = content.filter(text => text.length > 0).join("\n\n");

                let iconUrl = iconElem ? iconElem.src : "";
                if (format === "word") {
                    iconUrl = null;
                }

                if (content && !messages.has(index)) {
                    messages.set(index, { "Author": author, "Message": content, "Icon": iconUrl });
                }
            });
        }

        chatContainer.scrollTop = chatContainer.scrollHeight;
        await new Promise(r => setTimeout(r, 1000));

        let prevHeight = -1;
        while ((limit === null || messages.size < limit) && !window.stopExport) {
            getMessages();

            if (window.stopExport) { 
                console.log("Export stopped by user.");
                resetExportState();
                return;
            }

            if (limit !== null && messages.size >= limit) break;

            prevHeight = chatContainer.scrollTop;
            chatContainer.scrollTop -= 500;
            await new Promise(r => setTimeout(r, 500));

            if (chatContainer.scrollTop === prevHeight) break;
        }

        if (!window.stopExport) {
            let sortedMessages = Array.from(messages.entries())
                .sort((a, b) => a[0] - b[0])
                .map(entry => entry[1]);
            console.table(sortedMessages);

            if (format === "csv") {
                const { exportToCSV } = await import(chrome.runtime.getURL("scripts/export_csv.js"));
                exportToCSV(sortedMessages, includeIcons);
            } else if (format === "word") {
                const { exportToWord } = await import(chrome.runtime.getURL("scripts/export_word.js"));
                exportToWord(sortedMessages, markdown);  // Cannot export images due to CORS
            } else {
                console.error("Invalid format. Use 'csv' or 'word'.");
            }
        }
    } catch (error) {
        console.error("Export failed:", error);
    } finally {
        resetExportState();
    }
}

function runExportScript(limit, format, includeIcons, markdown) {
    window.scrollAndExportChat(limit, includeIcons, format, markdown).then(() => {
        chrome.runtime.sendMessage({ action: "exportComplete" });
    });
}