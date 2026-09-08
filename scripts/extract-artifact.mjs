import { readFileSync, writeFileSync, mkdirSync } from 'fs'

const src = readFileSync('dist-artifact/index.html', 'utf8')

const titleMatch = src.match(/<title>([\s\S]*?)<\/title>/)
const fontLinkMatch = src.match(/<link\s+href="https:\/\/fonts\.googleapis\.com[^>]*rel="stylesheet"\s*\/>/)
const styleMatch = src.match(/<style[^>]*>([\s\S]*)<\/style>/)
const scriptStart = src.indexOf('<script type="module" crossorigin>')
const scriptEnd = src.lastIndexOf('</script>')
if (!titleMatch || !fontLinkMatch || !styleMatch || scriptStart === -1 || scriptEnd === -1) {
  throw new Error('Failed to locate expected sections in the built artifact HTML')
}
const scriptOpenTagEnd = src.indexOf('>', scriptStart) + 1
const scriptBody = src.slice(scriptOpenTagEnd, scriptEnd)

const out = `<title>${titleMatch[1]}</title>
${fontLinkMatch[0]}
<style>
${styleMatch[1]}
</style>

<div id="root"></div>
<script type="module">
${scriptBody}
</script>
`

mkdirSync('dist-artifact', { recursive: true })
writeFileSync('dist-artifact/artifact.html', out)
console.log('wrote dist-artifact/artifact.html', (out.length / 1024).toFixed(1), 'KB')
