// Serves the repository's files over HTTP for the browser tests.
// Usage: node test/browser/serve.js [port]

import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const PORT = Number(process.argv[2] ?? 4173)
const TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.map': 'application/json',
  '.png': 'image/png',
}

createServer(async (request, response) => {
  // Resolve the URL path inside the repository, refusing anything outside it
  const path = normalize(join(ROOT, decodeURIComponent(new URL(request.url, 'http://x').pathname)))
  if (!path.startsWith(ROOT + sep) && path !== ROOT) {
    response.writeHead(403).end()
    return
  }
  try {
    const body = await readFile(path)
    response.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(body)
  }
  catch {
    response.writeHead(404).end()
  }
}).listen(PORT, () => console.log(`Serving ${ROOT} on http://localhost:${PORT}`))
