// Phone screenshots for the pitch deck (frontend/public/presentation/), then a
// check of the deck itself.
//
// Starts the backend on a fresh SQLite database, so the numbers match the
// slides and DEMO.md, and the Vite dev server on spare ports. Opens each demo
// store in the iPhone preview (`?preview`) and saves the whole device, frame
// included, as a PNG with a transparent background. Then walks every slide at
// 1920×1080, 1280×720, and phone width (with reduced motion), checks that it
// fits, its images load, and the keys move between slides, and writes a render
// of each slide plus report.json to e2e/artifacts/slides/. Exits non-zero if
// any check fails.
//
//   cd e2e && npm install && npm run slides
//
// Needs backend/.venv and frontend/node_modules (see README).

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'frontend', 'public', 'presentation', 'assets')
const ARTIFACTS = path.join(ROOT, 'e2e', 'artifacts', 'slides')
// Not app.mjs's ports, so both can run at once.
const API_PORT = 8078
const WEB_PORT = 5178
const BASE_URL = `http://127.0.0.1:${WEB_PORT}`
// backend data.LOCATION_COORDS
const TRADER_JOES = '40.73342,-73.98788'
const COSTCO = '40.79564,-73.93088'

const children = []

function start(command, args, options) {
  const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], ...options })
  child.output = ''
  child.stdout.on('data', (d) => (child.output += d))
  child.stderr.on('data', (d) => (child.output += d))
  children.push(child)
}

async function waitForHealth(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${BASE_URL}/api/health`)).ok) return
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`Servers did not come up:\n${children.map((c) => c.output).join('\n')}`)
}

function startServers(sqlitePath) {
  const python = ['bin/python', 'Scripts/python.exe'].map((p) => path.join(ROOT, 'backend', '.venv', p)).find(existsSync)
  if (!python) throw new Error('backend/.venv not found; install the backend first (see README).')
  start(python, ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', String(API_PORT)], {
    cwd: path.join(ROOT, 'backend'),
    env: { ...process.env, DATABASE_URL: '', SQLITE_PATH: sqlitePath, SEED_DEMO_DATA: 'true' },
  })
  start(process.execPath, [path.join(ROOT, 'frontend', 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1', '--port', String(WEB_PORT), '--strictPort'], {
    cwd: path.join(ROOT, 'frontend'),
    env: { ...process.env, VITE_PROXY_TARGET: `http://127.0.0.1:${API_PORT}` },
  })
}

let browser

/** A fresh preview tab at a store. Tall enough that the frame isn't scaled down. */
async function open(geo) {
  const context = await browser.newContext({ viewport: { width: 520, height: 960 }, deviceScaleFactor: 2 })
  const page = await context.newPage()
  page.setDefaultTimeout(15_000)
  page.on('pageerror', (e) => console.error(`  page error: ${e.message}`))
  await page.goto(`${BASE_URL}/?preview&geo=${geo}`)
  // Only the device: no page background behind its rounded corners.
  await page.addStyleTag({ content: 'html, body, #root, #root > div { background: transparent !important; }' })
  return page
}

async function shoot(page, name, { settle = 1200 } = {}) {
  await page.waitForTimeout(settle) // let amounts finish rolling
  const box = await page.locator('.device-iphone-14').boundingBox()
  const pad = 4 // the side buttons stick out of the box
  await page.screenshot({
    path: path.join(OUT, `${name}.png`),
    omitBackground: true,
    clip: { x: box.x - pad, y: box.y - pad, width: box.width + pad * 2, height: box.height + pad * 2 },
  })
  console.log(`✔ ${name}.png`)
}

