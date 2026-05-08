export function downloadCsv({ columns, rows, filename }) {
    const escape = (value) => {
        const str = String(value ?? '');
        return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
    };

    const header = columns.map((c) => escape(c.header)).join(',');
    const body = rows
        .map((row) => columns.map((c) => escape(row[c.key])).join(','))
        .join('\n');

    const bom = '\uFEFF';
    const blob = new Blob([bom + header + '\n' + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
