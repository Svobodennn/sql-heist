// Zero-dependency static file server for the Next.js `out/` export.
// Serves the REAL production export and mirrors the simple path-segment rewrites
// declared in vercel.json. This validates shell/file coupling locally; it does NOT
// prove Vercel applied the deploy config. Correct MIME types matter: `.wasm` must be
// `application/wasm` for sql.js to instantiate the SQLite engine.
//
// Next static export writes a route as `<route>.html` (e.g. `jobs.html`,
// `jobs/vault.html`) AND may create a same-named directory for nested routes
// (`jobs/`). So for `/jobs` the ROUTE FILE `jobs.html` must win over the
// `jobs/` directory — resolution order below reflects that.
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = fileURLToPath(new URL('../../out', import.meta.url))
const PROJECT_ROOT = fileURLToPath(new URL('../../', import.meta.url))
const PORT = Number(process.env.PORT ?? 5055)
const VERCEL_CONFIG = JSON.parse(await readFile(path.join(PROJECT_ROOT, 'vercel.json'), 'utf8'))
const REWRITES = VERCEL_CONFIG.rewrites ?? []

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
}

async function isFile(p) {
  try {
    return (await stat(p)).isFile()
  } catch {
    return false
  }
}
async function isDir(p) {
  try {
    return (await stat(p)).isDirectory()
  } catch {
    return false
  }
}

function rewritePath(urlPath) {
  const pathname = urlPath.split('?')[0]
  const pathSegments = pathname.split('/').filter(Boolean)

  for (const rewrite of REWRITES) {
    const sourceSegments = rewrite.source.split('/').filter(Boolean)
    if (sourceSegments.length !== pathSegments.length) continue

    const matches = sourceSegments.every(
      (segment, index) => segment.startsWith(':') || segment === pathSegments[index],
    )
    if (matches) return rewrite.destination
  }

  return pathname
}

async function resolveFile(urlPath) {
  const clean = decodeURIComponent(rewritePath(urlPath))
  // Normalize, drop path-traversal, strip a trailing slash.
  let rel = path.normalize(clean).replace(/^(\.\.[/\\])+/, '')
  rel = rel.replace(/[/\\]+$/, '')
  if (rel === '' || rel === '.' || rel === '/') return path.join(ROOT, 'index.html')

  const base = path.join(ROOT, rel)
  if (await isFile(base)) return base // 1) exact asset (_next/*, *.wasm)
  if (!path.extname(base) && (await isFile(`${base}.html`))) return `${base}.html` // 2) Next route
  if ((await isDir(base)) && (await isFile(path.join(base, 'index.html')))) {
    return path.join(base, 'index.html') // 3) directory index
  }
  return null
}

const server = createServer(async (req, res) => {
  const filePath = await resolveFile(req.url ?? '/')
  if (!filePath) {
    res.writeHead(404, { 'content-type': 'text/plain' })
    res.end('Not found')
    return
  }
  try {
    const body = await readFile(filePath)
    const type = MIME[path.extname(filePath)] ?? 'application/octet-stream'
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' })
    res.end(body)
  } catch {
    res.writeHead(500, { 'content-type': 'text/plain' })
    res.end('Server error')
  }
})

server.listen(PORT, '127.0.0.1', () => {
  // eslint-disable-next-line no-console
  console.log(`static-server: serving ${ROOT} at http://127.0.0.1:${PORT}`)
})
