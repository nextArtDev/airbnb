export type CsvCell = string | number | bigint | null | undefined;

/**
 * Formula injection guard: a cell starting with = + - @ (or a control char) is
 * executed as a formula when the file is opened in Excel/Sheets. Prefixing with
 * an apostrophe neutralises it while keeping the visible text intact.
 */
function escapeCell(cell: CsvCell) {
  let value = cell === null || cell === undefined ? "" : String(cell);
  if (/^[=+\-@\t\r]/.test(value)) value = `'${value}`;
  if (/[",\r\n]/.test(value)) value = `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function toCsv(rows: CsvCell[][]) {
  return rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, rows: CsvCell[][]) {
  // BOM keeps Excel from mangling Persian/Arabic text.
  const blob = new Blob(["\uFEFF", toCsv(rows)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
