function loadDocxLibrary() {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (window.docx && window.docx.Document) {
            console.log("✅ docx already loaded and available.");
            resolve();
            return;
        }

        // Create a script element to load the docx library
        let script = document.createElement("script");
        script.src = chrome.runtime.getURL("docx.min.js");
        
        script.onload = () => {
            console.log("docx.min.js loaded, checking availability...");
            
            // In Chrome extensions, we need to check for the library in the window object
            // after the script has loaded, and we can't use inline scripts due to CSP
            let attempts = 0;
            let maxAttempts = 50; // 5 seconds
            
            let checkDocx = setInterval(() => {
                // Try different ways the library might expose itself
                if (window.docx && window.docx.Document) {
                    console.log("✅ docx found directly on window object");
                    clearInterval(checkDocx);
                    resolve();
                } 
                else if (attempts > maxAttempts) {
                    clearInterval(checkDocx);
                    console.error("❌ docx not available after 5 seconds");
                    
                    // As a last resort, try to load it via fetch and eval
                    // This is only executed if the normal loading fails
                    loadDocxViaFetch().then(resolve).catch(reject);
                }
                attempts++;
            }, 100);
        };

        script.onerror = () => {
            console.error("❌ Failed to load docx.min.js");
            reject(new Error("Failed to load docx.min.js"));
        };

        document.head.appendChild(script);
    });
}

// Alternative method to load the docx library if the script tag method fails
function loadDocxViaFetch() {
    return new Promise((resolve, reject) => {
        console.log("Attempting to load docx via fetch as a fallback...");
        
        fetch(chrome.runtime.getURL("docx.min.js"))
            .then(response => response.text())
            .then(code => {
                // Create a blob URL from the library code
                const blob = new Blob([code], { type: 'application/javascript' });
                const scriptURL = URL.createObjectURL(blob);
                
                // Load the script via the blob URL (which is allowed by CSP)
                const script = document.createElement('script');
                script.src = scriptURL;
                script.onload = () => {
                    console.log("✅ docx loaded via fetch/blob method");
                    
                    // Check if docx is now available
                    if (window.docx && window.docx.Document) {
                        console.log("✅ docx confirmed available after blob loading");
                        resolve();
                    } else {
                        console.error("❌ docx still not available after blob loading");
                        reject(new Error("Failed to load docx via blob method"));
                    }
                };
                script.onerror = (e) => {
                    console.error("❌ Error loading docx via blob URL:", e);
                    reject(new Error("Error loading docx via blob URL"));
                };
                
                document.head.appendChild(script);
            })
            .catch(error => {
                console.error("❌ Failed to fetch docx library:", error);
                reject(error);
            });
    });
}

async function scrollAndExportChat(limit = null, includeIcons = false, format = "csv") {
    let messages = new Map();
    let chatContainer = document.querySelector("[data-testid='virtuoso-scroller']");
    let messagesContainer = document.querySelector("[data-testid='virtuoso-item-list']");

    if (!chatContainer || !messagesContainer) {
        console.error("No chat container found.");
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
                messages.set(index, { "Author": author, "Message": content, "Icon": iconUrl });
            }
        });
    }

    chatContainer.scrollTop = chatContainer.scrollHeight;
    await new Promise(r => setTimeout(r, 1000));

    let prevHeight = -1;
    while (limit === null || messages.size < limit) {
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
        const { exportToCSV } = await import(chrome.runtime.getURL("export_csv.js"));
        exportToCSV(sortedMessages, includeIcons);
    } else if (format === "word") {
        // Create a separate HTML file with the docx library included
        // and execute it in the context of the extension
        executeWordExport(sortedMessages, includeIcons);
    } else {
        console.error("Invalid format. Use 'csv' or 'word'.");
    }
}

// Function to execute the Word export in a separate context
function executeWordExport(messages, includeIcons) {
    console.log("Preparing to export to Word via executeScript...");
    
    // Create a clean copy of messages for transfer
    const cleanMessages = messages.map(m => ({
        Author: m.Author || 'Unknown',
        Message: m.Message || '',
        ...(includeIcons && m.Icon ? { Icon: m.Icon } : {})
    }));
    
    // Create a temporary HTML file that includes the docx library
    const exportHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Word Export</title>
            <script src="${chrome.runtime.getURL('docx.min.js')}"></script>
        </head>
        <body>
            <script>
                // Receive the messages from the parent window
                window.addEventListener('message', async function(event) {
                    if (event.data.type === 'EXPORT_WORD') {
                        const messages = event.data.messages;
                        
                        try {
                            console.log("Creating Word document...");
                            
                            // Create document
                            const doc = new docx.Document({
                                sections: [{
                                    properties: {},
                                    children: messages.map(m => [
                                        new docx.Paragraph({ children: [new docx.TextRun({ text: m.Author, bold: true })] }),
                                        new docx.Paragraph({ children: [new docx.TextRun({ text: m.Message })] })
                                    ]).flat()
                                }]
                            });
                            
                            // Generate blob
                            const blob = await docx.Packer.toBlob(doc);
                            
                            // Download the file
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(blob);
                            link.download = "chat_export.docx";
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            
                            // Notify parent that we're done
                            window.parent.postMessage({ type: 'EXPORT_COMPLETE', success: true }, '*');
                        } catch (error) {
                            console.error("Error creating document:", error);
                            window.parent.postMessage({ type: 'EXPORT_COMPLETE', success: false, error: error.toString() }, '*');
                        }
                    }
                });
                
                // Let parent know we're ready
                window.parent.postMessage({ type: 'EXPORT_READY' }, '*');
            </script>
        </body>
        </html>
    `;
    
    // Create a blob URL for the HTML
    const blob = new Blob([exportHTML], { type: 'text/html' });
    const exportUrl = URL.createObjectURL(blob);
    
    // Create an iframe to load our export page
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    // Set up message listener
    window.addEventListener('message', function messageHandler(event) {
        if (event.data.type === 'EXPORT_READY') {
            // Send the messages to the iframe
            iframe.contentWindow.postMessage({ type: 'EXPORT_WORD', messages: cleanMessages }, '*');
        }
        else if (event.data.type === 'EXPORT_COMPLETE') {
            // Clean up
            window.removeEventListener('message', messageHandler);
            setTimeout(() => {
                document.body.removeChild(iframe);
                URL.revokeObjectURL(exportUrl);
            }, 1000);
            
            if (!event.data.success) {
                console.error("Error in export:", event.data.error);
                alert("Failed to generate Word document: " + event.data.error);
            }
        }
    });
    
    // Load the export page
    iframe.src = exportUrl;
}