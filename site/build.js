// Builds the Kwilos web site into _site/: an opening page with the samples
// running from the CDN, and an API page rendered from the README.
//
// Usage: node site/build.js [--from-src]
//   --from-src  The samples import Kwilos from the repository's src/
//               instead of the CDN, for testing without a network.

import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Marked } from 'marked'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import shell from 'highlight.js/lib/languages/shell'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const SITE = join(ROOT, 'site')
const OUT = join(ROOT, '_site')
const REPO = 'https://github.com/nogginly/kwilos.js'

const { version } = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'))
const from_src = process.argv.includes('--from-src')

// The address each sample imports Kwilos from, written relative to a
// sample's own folder when using the repository's src/
const kwilos_url = from_src
  ? '../../../src/kwilos.js'
  : `https://cdn.jsdelivr.net/npm/kwilos.js@${version}/_dist/kwilos.min.mjs`

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('sh', shell)

const markdown = new Marked({
  renderer: {
    // Code blocks in a known language are highlighted when the site is built
    code({ text, lang }) {
      return `<pre><code class="hljs">${highlight(text, lang)}</code></pre>\n`
    },
    // Headings get GitHub-style ids, so links such as #hit-testing work
    heading({ tokens, depth, text }) {
      return `<h${depth} id="${slug(text)}">${this.parser.parseInline(tokens)}</h${depth}>\n`
    },
  },
})

await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

const samples = await build_samples()
const readme = await readFile(join(ROOT, 'README.md'), 'utf8')
const template = await readFile(join(SITE, 'template.html'), 'utf8')

const intro = (await readFile(join(SITE, 'index.md'), 'utf8')).replaceAll('{{version}}', version)
await write_page('index.html', {
  title: 'Kwilos: drawing on an HTML5 canvas',
  description: 'Kwilos is an easy-to-use, dependency-free JavaScript toolkit for drawing on an HTML5 canvas.',
  nav: 'home',
  content: render(intro)
    .replace('<p>{{samples}}</p>', samples.map(sample_html).join('\n'))
    .replace('<p>{{get_started}}</p>', render(section(readme, '### Via CDN', '## API'))),
})

