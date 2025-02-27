function exportToCSV(messages, includeIcons) {
    let csvContent = includeIcons ? "Avatar,Author,Message\n" : "Author,Message\n";

    csvContent += messages.map(e => 
        includeIcons 
            ? `"${e.Icon}","${e.Author}","${e.Message.replace(/"/g, '""').replace(/\n/g, '\r\n')}"`
            : `"${e.Author}","${e.Message.replace(/"/g, '""').replace(/\n/g, '\r\n')}"`
    ).join("\n");

    let blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "chat_export.csv");
    document.body.appendChild(link);
    link.click();
}

export { exportToCSV };
