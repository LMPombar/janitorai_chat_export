// Background script for Manifest V3
// First, load the docx library dynamically

// Store the docx library when loaded
let docxLib = null;

// Load the docx library
async function loadDocxLibrary() {
  if (docxLib) {
    return docxLib;
  }

  try {
    // Fetch the docx library file
    const response = await fetch(chrome.runtime.getURL('docx.min.js'));
    const libText = await response.text();
    
    // Create a module URL
    const blob = new Blob([libText], { type: 'application/javascript' });
    const moduleURL = URL.createObjectURL(blob);
    
    // Import the module
    docxLib = await import(moduleURL);
    console.log('Docx library loaded in background:', docxLib);
    return docxLib;
  } catch (error) {
    console.error('Failed to load docx library in background:', error);
    throw error;
  }
}

// Function to create document
async function createDocument(messages) {
  const docx = await loadDocxLibrary();
  
  const children = [];
  
  messages.forEach(m => {
    children.push(
      new docx.Paragraph({
        children: [new docx.TextRun({ text: m.Author, bold: true })]
      }),
      new docx.Paragraph({
        children: [new docx.TextRun({ text: m.Message })]
      })
    );
  });
  
  return new docx.Document({
    sections: [{
      properties: {},
      children: children
    }]
  });
}

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'createWordDocument') {
    // Handle the request asynchronously
    (async () => {
      try {
        console.log('Background: Creating Word document...');
        
        // Load docx library if not already loaded
        const docx = await loadDocxLibrary();
        
        // Create the document
        const doc = await createDocument(request.messages);
        
        // Convert to buffer
        const buffer = await docx.Packer.toBuffer(doc);
        
        // Convert buffer to base64
        const base64Data = arrayBufferToBase64(buffer);
        
        // Send the response back
        sendResponse({ success: true, docBase64: base64Data });
      } catch (error) {
        console.error('Error in background script:', error);
        sendResponse({ success: false, error: error.toString() });
      }
    })();
    
    // Return true to indicate we will send response asynchronously
    return true;
  }
});

chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension Installed");
});