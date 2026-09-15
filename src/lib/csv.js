function csvEscape(value) {
  const s = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * columns: [{ key?, label, value?(row) }] — either a plain `key` lookup or a
 * `value(row)` getter for computed columns.
 */
export function exportToCsv(filename, rows, columns) {
  const header = columns.map((c) => csvEscape(c.label)).join(',')
  const body = rows
    .map((row) => columns.map((c) => csvEscape(c.value ? c.value(row) : row[c.key])).join(','))
    .join('\n')
  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
