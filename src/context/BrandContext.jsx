import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'

const BrandContext = createContext(null)

const STORAGE_KEY = 'styleverse.selectedBrandId'

export function BrandProvider({ children }) {
  const [brands, setBrands] = useState([])
  const [brandId, setBrandIdState] = useState(() => localStorage.getItem(STORAGE_KEY) || 'speedstyle')
  const [dial, setDialState] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/brands').then(setBrands).catch(console.error)
  }, [])

  useEffect(() => {
    if (!brandId) return
    setLoading(true)
    api
      .get(`/dial/${brandId}`)
      .then(setDialState)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [brandId])

  const setBrandId = useCallback((id) => {
    localStorage.setItem(STORAGE_KEY, id)
    setBrandIdState(id)
  }, [])

  const updateDial = useCallback(
    async (patch) => {
      setDialState((prev) => (prev ? { ...prev, ...patch } : prev)) // optimistic, drives live UI changes
      try {
        const updated = await api.patch(`/dial/${brandId}`, patch)
        setDialState(updated)
      } catch (err) {
        console.error('Failed to update dial settings', err)
      }
    },
    [brandId]
  )

  const brand = useMemo(() => brands.find((b) => b.id === brandId) || null, [brands, brandId])

  useEffect(() => {
    document.documentElement.setAttribute('data-brand', brandId)
  }, [brandId])

  const value = useMemo(
    () => ({ brands, brandId, setBrandId, brand, dial, updateDial, loading }),
    [brands, brandId, setBrandId, brand, dial, updateDial, loading]
  )

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>
}

export function useBrand() {
  const ctx = useContext(BrandContext)
  if (!ctx) throw new Error('useBrand must be used within BrandProvider')
  return ctx
}
