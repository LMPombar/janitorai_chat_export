async function exportToWord(messages, includeIcons) {
    console.log("Preparing to export to Word via background script...");
    
    try {
      // Clean messages data for transfer (remove circular references if any)
      const cleanMessages = messages.map(m => ({
        Author: m.Author || 'Unknown',
        Message: m.Message || '',
        // Only include icon if needed
        ...(includeIcons && m.Icon ? { Icon: m.Icon } : {})
      }));
      
      // Send message to background script
      chrome.runtime.sendMessage(
        {
          action: 'createWordDocument',
          messages: cleanMessages
        },
        (response) => {
          if (!response) {
            console.error("No response from background script");
            alert("Failed to generate document: No response from extension");
            return;
          }
          
          if (!response.success) {
            console.error("Error from background script:", response.error);
            alert("Failed to generate document: " + response.error);
            return;
          }
          
          console.log("Document generated successfully in background");
          
          // Convert base64 back to blob
          const byteCharacters = atob(response.docBase64);
          const byteArrays = [];
          
          for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
              byteNumbers[i] = slice.charCodeAt(i);
            }
            
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
          }
          
          const blob = new Blob(byteArrays, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
          
          // Create download link
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = "chat_export.docx";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          console.log("Document download triggered.");
        }
      );
    } catch (error) {
      console.error("Error preparing document for export:", error);
      alert("Error preparing document for export: " + error.message);
    }
}

export { exportToWord };
