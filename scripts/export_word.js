function exportToWord(messages, applyMarkdown) {
  console.log("Preparing to export to Word...");

  const exportHTML = `
<!DOCTYPE html>
      <html>
      <head>
          <title>Word Export</title>
          <script src="${chrome.runtime.getURL('assets/docx.min.js')}"></script>
      </head>
      <body>
          <script>
              function parseMarkdown(text) {
                  const parts = [];
                  let lastIndex = 0;
  
                  // Regex for Markdown: ***bold italic***, **bold**, *italic*
                  const markdownRegex = /(\\*\\*\\*(.*?)\\*\\*\\*|\\*\\*(.*?)\\*\\*|\\*(.*?)\\*)/g;
  
                  let match;
                  while ((match = markdownRegex.exec(text)) !== null) {
                      // Push normal text before match
                      if (match.index > lastIndex) {
                          parts.push(new docx.TextRun({ text: text.substring(lastIndex, match.index) }));
                      }
  
                      // Apply styles based on match groups
                      if (match[1]?.startsWith("***")) {
                          parts.push(new docx.TextRun({ text: match[2], bold: true, italics: true }));
                      } else if (match[1]?.startsWith("**")) {
                          parts.push(new docx.TextRun({ text: match[3], bold: true }));
                      } else if (match[1]?.startsWith("*")) {
                          parts.push(new docx.TextRun({ text: match[4], italics: true }));
                      }
  
                      lastIndex = markdownRegex.lastIndex;
                  }
  
                  // Add remaining text
                  if (lastIndex < text.length) {
                      parts.push(new docx.TextRun({ text: text.substring(lastIndex) }));
                  }
  
                  return parts;
              }
              async function generateDoc(messages, applyMarkdown) {
                  try {
                      console.log("Creating Word document...");

                      // Create document
                      const doc = new docx.Document({
                          sections: [{
                              properties: {},
                              children: messages.map(m => {
                                  let elements = [];

                                  // If the user wants icons, insert them next to the author name
                                  if (m.IconBase64) {
                                      elements.push(
                                          new docx.ImageRun({
                                              data: Uint8Array.from(atob(m.IconBase64), c => c.charCodeAt(0)), 
                                              transformation: { width: 24, height: 24 } 
                                          }),
                                          new docx.TextRun({ text: " ", size: 24 }) // Space between image and name
                                      );
                                  }

                                  // Add author name in bold
                                  elements.push(new docx.TextRun({ 
                                    text: m.Author,
                                    bold: true,
                                    smallCaps: true,
                                    underline: {type: 'single'}
                                  }));

                                  return [
                                      new docx.Paragraph({ children: elements }),

                                      // Split message by newlines and add each line as a paragraph
                                      ...m.Message.split("\\n").map(line => 
                                          new docx.Paragraph({
                                              children: applyMarkdown 
                                                  ? parseMarkdown(line)
                                                  : [new docx.TextRun({ text: line })]
                                          })
                                      ),
                                      
                                      // Add an empty paragraph for spacing
                                      new docx.Paragraph({
                                          children: [new docx.TextRun({ text: "" })]
                                      })
                                  ];
                              }).flat()
                          }]
                      });

                      // Generate and download the document
                      const blob = await docx.Packer.toBlob(doc);
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = "chat_export.docx";
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);

                      window.parent.postMessage({ type: 'EXPORT_COMPLETE', success: true }, '*');
                  } catch (error) {
                      console.error("Error creating document:", error);
                      window.parent.postMessage({ type: 'EXPORT_COMPLETE', success: false, error: error.toString() }, '*');
                  }
              }

              window.addEventListener('message', async function(event) {
                  if (event.data.type === 'EXPORT_WORD') {
                      await generateDoc(event.data.messages, event.data.applyMarkdown);
                  }
              });

              window.parent.postMessage({ type: 'EXPORT_READY' }, '*');
          </script>
      </body>
      </html>
  `;

  // Create a blob URL for the HTML content
  const blob = new Blob([exportHTML], { type: 'text/html' });
  const exportUrl = URL.createObjectURL(blob);

  // Create an iframe to load the export page
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);

  window.addEventListener('message', function messageHandler(event) {
      if (event.data.type === 'EXPORT_READY') {
        iframe.contentWindow.postMessage({ 
            type: 'EXPORT_WORD', 
            messages: messages, 
            applyMarkdown: applyMarkdown 
        }, '*');
      }
      else if (event.data.type === 'EXPORT_COMPLETE') {
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

  iframe.src = exportUrl;
}

export { exportToWord };