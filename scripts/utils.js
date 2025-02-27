function extractFormattedText(element, isBold = false, isItalic = false) {
    // Extract <strong> and <em> tags into markdown format (** and *)
    let result = "";

    element.childNodes.forEach((node, index, nodes) => {
        let text = "";

        if (node.nodeType === Node.TEXT_NODE) {
            text = node.textContent;

            // Preserve leading and trailing spaces for better formatting
            let leadingSpace = text.match(/^\s+/) ? " " : "";
            let trailingSpace = text.match(/\s+$/) ? " " : "";
            text = text.trim();

            // Apply formatting
            if (isBold && isItalic) {
                text = `***${text}***`;
            } else if (isBold) {
                text = `**${text}**`;
            } else if (isItalic) {
                text = `*${text}*`;
            }

            text = leadingSpace + text + trailingSpace;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            let newBold = isBold || node.tagName === "B" || node.tagName === "STRONG";
            let newItalic = isItalic || node.tagName === "I" || node.tagName === "EM";

            text = extractFormattedText(node, newBold, newItalic);
        }

        // Ensure spaces are preserved between elements
        let prevChar = result.slice(-1);
        let nextChar = nodes[index + 1]?.textContent?.trim().charAt(0) || "";

        let needsLeadingSpace = prevChar && /\w/.test(prevChar) && text && /^\w/.test(text);
        let needsTrailingSpace = text && /\w/.test(text.slice(-1)) && nextChar && /^\w/.test(nextChar);

        if (needsLeadingSpace) result += " ";
        result += text;
        if (needsTrailingSpace) result += " ";
    });

    return result.replace(/\s+/g, " ").trim();
}

export { extractFormattedText };


// UNUSED DOCX LIBRARY LOAD ATTEMPTS
// async function loadDocxLibrary() {
//     if (docxLib) {
//         return docxLib;
//     }

//     try {
//         // Fetch the docx library file
//         const response = await fetch(chrome.runtime.getURL('docx.min.js'));
//         const libText = await response.text();
        
//         // Create a module URL
//         const blob = new Blob([libText], { type: 'application/javascript' });
//         const moduleURL = URL.createObjectURL(blob);
        
//         // Import the module
//         docxLib = await import(moduleURL);
//         console.log('Docx library loaded in background:', docxLib);
//         return docxLib;
//     } catch (error) {
//         console.error('Failed to load docx library in background:', error);
//         throw error;
//     }
// }

// function loadDocxLibrary() {
//     return new Promise((resolve, reject) => {
//         // Check if already loaded
//         if (window.docx && window.docx.Document) {
//             console.log("✅ docx already loaded and available.");
//             resolve();
//             return;
//         }
//         // Create a script element to load the docx library
//         let script = document.createElement("script");
//         script.src = chrome.runtime.getURL("docx.min.js");
//         script.onload = () => {
//             console.log("docx.min.js loaded, checking availability...");         
//             // In Chrome extensions, we need to check for the library in the window object
//             // after the script has loaded, and we can't use inline scripts due to CSP
//             let attempts = 0;
//             let maxAttempts = 50; // 5 seconds          
//             let checkDocx = setInterval(() => {
//                 // Try different ways the library might expose itself
//                 if (window.docx && window.docx.Document) {
//                     console.log("✅ docx found directly on window object");
//                     clearInterval(checkDocx);
//                     resolve();
//                 } 
//                 else if (attempts > maxAttempts) {
//                     clearInterval(checkDocx);
//                     console.error("docx not available after 5 seconds");                   
//                     // As a last resort, try to load it via fetch and eval
//                     // This is only executed if the normal loading fails
//                     loadDocxViaFetch().then(resolve).catch(reject);
//                 }
//                 attempts++;
//             }, 100);
//         };
//         script.onerror = () => {
//             console.error("Failed to load docx.min.js");
//             reject(new Error("Failed to load docx.min.js"));
//         };
//         document.head.appendChild(script);
//     });
// }

// // Alternative method to load the docx library if the script tag method fails
// function loadDocxViaFetch() {
//     return new Promise((resolve, reject) => {
//         console.log("Attempting to load docx via fetch as a fallback...");        
//         fetch(chrome.runtime.getURL("docx.min.js"))
//             .then(response => response.text())
//             .then(code => {
//                 // Create a blob URL from the library code
//                 const blob = new Blob([code], { type: 'application/javascript' });
//                 const scriptURL = URL.createObjectURL(blob);              
//                 // Load the script via the blob URL (which is allowed by CSP)
//                 const script = document.createElement('script');
//                 script.src = scriptURL;
//                 script.onload = () => {
//                     console.log("docx loaded via fetch/blob method");                   
//                     // Check if docx is now available
//                     if (window.docx && window.docx.Document) {
//                         console.log("docx confirmed available after blob loading");
//                         resolve();
//                     } else {
//                         console.error("docx still not available after blob loading");
//                         reject(new Error("Failed to load docx via blob method"));
//                     }
//                 };
//                 script.onerror = (e) => {
//                     console.error("Error loading docx via blob URL:", e);
//                     reject(new Error("Error loading docx via blob URL"));
//                 };       
//                 document.head.appendChild(script);
//             })
//             .catch(error => {
//                 console.error("Failed to fetch docx library:", error);
//                 reject(error);
//             });
//     });
// }