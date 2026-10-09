// End-to-end check for the Scan and Deals screens.
//
// Starts the backend and the Vite dev server on spare ports, drives the app in
// Chrome at iPhone size, and writes screenshots plus report.json to
// e2e/artifacts/. Exits non-zero if any check fails.
//
//   cd e2e && npm install && npm run scan-deals
//
// Needs backend/.venv and frontend/node_modules (see README). With
// GEMINI_API_KEY in backend/.env the upload checks expect Gemini's reading of
// the screenshots in backend/tests/fixtures/; without a key they expect the
// labeled sample cart. Set E2E_BROWSER_CHANNEL to use a browser other than the
// installed Google Chrome (e.g. "chromium" after `npx playwright install`).

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'e2e', 'artifacts')
const FIXTURES = path.join(ROOT, 'backend', 'tests', 'fixtures')
const API_PORT = 8077
const WEB_PORT = 5177
const BASE_URL = `http://127.0.0.1:${WEB_PORT}`
const PHONE = { width: 390, height: 844 }

// ---------------------------------------------------------------- servers

const children = []

function start(command, args, options) {
  const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], ...options })
  child.output = ''
  child.stdout.on('data', (d) => (child.output += d))
  child.stderr.on('data', (d) => (child.output += d))
  children.push(child)
  return child
}

function stopServers() {
  for (const child of children) if (child.exitCode === null) child.kill()
}

async function waitForHealth(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`)
      if (res.ok) return res.json()
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`Servers did not come up:\n${children.map((c) => c.output).join('\n')}`)
}

function startServers() {
  const python = ['bin/python', 'Scripts/python.exe'].map((p) => path.join(ROOT, 'backend', '.venv', p)).find(existsSync)
  if (!python) throw new Error('backend/.venv not found; install the backend first (see README).')
  start(python, ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', String(API_PORT)], { cwd: path.join(ROOT, 'backend') })
  start(process.execPath, [path.join(ROOT, 'frontend', 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1', '--port', String(WEB_PORT), '--strictPort'], {
    cwd: path.join(ROOT, 'frontend'),
    env: { ...process.env, VITE_PROXY_TARGET: `http://127.0.0.1:${API_PORT}` },
  })
}

// ---------------------------------------------------------------- checks

const report = { started_at: new Date().toISOString(), checks: [], screenshots: [] }

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function screenshot(page, name) {
  // The shell scrolls inside <main>, so grow the viewport to fit the content.
  const height = await page.evaluate(() => {
    const main = document.querySelector('main')
    return main.scrollHeight + (window.innerHeight - main.clientHeight)
  })
  await page.setViewportSize({ width: PHONE.width, height: Math.max(PHONE.height, Math.ceil(height)) })
  await page.waitForTimeout(200)
  const file = `${name}.png`
  await page.screenshot({ path: path.join(OUT, file) })
  await page.setViewportSize(PHONE)
  report.screenshots.push(file)
}

async function check(page, name, fn) {
  const started = Date.now()
  try {
    const detail = await fn()
    report.checks.push({ name, ok: true, ms: Date.now() - started, ...(detail ? { detail } : {}) })
    console.log(`✔ ${name}`)
  } catch (error) {
    report.checks.push({ name, ok: false, ms: Date.now() - started, error: error.message })
    console.log(`✖ ${name}\n    ${error.message.split('\n')[0]}`)
    await screenshot(page, `FAILED-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`).catch(() => {})
  }
}

async function noHorizontalScroll(page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }))
  assert(scrollWidth <= innerWidth, `page scrolls sideways: ${scrollWidth}px content in a ${innerWidth}px viewport`)
}

// Waits for the stack's last layer, then for its entrance animation to settle.
async function stackShown(page, timeout = 15_000) {
  const total = page.getByRole('region', { name: 'Total value back' })
  await total.waitFor({ timeout })
  await page.waitForTimeout(900)
  return total
}

async function scanAnother(page) {
  await page.getByRole('button', { name: 'Scan another cart' }).click()
  await page.getByText('Upload a cart screenshot').waitFor()
}

// A layer's text on one line, minus its step number and heading, for report.json.
async function layerText(page, name) {
  const lines = (await page.getByRole('region', { name }).innerText()).split('\n').filter(Boolean)
  return lines.slice(2).join(' · ')
}

