/* Don't use sloppy JS. */ "use strict";

// The playground: an editor, and the app it holds running in a sandboxed
// iframe. The iframe has no origin of its own to share, so it is sent
// everything it needs by message: the code, Kwilos itself, and the files the
// visitor added, which it serves to the app by name.

const MODULES = {
  'kwilos.js': 'kwilos/kwilos.min.mjs',
  'kwilos.js/aseprite': 'kwilos/aseprite.min.mjs',
}
const MAX_LOG_LINES = 300

const $ = (selector) => /** @type {any} */ (document.querySelector(selector))
const root = $('.playground')
const code = $('#code')
const preview = $('.pg-preview')
const console_section = $('.pg-console')
const stage = $('#stage')
const status = $('#status')
const notice = $('#notice')
const errors = $('#errors')
const log = $('#log')
const file_input = $('#file-input')
const file_list = $('#file-list')
const file_count = $('#file-count')
const drop_zone = $('#files')

const starter = code.defaultValue
// Files that arrive with the page, as data-files lists, as addresses from the page
const bundled = (root.dataset.files ?? '').split(/\s+/).filter(Boolean)
/** @type {Map<string, File>} */
const files = new Map()
/** @type {Map<string, File>} */
const bundled_files = new Map()
/** @type {HTMLIFrameElement | null} */
let frame = null
let has_run = false
/** @type {Set<string>} */
let missing = new Set()
let module_texts = null

// The runner is the document the app runs in. It is written as a function
// so that it is checked as code, then sent to the iframe as text.
function runner_main() {
  const post = (message) => parent.postMessage(message, '*')
  const show = (value) => {
    if (typeof value === 'string') return value
    if (value instanceof Error) return value.message
    try { return JSON.stringify(value) ?? String(value) } catch { return String(value) }
  }

  for (const level of ['log', 'info', 'warn', 'error']) {
    const original = console[level].bind(console)
    console[level] = (...args) => {
      post({ type: 'log', level, text: args.map(show).join(' ') })
      original(...args)
    }
  }
  addEventListener('error', (event) => {
    const text = event.error?.message ?? event.message ?? 'Error'
    post({ type: 'error', text: event.lineno ? `${text} (line ${event.lineno})` : text })
  })
  addEventListener('unhandledrejection', (event) =>
    post({ type: 'error', text: event.reason?.message ?? String(event.reason) }))

  addEventListener('message', ({ data, source }) => {
    if (source !== parent || data?.type !== 'run') return

    // Each file the visitor added gets a URL, found by name
    const urls = new Map()
    for (const { name, file } of data.files) urls.set(name, URL.createObjectURL(file))
    const reported = new Set()
    const known = (path) => {
      const text = String(path)
      if (/^([a-z][a-z0-9+.-]*:|\/)/i.test(text)) return text
      let name = text.split(/[?#]/)[0].replace(/^(\.\/)+/, '')
      try { name = decodeURIComponent(name) } catch { }
      const url = urls.get(name) ?? urls.get(name.split('/').pop())
      if (url) return url
      if (!reported.has(name)) {
        reported.add(name)
        post({ type: 'missing', name })
      }
      return text
    }

    // Images, audio and fetch find the files by the names the app uses
    for (const proto of [HTMLImageElement.prototype, HTMLMediaElement.prototype]) {
      const descriptor = Object.getOwnPropertyDescriptor(proto, 'src')
      Object.defineProperty(proto, 'src', { ...descriptor, set(value) { descriptor.set.call(this, known(value)) } })
    }
    const real_fetch = window.fetch.bind(window)
    window.fetch = (input, init) =>
      real_fetch(typeof input === 'string' || input instanceof URL ? known(input) : input, init)

    // Kwilos is imported by name, as from npm
    const imports = {}
    for (const [specifier, text] of Object.entries(data.modules))
      imports[specifier] = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }))
    const map = document.createElement('script')
    map.type = 'importmap'
    map.textContent = JSON.stringify({ imports })
    document.head.append(map)

    const app = document.createElement('script')
    app.type = 'module'
    app.textContent = data.code
    document.body.append(app)
  })
}

