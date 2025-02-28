async function loadPdfLibrary() {
    // Check if already loaded
    if (window.pdfLib && window.pdfLib.PDFDocument) {
        console.log("✅ pdf-lib already loaded.");
        return;
    }

    return new Promise((resolve, reject) => {
        let script = document.createElement("script");
        script.src = chrome.runtime.getURL("assets/pdf-lib.min.js");

        script.onload = () => {
            console.log("✅ pdf-lib script loaded.");
            
            // Add a small delay to ensure the global variable is set
            setTimeout(() => {
                if (window.pdfLib && window.pdfLib.PDFDocument) {
                    console.log("✅ pdf-lib successfully initialized.");
                    resolve();
                } else {
                    console.error("❌ pdf-lib failed to initialize after script load.");
                    console.log("Window pdfLib:", window.pdfLib);
                    reject(new Error("pdf-lib did not initialize"));
                }
            }, 100);
        };

        script.onerror = (e) => {
            console.error("❌ Failed to load pdf-lib script:", e);
            reject(new Error("Script loading failed"));
        };

        document.head.appendChild(script);
    });
}

async function exportToPDF(messages) {
    await loadPdfLibrary();

    if (!window.pdfLib) {
        console.error("❌ pdf-lib is still not available.");
        return;
    }

    const { PDFDocument, rgb } = window.pdfLib;
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(PDFDocument.Font.Helvetica);
    let y = height - 40; // Start position

    messages.forEach(({ Author, Message }) => {
        page.drawText(Author, {
            x: 50,
            y,
            size: 14,
            font,
            color: rgb(0, 0, 0),
        });

        y -= 20;

        Message.split("\n").forEach((line) => {
            page.drawText(line, {
                x: 70,
                y,
                size: 12,
                font,
                color: rgb(0, 0, 0),
            });
            y -= 16;
        });

        y -= 20; // Space between messages
        if (y < 50) {
            pdfDoc.addPage();
            y = height - 40;
        }
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "chat_export.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export { exportToPDF };