async function upload(page, file) {
  await page.locator('input[type=file]').setInputFiles(typeof file === 'string' ? path.join(FIXTURES, file) : file)
}

// ---------------------------------------------------------------- scenario

async function run(page, gemini) {
  const nav = page.getByRole('navigation', { name: 'Main' })

  await check(page, 'Deals lists today’s stacks by category', async () => {
    await nav.getByRole('button', { name: 'Deals' }).click()
    await page.getByRole('tab', { name: /Meals/, selected: true }).waitFor()
    const meals = await page.getByRole('tabpanel').getByRole('button').count()
    assert(meals > 0, 'no meal deals')
    await page.getByText('TOP STACK').first().waitFor()
    await page.getByRole('tab', { name: /Clothing/ }).click()
    const nike = page.getByRole('button', { name: /^Nike:/ })
    await nike.waitFor()
    const text = await nike.innerText()
    for (const part of ['SAVE15', 'Apple Card', '17.55%']) assert(text.includes(part), `Nike deal is missing "${part}": ${text}`)
    await noHorizontalScroll(page)
    await screenshot(page, '01-deals-clothing')
    return { meal_deals: meals }
  })

  await check(page, 'Arrow keys move between deal categories', async () => {
    await page.getByRole('tab', { name: /Clothing/ }).focus()
    await page.keyboard.press('ArrowRight')
    await page.getByRole('tab', { name: /Travel/, selected: true }).waitFor()
    await page.keyboard.press('ArrowLeft')
    await page.getByRole('tab', { name: /Clothing/, selected: true }).waitFor()
  })

  await check(page, 'Tapping a deal opens the same stack in Scan', async () => {
    await page.getByRole('button', { name: /^Nike:/ }).click()
    const total = await stackShown(page)
    assert((await nav.getByRole('button', { name: 'Scan' }).getAttribute('aria-current')) === 'page', 'Scan tab is not active')
    await page.getByRole('heading', { name: 'Nike', level: 2 }).waitFor()
    const coupon = await page.getByRole('region', { name: 'Coupon' }).innerText()
    const card = await page.getByRole('region', { name: 'Card' }).innerText()
    const totalText = await total.innerText()
    assert(coupon.includes('SAVE15') && coupon.includes('−$15.00'), `coupon layer: ${coupon}`)
    assert(card.includes('Apple Card') && card.includes('+$2.55'), `card layer: ${card}`)
    assert(totalText.includes('$17.55') && totalText.includes('17.55% back on $100.00'), `total layer: ${totalText}`)
    await noHorizontalScroll(page)
    await screenshot(page, '02-scan-from-deal')
  })

  await check(page, 'Sample cart shows items and the documented Nike stack', async () => {
    await scanAnother(page)
    await page.getByRole('button', { name: 'Try the sample cart' }).click()
    const total = await stackShown(page)
    await page.getByText('Sample cart', { exact: true }).waitFor()
    await page.getByText('Nike Revolution 7 Road Running Shoes').waitFor()
    assert((await total.innerText()).includes('$17.55'), 'sample total is not $17.55')
    await screenshot(page, '03-scan-sample-cart')
  })

  await check(page, 'Uploaded screenshot of an unknown store is read and gets a simulated coupon', async () => {
    await scanAnother(page)
    await upload(page, 'cart_unknown_store.png')
    await stackShown(page, 45_000)
    if (!gemini) {
      await page.getByText('Sample cart', { exact: true }).waitFor()
      return { gemini: false }
    }
    await page.getByText('Read by Gemini').waitFor()
    await page.getByRole('heading', { name: 'Greenpoint Cycle Works', level: 2 }).waitFor()
    await page.getByText('New store', { exact: true }).waitFor()
    for (const item of ['Commuter Helmet MIPS', 'U-Lock with Cable', 'Inner Tube 700x32c', '$131.49', '$9.95']) {
      await page.getByText(item, { exact: false }).first().waitFor()
    }
    const coupon = await layerText(page, 'Coupon')
    assert(/AI-generated|Simulated coupon/.test(coupon), `coupon is not labeled as simulated: ${coupon}`)
    await screenshot(page, '04-scan-upload-unknown-store')
    return { coupon, card: await layerText(page, 'Card') }
  })

  await check(page, 'Uploaded screenshot of a known store uses its demo coupon', async () => {
    await scanAnother(page)
    await upload(page, 'cart_lululemon.png')
    await stackShown(page, 45_000)
    if (!gemini) return { gemini: false }
    await page.getByRole('heading', { name: 'Lululemon', level: 2 }).waitFor()
    const coupon = await page.getByRole('region', { name: 'Coupon' }).innerText()
    assert(coupon.includes('LULU20') && coupon.includes('−$20.00'), `coupon layer: ${coupon}`)
    await screenshot(page, '05-scan-upload-known-store')
  })

  await check(page, 'A screenshot that is not a cart falls back to the sample with a warning', async () => {
    await scanAnother(page)
    await upload(page, 'not_a_cart.png')
    await stackShown(page, 45_000)
    await page.getByText('Sample cart', { exact: true }).waitFor()
    const warning = await page.getByRole('status').filter({ hasText: 'Showing a sample cart instead.' }).innerText()
    await screenshot(page, '06-scan-not-a-cart')
    return { warning }
  })

  await check(page, 'A file that is not an image is rejected with a clear message', async () => {
    await scanAnother(page)
    await upload(page, { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not a screenshot') })
    await page.getByRole('alert').filter({ hasText: 'Upload a PNG, JPEG, or WEBP screenshot.' }).waitFor()
    await page.getByText('Upload a cart screenshot').waitFor()
  })

  await check(page, 'Manual entry validates, then stacks a typed unknown store', async () => {
    await page.getByRole('button', { name: 'Find the best stack' }).click()
    await page.getByRole('alert').filter({ hasText: 'Enter a store name.' }).waitFor()
    await page.getByLabel('Store', { exact: true }).fill("Joe's Pizza")
    await page.getByLabel('Subtotal', { exact: true }).fill('30')
    await page.getByRole('button', { name: 'Find the best stack' }).click()
    await stackShown(page)
    await page.getByRole('heading', { name: "Joe's Pizza", level: 2 }).waitFor()
    const coupon = await layerText(page, 'Coupon')
    assert(/AI-generated|Simulated coupon/.test(coupon), `coupon is not labeled as simulated: ${coupon}`)
    await screenshot(page, '07-scan-manual-unknown-store')
    return { coupon, card: await layerText(page, 'Card') }
  })

  await check(page, 'Card-used picker logs the purchase (or reports the pending endpoint)', async () => {
    await page.locator('label', { hasText: 'Everyday Debit' }).click()
    await page.getByRole('button', { name: 'Log purchase' }).click()
    const logged = page.getByText(/^Logged\./)
    const pending = page.getByRole('alert').filter({ hasText: 'waiting on another workstream' })
    await logged.or(pending).first().waitFor()
    const outcome = (await logged.count()) > 0 ? await logged.innerText() : 'POST /api/transactions answered 501 (persistence not merged yet)'
    await screenshot(page, '08-scan-log-purchase')
    return { outcome }
  })
}

// ---------------------------------------------------------------- main

let browser
try {
  await rm(OUT, { recursive: true, force: true })
  await mkdir(OUT, { recursive: true })
  startServers()
  const health = await waitForHealth()
  report.backend = health
  browser = await chromium.launch({ channel: process.env.E2E_BROWSER_CHANNEL ?? 'chrome' })
  report.browser = `${browser.browserType().name()} ${browser.version()}`
  const context = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  page.setDefaultTimeout(15_000)
  const consoleErrors = []
  page.on('pageerror', (e) => consoleErrors.push(e.message))
  page.on('console', (m) => {
    // The browser logs every non-2xx fetch; the 415 and 501 checks above expect those.
    if (m.type() === 'error' && !/status of (415|501)/.test(m.text())) consoleErrors.push(m.text())
  })
  await page.goto(BASE_URL)
  await run(page, health.gemini_configured)
  await check(page, 'No unexpected console errors', async () => assert(consoleErrors.length === 0, consoleErrors.join('\n')))
} finally {
  await browser?.close()
  stopServers()
  report.finished_at = new Date().toISOString()
  report.passed = report.checks.length > 0 && report.checks.every((c) => c.ok)
  await writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n')
  console.log(`\n${report.checks.filter((c) => c.ok).length}/${report.checks.length} checks passed · artifacts in ${path.relative(process.cwd(), OUT) || OUT}`)
  process.exitCode = report.passed ? 0 : 1
}