const RUNNER = `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  html, body { margin: 0; background: #1c1c1e; }
  canvas { display: block; max-width: 100%; height: auto; margin: 0 auto; }
</style></head>
<body><canvas id="canvas" width="600" height="360"></canvas>
<script>(${runner_main.toString()})()</script>
</body></html>`

// Runs the code in a new iframe, replacing the last one, which stops its app.
// A browser does not paint an iframe that is out of view, so a run the visitor
// asked for brings the preview into view, if it is not all in view already.
async function run({ reveal = true } = {}) {
  if (reveal) preview.scrollIntoView({ block: 'nearest' })
  errors.hidden = true
  errors.replaceChildren()
  log.replaceChildren()
  missing = new Set()
  has_run = true

  let modules
  try {
    modules = await load_modules()
  } catch (error) {
    show_error(error.message)
    return
  }

  frame = document.createElement('iframe')
  frame.title = 'Your app'
  frame.setAttribute('sandbox', 'allow-scripts')
  frame.srcdoc = RUNNER
  const current = frame
  frame.addEventListener('load', () => current.contentWindow?.postMessage({
    type: 'run',
    code: code.value,
    files: [...files].map(([name, file]) => ({ name, file })),
    modules,
  }, '*'))
  stage.replaceChildren(frame)
}

// Fetches Kwilos and its modules once, without their source map comments,
// which would point nowhere from the iframe
async function load_modules() {
  module_texts ??= Object.fromEntries(await Promise.all(Object.entries(MODULES).map(async ([specifier, path]) => {
    const response = await fetch(new URL(path, import.meta.url))
    if (!response.ok) throw new Error(`Could not load ${path}`)
    return [specifier, (await response.text()).replace(/\n?\/\/# sourceMappingURL=.*$/m, '')]
  })))
  return module_texts
}

// What the app says arrives as messages from the iframe, and only from it
addEventListener('message', ({ data, source }) => {
  if (!frame || source !== frame.contentWindow) return
  if (data?.type === 'log') add_log(data.level, data.text)
  else if (data?.type === 'error') show_error(data.text)
  else if (data?.type === 'missing') {
    missing.add(data.name)
    show_error(`The app asked for “${data.name}”, which has not been added. Add it under Files, then press Run.`)
  }
})

function show_error(text) {
  const line = document.createElement('div')
  line.textContent = text
  errors.append(line)
  errors.hidden = false
}

function add_log(level, text) {
  console_section.hidden = false
  const line = document.createElement('div')
  line.className = `pg-log-${level}`
  line.textContent = text
  log.append(line)
  while (log.children.length > MAX_LOG_LINES) log.firstChild.remove()
  log.scrollTop = log.scrollHeight
}

let say_timer
function say(text) {
  status.textContent = text
  clearTimeout(say_timer)
  say_timer = setTimeout(() => { status.textContent = '' }, 4000)
}

// Code travels in the address as compressed, URL-safe text
async function encode(text) {
  const bytes = new TextEncoder().encode(text)
  if (typeof CompressionStream === 'function') {
    const packed = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))
    return 'z.' + to_base64url(new Uint8Array(await new Response(packed).arrayBuffer()))
  }
  return 'p.' + to_base64url(bytes)
}

async function decode(token) {
  const bytes = from_base64url(token.slice(2))
  if (token.startsWith('p.')) return new TextDecoder().decode(bytes)
  if (!token.startsWith('z.')) throw new Error('unknown format')
  const unpacked = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new TextDecoder().decode(await new Response(unpacked).arrayBuffer())
}

