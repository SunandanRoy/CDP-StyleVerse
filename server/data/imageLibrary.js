// Self-curated image library — real, directly hotlinkable Unsplash CDN photos.
// No API key or signup required for hotlinking images.unsplash.com/photo-<id>.
// 6 categories, 8 photos each (48 total), assigned to products by exact category
// match and cycled so no two products in the same category repeat.
//
// Each entry provides a listing-size URL and a larger detail-view URL derived
// from the same photo id (different crop/width params), per the required
// { image_url, image_url_detail } product fields.

function unsplash(id) {
  return {
    image_url: `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=75`,
    image_url_detail: `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=80`
  }
}

export const IMAGE_LIBRARY = {
  Tops: [
    unsplash('photo-1521572163474-6864f9cf17ab'),
    unsplash('photo-1618354691373-d851c5c3a990'),
    unsplash('photo-1503341504253-dff4815485f1'),
    unsplash('photo-1562157873-818bc0726f68'),
    unsplash('photo-1596755094514-f87e34085b2c'),
    unsplash('photo-1620799140408-edc6dcb6d633'),
    unsplash('photo-1581655353564-df123a1eb820'),
    unsplash('photo-1503342217505-b0a15ec3261c')
  ],
  Bottoms: [
    unsplash('photo-1541099649105-f69ad21f3246'),
    unsplash('photo-1473966968600-fa801b869a1a'),
    unsplash('photo-1594633312681-425c7b97ccd1'),
    unsplash('photo-1602293589930-45821b8ae2ae'),
    unsplash('photo-1584370848010-d7fe6bc767ec'),
    unsplash('photo-1517438476312-10d79c077509'),
    unsplash('photo-1555689502-c4b22d76c56f'),
    unsplash('photo-1624378439575-d8705ad7ae80')
  ],
  Outerwear: [
    unsplash('photo-1551028719-00167b16eac5'),
    unsplash('photo-1544022613-e87ca75a784a'),
    unsplash('photo-1520975954732-35dd22299614'),
    unsplash('photo-1591047139829-d91aecb6caea'),
    unsplash('photo-1544923246-77307dd654cb'),
    unsplash('photo-1520006403909-838d6b92c22e'),
    unsplash('photo-1548126032-079a0fb0099d'),
    unsplash('photo-1580657018950-c7f7d6a6d990')
  ],
  Footwear: [
    unsplash('photo-1595950653106-6c9ebd614d3a'),
    unsplash('photo-1549298916-b41d501d3772'),
    unsplash('photo-1560769629-975ec94e6a86'),
    unsplash('photo-1542291026-7eec264c27ff'),
    unsplash('photo-1595341888016-a392ef81b7de'),
    unsplash('photo-1465453869711-7e174808ace9'),
    unsplash('photo-1518894781321-630e638d0742'),
    unsplash('photo-1519415943484-9fa1873496d4')
  ],
  Dresses: [
    unsplash('photo-1595777457583-95e059d581b8'),
    unsplash('photo-1515372039744-b8f02a3ae446'),
    unsplash('photo-1566174053879-31528523f8ae'),
    unsplash('photo-1496747611176-843222e1e57c'),
    unsplash('photo-1550639525-c97d455acf70'),
    unsplash('photo-1568252542512-9fe8fe9c87bb'),
    unsplash('photo-1487222477894-8943e31ef7b2'),
    unsplash('photo-1572804013309-59a88b7e92f1')
  ],
  Accessories: [
    unsplash('photo-1523170335258-f5ed11844a49'),
    unsplash('photo-1584917865442-de89df76afd3'),
    unsplash('photo-1524592094714-0f0654e20314'),
    unsplash('photo-1509941943102-10c232535736'),
    unsplash('photo-1553062407-98eeb64c6a62'),
    unsplash('photo-1622560480654-d96214fdc887'),
    unsplash('photo-1533139502658-0198f920d8e8'),
    unsplash('photo-1591561954557-26941169b49e')
  ]
}

export const CATEGORY_LIST = Object.keys(IMAGE_LIBRARY)

/**
 * Cycles through a category's image pool deterministically so products in the
 * same category get distinct images (wrapping if a category ever needs more
 * than its pool size).
 */
export function imageForIndex(category, index) {
  const pool = IMAGE_LIBRARY[category]
  if (!pool || pool.length === 0) throw new Error(`No images curated for category "${category}"`)
  return pool[index % pool.length]
}

/**
 * One-time startup HEAD-check across every curated URL. Logs any that don't
 * resolve so dead links are caught immediately rather than surfacing as
 * broken <img> tags. Best-effort — network restrictions in some sandboxes
 * will report failures here even though the frontend still gracefully
 * degrades to an inline placeholder via each <img>'s onError handler.
 */
export async function runStartupImageHealthCheck() {
  const allUrls = Object.values(IMAGE_LIBRARY).flatMap((pool) => pool.map((p) => p.image_url))
  console.log(`[imageLibrary] Checking ${allUrls.length} curated image URLs...`)
  const controller = () => {
    const c = new AbortController()
    const t = setTimeout(() => c.abort(), 6000)
    return { signal: c.signal, clear: () => clearTimeout(t) }
  }
  let dead = 0
  await Promise.all(
    allUrls.map(async (url) => {
      const { signal, clear } = controller()
      try {
        const res = await fetch(url, { method: 'HEAD', signal })
        clear()
        if (!res.ok) {
          dead++
          console.warn(`[imageLibrary] DEAD LINK (status ${res.status}): ${url}`)
        }
      } catch (err) {
        clear()
        dead++
        console.warn(`[imageLibrary] DEAD LINK (${err.code || err.message}): ${url}`)
      }
    })
  )
  if (dead === 0) {
    console.log('[imageLibrary] All curated image URLs resolved OK.')
  } else {
    console.warn(
      `[imageLibrary] ${dead}/${allUrls.length} curated URLs failed the HEAD-check. The frontend will fall back to inline placeholders for those.`
    )
  }
}