/** Every slide at three sizes. Returns the problems found; renders the 1920 × 1080 pass. */
async function checkDeck() {
  const problems = []
  const deck = `${BASE_URL}/presentation/index.html`
  for (const [width, height, reducedMotion] of [[1920, 1080, 'no-preference'], [1280, 720, 'no-preference'], [390, 844, 'reduce']]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion })
    page.on('response', (r) => r.status() >= 400 && problems.push(`${width}px: ${r.status()} ${r.url()}`))
    page.on('pageerror', (e) => problems.push(`${width}px: ${e.message}`))
    await page.goto(`${deck}#1`, { waitUntil: 'networkidle' })
    const n = await page.locator('.slide').count()
    for (let k = 1; k <= n; k++) {
      if (k > 1) await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(width === 1920 ? 1800 : 400) // the 1920 pass is rendered: let the coins and counter land
      const s = await page.evaluate(async () => {
        const active = document.querySelector('.slide.active')
        // CSS backgrounds (the card art) too. Vite answers a missing file with the app's page, so check the type.
        const backgrounds = [...active.querySelectorAll('*')].flatMap((e) => [...getComputedStyle(e).backgroundImage.matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1]))
        const notImages = []
        for (const url of new Set(backgrounds)) {
          const res = await fetch(url)
          if (!res.ok || !res.headers.get('content-type')?.startsWith('image/')) notImages.push(url)
        }
        return {
          hash: location.hash,
          count: document.getElementById('count').textContent,
          broken: [...active.querySelectorAll('img')].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute('src')).concat(notImages),
          overflow: [...active.querySelectorAll('h1, h2, p, li, img, .wallet, .node')].filter((e) => e.getBoundingClientRect().right > innerWidth + 1).map((e) => e.textContent.trim().slice(0, 40) || e.getAttribute('src')),
          sideways: document.documentElement.scrollWidth > innerWidth,
        }
      })
      const at = `${width}px slide ${k}`
      if (s.hash !== `#${k}` || s.count !== `${k} / ${n}`) problems.push(`${at}: arrow key went to ${s.hash} (${s.count})`)
      if (s.broken.length) problems.push(`${at}: images didn't load: ${s.broken.join(', ')}`)
      if (s.overflow.length) problems.push(`${at}: runs off the right edge: ${s.overflow.join(' | ')}`)
      if (s.sideways) problems.push(`${at}: page scrolls sideways`)
      if (width === 1920) await page.screenshot({ path: path.join(ARTIFACTS, `${String(k).padStart(2, '0')}.png`) })
    }
    if (reducedMotion === 'reduce') {
      await page.goto(`${deck}#9`)
      await page.reload({ waitUntil: 'networkidle' })
      const missed = await page.locator('#missed').textContent()
      if (missed !== '$69.75') problems.push(`reduced motion: the Rewards counter shows ${missed}, not $69.75`)
    }
    console.log(`${problems.length ? '✖' : '✔'} deck at ${width}×${height}, ${n} slides`)
    await page.close()
  }
  return problems
}

const tab = (page, name) => page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name, exact: true }).click()

const tmp = await mkdtemp(path.join(os.tmpdir(), 'cardmax-slides-'))
const report = { started_at: new Date().toISOString(), problems: [] }
try {
  await rm(ARTIFACTS, { recursive: true, force: true })
  await mkdir(ARTIFACTS, { recursive: true })
  startServers(path.join(tmp, 'slides.sqlite3'))
  await waitForHealth()
  browser = await chromium.launch({ channel: process.env.E2E_BROWSER_CHANNEL ?? 'chrome' })

  // Rewards first, while the seed is untouched: $69.75 left on the table.
  let page = await open(TRADER_JOES)
  await page.getByRole('button', { name: /^Amex Gold ending 4821, earns \$3\.06 here$/ }).waitFor()
  await shoot(page, 'wallet')
  await tab(page, 'Rewards')
  await page.getByText('$69.75', { exact: true }).waitFor()
  await shoot(page, 'rewards')
  await tab(page, 'Deals')
  await page.getByRole('tab', { name: /Clothing/ }).click()
  await page.getByRole('button', { name: /^Nike/ }).waitFor()
  await shoot(page, 'deals')
  await tab(page, 'Scan')
  await page.getByRole('button', { name: 'Try a sample cart' }).click()
  await page.getByText('$17.55', { exact: true }).waitFor()
  await shoot(page, 'scan')
  await page.context().close()

  page = await open(COSTCO)
  await page.getByRole('button', { name: /^Chase Freedom ending \d{4}, earns \$9\.37 here$/ }).waitFor()
  await shoot(page, 'costco')
  await page.context().close()

  page = await open(TRADER_JOES)
  await page.getByRole('button', { name: 'Side button, double-click to pay' }).dblclick()
  const pay = page.getByRole('button', { name: 'Hold to pay with Amex Gold' })
  await pay.hover()
  await page.waitForTimeout(700) // Pay finishes sliding in
  await page.mouse.down()
  await page.waitForTimeout(1600)
  await page.mouse.up()
  await page.getByText('+$3.06 back').waitFor()
  await shoot(page, 'paid', { settle: 150 }) // coins mid-fall
  await page.context().close()

  report.problems = await checkDeck()
} catch (error) {
  report.problems.push(error.message)
} finally {
  await browser?.close()
  for (const child of children) if (child.exitCode === null) child.kill()
  await rm(tmp, { recursive: true, force: true })
  report.finished_at = new Date().toISOString()
  report.passed = report.problems.length === 0
  await writeFile(path.join(ARTIFACTS, 'report.json'), JSON.stringify(report, null, 2) + '\n')
  if (report.problems.length) console.log(report.problems.map((p) => `  ${p}`).join('\n'))
  console.log(`\n${report.passed ? 'Deck checks passed' : 'Deck checks failed'} · renders in ${path.relative(process.cwd(), ARTIFACTS)}`)
  process.exitCode = report.passed ? 0 : 1
}
