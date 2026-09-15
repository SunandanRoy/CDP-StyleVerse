import { exportToCsv } from '../lib/csv'
import { toast } from '../lib/toast'

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" />
    </svg>
  )
}

export default function ExportCsvButton({ filename, rows, columns, label = 'Export CSV' }) {
  const disabled = !rows || rows.length === 0
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        exportToCsv(filename, rows, columns)
        toast.success(`Exported ${rows.length} row${rows.length === 1 ? '' : 's'} to ${filename}`)
      }}
      className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
      style={{ borderColor: 'var(--edge)', color: 'var(--ink-mute)' }}
      title={disabled ? 'No rows to export' : `Download ${filename}`}
    >
      <DownloadIcon />
      {label}
    </button>
  )
}