function to_base64url(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function from_base64url(text) {
  const binary = atob(text.replaceAll('-', '+').replaceAll('_', '/'))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

async function share() {
  history.replaceState(null, '', `#code=${await encode(code.value)}`)
  try {
    await navigator.clipboard.writeText(location.href)
    say('Link copied')
  } catch {
    say('The link is in the address bar')
  }
}

async function reset() {
  if (code.value !== starter && !confirm('Replace your code with the starting code?')) return
  code.value = starter
  history.replaceState(null, '', location.pathname + location.search)
  notice.hidden = true
  await add_bundled()
  run()
}

// Adds the files that came with the page, fetched once, and any that were removed
async function add_bundled() {
  for (const path of bundled) {
    const name = decodeURIComponent(path.split('/').pop())
    if (files.has(name)) continue
    if (!bundled_files.has(name)) {
      const response = await fetch(path)
      if (!response.ok) {
        show_error(`Could not load the file ${name}.`)
        continue
      }
      bundled_files.set(name, new File([await response.blob()], name, { type: response.headers.get('content-type') ?? '' }))
    }
    files.set(name, bundled_files.get(name))
  }
  render_files()
}

function add_files(list) {
  for (const file of list) files.set(file.name, file)
  drop_zone.open = true
  render_files()
  say(list.length === 1 ? 'File added' : `${list.length} files added`)
  // An app that asked for a file it did not have gets another go
  if (missing.size > 0) run()
}

function render_files() {
  file_count.textContent = files.size > 0 ? `(${files.size})` : ''
  const items = [...files.values()].sort((a, b) => a.name.localeCompare(b.name)).map((file) => {
    const item = document.createElement('li')
    const name = document.createElement('span')
    name.textContent = file.name
    const size = document.createElement('span')
    size.className = 'pg-hint'
    size.textContent = file.size < 1024 ? `${file.size} B` : `${Math.round(file.size / 1024)} KB`
    const remove = document.createElement('button')
    remove.type = 'button'
    remove.textContent = '×'
    remove.setAttribute('aria-label', `Remove ${file.name}`)
    remove.addEventListener('click', () => { files.delete(file.name); render_files() })
    item.append(name, size, remove)
    return item
  })
  if (items.length === 0) {
    const none = document.createElement('li')
    none.className = 'pg-hint'
    none.textContent = 'No files added'
    items.push(none)
  }
  file_list.replaceChildren(...items)
}

$('#run').addEventListener('click', () => run())
$('#share').addEventListener('click', share)
$('#reset').addEventListener('click', reset)
file_input.addEventListener('change', () => {
  add_files([...file_input.files])
  file_input.value = ''
})
drop_zone.addEventListener('dragover', (event) => { event.preventDefault(); drop_zone.classList.add('pg-dragging') })
drop_zone.addEventListener('dragleave', () => drop_zone.classList.remove('pg-dragging'))
drop_zone.addEventListener('drop', (event) => {
  event.preventDefault()
  drop_zone.classList.remove('pg-dragging')
  if (event.dataTransfer?.files.length) add_files([...event.dataTransfer.files])
})

// Tab types spaces, as in an editor, until Escape says Tab should move on
let tab_leaves = false
code.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    run()
    return
  }
  if (event.key === 'Escape') tab_leaves = true
  else if (event.key === 'Tab' && !tab_leaves && !event.shiftKey) {
    event.preventDefault()
    document.execCommand('insertText', false, '  ')
  }
  else if (event.key !== 'Tab' && event.key !== 'Shift') tab_leaves = false
})

// The starter runs at once. Code from a link waits for the visitor to read
// it and press Run, as it is someone else's.
// A tutorial page keeps the console out of sight until the app writes to it
if (root.dataset.console === 'auto') console_section.hidden = true
await add_bundled()
render_files()
// The files start folded away on a narrow screen, where they would push the editor down;
// on a wide one they sit beside it
if (!matchMedia('(width > 52rem)').matches) drop_zone.open = false
const token = new URLSearchParams(location.hash.slice(1)).get('code')
if (token) {
  try {
    code.value = await decode(token)
    if (code.value === starter) run({ reveal: false })
    else {
      notice.textContent = 'This code came from a link. Read it, then press Run.'
      notice.hidden = false
    }
  } catch {
    notice.textContent = 'The code in this link could not be read, so the starter app is shown.'
    notice.hidden = false
    run({ reveal: false })
  }
} else run({ reveal: false })
