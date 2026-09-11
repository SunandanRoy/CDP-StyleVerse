const PATHS = {
  dashboard: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6V11h-6v9Zm0-16v5h6V4h-6Z',
  customers: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  confidence: 'M4 20a8 8 0 1 1 16 0M12 20V9m0 0 4-3',
  passport: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm3 5h8M8 12h8M8 15h5',
  interception: 'M4 12a8 8 0 1 1 3 6.2M4 12v5M4 12H9',
  decoder: 'M4 20V10m6 10V4m6 16v-7m6 7v-3',
  cases: 'M5 5h14v11H8l-3 3V5Z',
  track: 'M3 7h11v9H3V7Zm11 3h4l3 3v3h-7v-6ZM6.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm11 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  dial: 'M5 7h14M5 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0Zm14 5H5m14 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5 17h14M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z',
  voice: 'M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm-6-3a6 6 0 0 0 12 0M12 18v3',
  override: 'M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Zm-2.5 9 1.8 1.8L15 10',
  registry: 'M6 4h9l3 3v13H6V4Zm9 0v3h3M9 12h6M9 15h6M9 9h3',
  capacity: 'M4 8h16v11H4V8Zm4 0V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M4 13h16',
  signal: 'M4 15V9l12-4v14L4 15Zm12-8v10a3 3 0 0 0 0-10ZM4 15v3a2 2 0 0 0 2 2h1v-5',
  lattice: 'M5 5h4v4H5V5Zm10 0h4v4h-4V5ZM5 15h4v4H5v-4Zm10 0h4v4h-4v-4ZM9 7h6M7 9v4M17 9v4M9 17h6'
}

export default function NavIcon({ name, className = 'h-4 w-4' }) {
  const d = PATHS[name]
  if (!d) return null
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={d} />
    </svg>
  )
}
