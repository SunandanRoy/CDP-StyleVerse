import { useEffect, useState } from 'react'
import { api } from './api'

/**
 * Simple GET-fetch hook. Refetches whenever `path` changes (pass query
 * strings built from brand/filter state so callers stay reactive).
 */
export function useFetch(path, { skip = false } = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(!skip)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (skip || !path) return
    let cancelled = false
    setLoading(true)
    setError(null)
    api
      .get(path)
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [path, skip])

  return { data, loading, error }
}