// The README's API sections, with the first retitled to sit under the page's title
const api = section(readme, '## API', '## Releasing').replace(/^## API\n/, '## Setting up\n')
await write_page('api.html', {
  title: 'Kwilos API',
  description: 'The Kwilos API: attaching to a canvas, the tick function, shapes, hit-testing and input.',
  nav: 'api',
  content: `<h1 id="api">API</h1>\n${toc(api)}\n${render(api)}`,
})

await cp(join(SITE, 'style.css'), join(OUT, 'style.css'))
await cp(join(SITE, 'site.js'), join(OUT, 'site.js'))
// GitHub Pages would otherwise process the site with Jekyll
await writeFile(join(OUT, '.nojekyll'), '')

console.log(`Built _site/ for Kwilos ${version}, ${samples.length} samples, Kwilos from ${from_src ? 'src/' : 'the CDN'}`)

// Copies samples/ into the site with each sample importing Kwilos from
// `kwilos_url`, and returns each sample's title, description, canvas size
// and source.
async function build_samples() {
  await cp(join(ROOT, 'samples'), join(OUT, 'samples'), { recursive: true })
  const names = (await readdir(join(OUT, 'samples'), { withFileTypes: true }))
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort()

  const found = []
  for (const name of names) {
    const dir = join(OUT, 'samples', name)
    const app_path = join(dir, 'app.js')
    const source = (await readFile(app_path, 'utf8')).replaceAll('../../src/kwilos.js', kwilos_url)
    await writeFile(app_path, source)

    const html = await readFile(join(dir, 'index.html'), 'utf8')
    // The sample's size: its sample-size tag if it has one, as when its
    // canvases are offset, otherwise its largest canvas
    const canvases = [...html.matchAll(/<canvas[^>]*width="(\d+)"[^>]*height="(\d+)"/g)]
    const declared = html.match(/<meta name="sample-size" content="(\d+)x(\d+)"/)
    found.push({
      name,
      title: html.match(/<title>([^<]*)<\/title>/)?.[1].trim() ?? name,
      description: html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '',
      width: declared ? Number(declared[1]) : Math.max(...canvases.map(m => Number(m[1]))),
      height: declared ? Number(declared[2]) : Math.max(...canvases.map(m => Number(m[2]))),
      source,
    })
  }
  return found
}

// Returns a sample's section: its title, description, and Preview and
// Source tabs over the running sample and its app.js
function sample_html({ name, title, description, width, height, source }) {
  const id = `sample-${name}`
  return `<section class="sample" id="${id}" aria-labelledby="${id}-title">
  <h3 id="${id}-title">${escape(title)}</h3>
  <p class="sample-description">${escape(description)}</p>
  <div class="tabs" role="tablist" aria-label="${escape(title)}">
    <button type="button" role="tab" id="${id}-preview-tab" aria-controls="${id}-preview" aria-selected="true">Preview</button>
    <button type="button" role="tab" id="${id}-source-tab" aria-controls="${id}-source" aria-selected="false" tabindex="-1">Source</button>
  </div>
  <div class="sample-panel" id="${id}-preview" role="tabpanel" aria-labelledby="${id}-preview-tab">
    <div class="sample-stage">
      <iframe src="samples/${name}/index.html" title="${escape(title)}" loading="lazy"
        style="max-width: ${width}px; aspect-ratio: ${width} / ${height}"></iframe>
    </div>
  </div>
  <div class="sample-panel" id="${id}-source" role="tabpanel" aria-labelledby="${id}-source-tab" hidden>
    <p class="sample-file">samples/${name}/app.js</p>
    <pre><code class="hljs">${highlight(source, 'javascript')}</code></pre>
  </div>
  <p class="sample-links"><a href="samples/${name}/index.html">Open on its own</a> · <a href="${REPO}/tree/v${version}/samples/${name}">View on GitHub</a></p>
</section>`
}

// Writes a page from the template
async function write_page(file, { title, description, nav, content }) {
  const page = template
    .replaceAll('{{title}}', escape(title))
    .replaceAll('{{description}}', escape(description))
    .replaceAll('{{version}}', version)
    .replace('{{nav_home}}', nav === 'home' ? 'aria-current="page"' : '')
    .replace('{{nav_api}}', nav === 'api' ? 'aria-current="page"' : '')
    .replace('{{content}}', content)
  await writeFile(join(OUT, file), page)
}

// Renders markdown, pointing links to the repository's other files at
// GitHub, and letting wide tables scroll
function render(text) {
  return markdown.parse(text)
    .replace(/href="(?!https?:|#|mailto:)([^"]+)"/g, (_, path) =>
      path.endsWith('.html') ? `href="${path}"` : `href="${REPO}/blob/v${version}/${path}"`)
    .replaceAll('<table>', '<div class="table-wrap"><table>')
    .replaceAll('</table>', '</table></div>')
}

// Returns the README from the heading `start` up to, not including, the
// heading `end`
function section(text, start, end) {
  const from = text.indexOf(`\n${start}`)
  const to = text.indexOf(`\n${end}`, from + 1)
  if (from < 0 || to < 0)
    throw new Error(`README section "${start}" ... "${end}" not found`)
  return text.slice(from + 1, to)
}

// Returns a table of contents of the text's level 2 headings, each with
// its level 3 headings
function toc(text) {
  const sections = []
  for (const [, hashes, heading] of text.matchAll(/^(#{2,3}) (.+)$/gm)) {
    const link = `<a href="#${slug(heading)}">${markdown.parseInline(heading)}</a>`
    if (hashes === '##')
      sections.push({ link, children: [] })
    else
      sections.at(-1)?.children.push(link)
  }
  const items = sections.map(({ link, children }) =>
    `<li>${link}${children.length ? `<ul>${children.map(child => `<li>${child}</li>`).join('')}</ul>` : ''}</li>`)
  return `<nav aria-label="Contents"><ul class="toc">${items.join('')}</ul></nav>`
}

// Returns a GitHub-style id for a heading's text
function slug(text) {
  return text.toLowerCase().replace(/`/g, '').replace(/[^\w\- ]/g, '').trim().replace(/ /g, '-')
}

// Returns code as highlighted HTML, or escaped as it is for an unknown language
function highlight(code, language) {
  return language && hljs.getLanguage(language)
    ? hljs.highlight(code, { language }).value
    : escape(code)
}

function escape(text) {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}
