export default function Skeleton({ className = 'h-4 w-full' }) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{ background: 'linear-gradient(90deg, var(--surface-alt), var(--edge), var(--surface-alt))', backgroundSize: '200% 100%' }}
    />
  )
}

export function KpiCardSkeleton() {
  return (
    <div className="card flex flex-col gap-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-3 w-24" />
    </div>
  )
}
