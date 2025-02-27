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