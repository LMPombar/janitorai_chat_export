async function scrollAndExportChat(limit = null, includeIcons = false, format = "csv") {
    let messages = new Map();
    let chatContainer = document.querySelector("[data-testid='virtuoso-scroller']");
    let messagesContainer = document.querySelector("[data-testid='virtuoso-item-list']");

    if (!chatContainer || !messagesContainer) {
        console.error("Chat container not found.");
        return;
    }

    function getMessages() {
        document.querySelectorAll("[data-testid='virtuoso-item-list'] > div[data-index]").forEach(msg => {
            let index = msg.getAttribute("data-index");
            let authorElem = msg.querySelector(".css-16u3s6f");
            let contentElems = msg.querySelectorAll(".css-0 p");
            let iconElem = msg.querySelector(".css-uul55m img");

            let author = authorElem ? authorElem.innerText.trim() : "Unknown";
            let content = Array.from(contentElems)
                .map(p => p.innerText.trim())
                .filter(text => text.length > 0)
                .join("\n\n");

            let iconUrl = iconElem ? iconElem.src : "";

            if (content && !messages.has(index)) {
                messages.set(index, { "User": author, "Message": content, "Avatar": iconUrl });
            }
        });
    }

    chatContainer.scrollTop = chatContainer.scrollHeight;
    await new Promise(r => setTimeout(r, 1000));

    let prevHeight = -1;
    while (limit === null || messages.size < limit) {  // if limit is null, download all messages
        getMessages();

        if (limit !== null && messages.size >= limit) break;

        prevHeight = chatContainer.scrollTop;
        chatContainer.scrollTop -= 500;
        await new Promise(r => setTimeout(r, 500));

        if (chatContainer.scrollTop === prevHeight) break;
    }

    let sortedMessages = Array.from(messages.entries())
        .sort((a, b) => a[0] - b[0])
        .map(entry => entry[1]);

    console.table(sortedMessages);

    if (format === "csv") {
        exportToCSV(sortedMessages, includeIcons);
    } else if (format === "word") {
        exportToWord(sortedMessages, includeIcons);
    } else {
        console.error("Unknown format. Please select 'csv' or 'word'.");
    }
}
