// End-to-end check for the whole app: Wallet, Pay, Scan, Deals, and Rewards on
// a phone, the laptop layout, and the iPhone preview.
//
// Starts the backend on a fresh SQLite database (so the seeded numbers are
// known) and the Vite dev server on spare ports, drives the app in Chrome, and
// writes screenshots plus report.json to e2e/artifacts/app/. Exits non-zero if
// any check fails.
//
//   cd e2e && npm install && npm test
//
// Needs backend/.venv and frontend/node_modules (see README). With
// GEMINI_API_KEY in backend/.env the upload checks expect Gemini's reading of
// the screenshots in backend/tests/fixtures/; without a key they expect the
// sample cart. Set E2E_BROWSER_CHANNEL to use a browser other than the
// installed Google Chrome (e.g. "chromium" after `npx playwright install`).

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'e2e', 'artifacts', 'app')
const FIXTURES = path.join(ROOT, 'backend', 'tests', 'fixtures')
const API_PORT = 8077
const WEB_PORT = 5177
const BASE_URL = `http://127.0.0.1:${WEB_PORT}`
const API_URL = `http://127.0.0.1:${API_PORT}`
const PHONE = { width: 390, height: 844 }
const LAPTOP = { width: 1280, height: 860 }
// Trader Joe's, Union Square (backend data.LOCATION_COORDS).
const AT_TRADER_JOES = '?geo=40.73342,-73.98788'

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

function startServers(sqlitePath) {
  const python = ['bin/python', 'Scripts/python.exe'].map((p) => path.join(ROOT, 'backend', '.venv', p)).find(existsSync)
  if (!python) throw new Error('backend/.venv not found; install the backend first (see README).')
  // A fresh SQLite file: the run starts from the documented seed and never touches your demo database.
  start(python, ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', String(API_PORT)], {
    cwd: path.join(ROOT, 'backend'),
    env: { ...process.env, DATABASE_URL: '', SQLITE_PATH: sqlitePath, SEED_DEMO_DATA: 'true' },
  })
  start(process.execPath, [path.join(ROOT, 'frontend', 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1', '--port', String(WEB_PORT), '--strictPort'], {
    cwd: path.join(ROOT, 'frontend'),
    env: { ...process.env, VITE_PROXY_TARGET: API_URL },
  })
}

/** What the backend has stored, read straight from the API (not through the UI). */
async function stored() {
  const [missed, wallet] = await Promise.all([fetch(`${API_URL}/api/missed?days=30&limit=200`).then((r) => r.json()), fetch(`${API_URL}/api/wallet`).then((r) => r.json())])
  return { count: missed.transaction_count, missedCents: missed.total_missed_cents, recent: missed.recent, cards: wallet.cards }
}

async function until(fn, what, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const value = await fn()
    if (value) return value
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`)
    await new Promise((r) => setTimeout(r, 250))
  }
}

// ---------------------------------------------------------------- checks

const report = { started_at: new Date().toISOString(), checks: [], screenshots: [] }

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

/** Full-height screenshot: the app scrolls inside <main>, so grow the viewport to fit it. */
async function screenshot(page, name, { full = true } = {}) {
  const viewport = page.viewportSize()
  if (full) {
    const height = await page.evaluate(() => {
      const main = document.querySelector('main')
      return main ? main.scrollHeight + (window.innerHeight - main.clientHeight) : window.innerHeight
    })
    await page.setViewportSize({ width: viewport.width, height: Math.max(viewport.height, Math.ceil(height)) })
    await page.waitForTimeout(250)
  }
  const file = `${name}.png`
  await page.screenshot({ path: path.join(OUT, file) })
  if (full) await page.setViewportSize(viewport)
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
    await screenshot(page, `FAILED-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, { full: false }).catch(() => {})
  }
}

async function noHorizontalScroll(page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }))
  assert(scrollWidth <= innerWidth, `page scrolls sideways: ${scrollWidth}px content in a ${innerWidth}px viewport`)
}

/** A card in the stack. Only its top strip is uncovered, so tap there. */
async function tapCard(page, name) {
  await page.getByRole('button', { name: new RegExp(`^${name} ending`) }).click({ position: { x: 60, y: 20 } })
}

/** Press and hold the pay button for `ms`. hover() waits for Pay to finish sliding in. */
async function hold(page, ms) {
  await page.getByRole('button', { name: /^Hold to pay with/ }).hover()
  await page.mouse.down()
  await page.waitForTimeout(ms)
  await page.mouse.up()
}

const upload = (page, file) => page.locator('input[type=file]').setInputFiles(typeof file === 'string' ? path.join(FIXTURES, file) : file)
const resultShown = (page, timeout = 15_000) => page.getByText('You get back').waitFor({ timeout })

// ---------------------------------------------------------------- phone

async function phone(page, gemini) {
  const nav = page.getByRole('navigation', { name: 'Main' })
  const dialog = page.getByRole('dialog')

  await check(page, 'Wallet finds Trader Joe’s from the location and ranks every card', async () => {
    await page.getByRole('button', { name: /^Amex Gold ending 4821, earns \$3\.06 here$/ }).waitFor()
    await page.getByRole('button', { name: /^Everyday Debit ending \d{4}, earns nothing here$/ }).waitFor()
    await noHorizontalScroll(page)
    await screenshot(page, '01-wallet')
  })

  await check(page, 'Opening a card shows what it earns here and its purchases', async () => {
    await tapCard(page, 'Amex Gold')
    await page.getByRole('button', { name: 'Back to Wallet' }).waitFor()
    await page.getByText('At Trader Joe’s').or(page.getByText("At Trader Joe's")).first().waitFor()
    await page.getByText('Best', { exact: true }).waitFor()
    await page.getByRole('heading', { name: 'Latest Transactions' }).waitFor()
    await noHorizontalScroll(page)
    await screenshot(page, '02-card')
  })

  await check(page, 'Why sheet explains the pick', async () => {
    await page.getByRole('button', { name: /At Trader Joe/ }).click()
    await dialog.getByText('Why Amex Gold wins').waitFor()
    await dialog.getByText('Every card, here').waitFor()
    await page.waitForTimeout(500)
    await screenshot(page, '03-why', { full: false })
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden' })
  })

  await check(page, 'Card details lists its rates and where it wins (GET /api/wallet/{id}/benefits)', async () => {
    await page.getByRole('button', { name: 'More' }).click()
    await page.getByRole('menuitem', { name: 'Card details' }).click()
    await dialog.getByText('Your best card at').waitFor()
    await dialog.getByText('Trader Joe’s').or(dialog.getByText("Trader Joe's")).first().waitFor()
    await dialog.getByText('Not accepted at').waitFor()
    await page.waitForTimeout(500)
    await screenshot(page, '04-card-details', { full: false })
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden' })
    await page.getByRole('button', { name: 'Back to Wallet' }).click()
  })

  await check(page, 'Holding to pay with the best card logs one purchase', async () => {
    const before = await stored()
    await page.getByRole('button', { name: 'Pay', exact: true }).click()
    await page.getByRole('button', { name: 'Hold to pay with Amex Gold' }).waitFor()
    await page.getByText('Best card here').waitFor()
    await screenshot(page, '05-pay', { full: false })
    await hold(page, 1600)
    await page.getByText('+$3.06 back').waitFor()
    await screenshot(page, '06-paid', { full: false })
    const after = await until(async () => {
      const s = await stored()
      return s.count === before.count + 1 && s
    }, 'the purchase to be saved')
    const tx = after.recent.find((t) => !before.recent.some((b) => b.id === t.id))
    assert(tx.merchant_id === 'trader-joes' && tx.card_used_id === 'amex-gold' && tx.amount_cents === 4250 && tx.earned_cents === 306, `saved purchase: ${JSON.stringify(tx)}`)
    // Pay steps out of the way by itself, like Apple Pay.
    await page.getByRole('button', { name: /^Hold to pay with/ }).waitFor({ state: 'hidden', timeout: 5000 })
    return { saved: { merchant: tx.merchant_name, card: tx.card_used_id, amount_cents: tx.amount_cents, earned_cents: tx.earned_cents } }
  })

  await check(page, 'The new purchase shows in the card’s history', async () => {
    await tapCard(page, 'Amex Gold')
    const row = page.getByRole('heading', { name: 'Latest Transactions' }).locator('xpath=../..').getByText('Today · In store')
    await row.first().waitFor()
    await page.getByRole('button', { name: 'Back to Wallet' }).click()
  })

  await check(page, 'Letting go early cancels the payment', async () => {
    const before = await stored()
    await page.getByRole('button', { name: 'Pay', exact: true }).click()
    await hold(page, 400)
    await page.getByText('Hold to pay', { exact: true }).waitFor()
    await page.waitForTimeout(1500)
    const after = await stored()
    assert(after.count === before.count, `a cancelled hold saved a purchase (${before.count} → ${after.count})`)
  })

  await check(page, 'A typed checkout total re-ranks the cards', async () => {
    await page.getByRole('button', { name: 'Checkout total $42.50. Change it' }).click()
    const input = page.getByLabel('Checkout total in dollars')
    await input.fill('100')
    await input.press('Enter')
    await page.getByRole('button', { name: 'Checkout total $100.00. Change it' }).waitFor()
    await page.getByText('$7.20', { exact: true }).waitFor()
    await page.waitForTimeout(1000) // let the amount finish rolling to its new value
    await screenshot(page, '07-pay-typed-total', { full: false })
    await page.getByRole('button', { name: 'Close' }).click()
    await page.getByRole('button', { name: /^Amex Gold ending 4821, earns \$7\.20 here$/ }).waitFor()
  })

  await check(page, 'Leaving the store keeps you out of it', async () => {
    await page.getByRole('button', { name: 'Leave store' }).click()
    await page.getByText('Where are you shopping?').waitFor()
    await page.waitForTimeout(1500)
    assert(await page.getByText('Where are you shopping?').isVisible(), 'the location check put the store back')
    await page.getByRole('button', { name: /^Amex Gold ending 4821$/ }).waitFor()
  })

  await check(page, 'Costco: cards it doesn’t take are marked, and a Visa card wins', async () => {
    await page.getByText('Where are you shopping?').click()
    await dialog.getByRole('button', { name: /^Costco/ }).click()
    await page.getByRole('button', { name: /^Amex Gold ending 4821, not accepted here$/ }).waitFor()
    await page.getByRole('button', { name: /^Chase Freedom ending \d{4}, earns \$9\.37 here$/ }).waitFor()
    await noHorizontalScroll(page)
    await screenshot(page, '08-wallet-costco')
  })

  await check(page, 'Adding a card saves it, and removing it deletes it', async () => {
    await page.getByRole('button', { name: 'Add card' }).click()
    await dialog.getByRole('button', { name: /^Apple Card/ }).click()
    await dialog.getByLabel('Last four digits').fill('0007')
    await screenshot(page, '09-add-card', { full: false })
    await dialog.getByRole('button', { name: 'Add card' }).click()
    await dialog.waitFor({ state: 'hidden' })
    const added = await until(async () => (await stored()).cards.find((c) => c.last4 === '0007'), 'the new card')
    await page.getByRole('button', { name: 'Back to Wallet' }).waitFor()
    await page.getByRole('button', { name: 'More' }).click()
    await page.getByRole('menuitem', { name: 'Remove card' }).click()
    await dialog.getByRole('button', { name: 'Remove card' }).click()
    await dialog.waitFor({ state: 'hidden' })
    await until(async () => !(await stored()).cards.some((c) => c.id === added.id), 'the card to be removed')
    await page.getByRole('heading', { name: 'Wallet' }).waitFor()
    return { added: `${added.name} ${added.last4}` }
  })

  await check(page, 'Scan: the sample cart stacks SAVE15 with Apple Card for $17.55 back', async () => {
    await nav.getByRole('button', { name: 'Scan' }).click()
    await page.getByRole('button', { name: 'Try a sample cart' }).click()
    await resultShown(page)
    await page.getByText('Sample cart', { exact: true }).waitFor()
    await page.getByText('$17.55', { exact: true }).waitFor()
    await page.getByText('SAVE15').waitFor()
    await page.getByText('3% at Nike on $85.00').waitFor()
    await page.getByRole('button', { name: /^3 items/ }).click()
    await page.getByText('Nike Revolution 7 Road Running Shoes').waitFor()
    await noHorizontalScroll(page)
    await screenshot(page, '10-scan-sample')
  })

  await check(page, 'Logging a different card says what it missed', async () => {
    const before = await stored()
    await page.getByRole('button', { name: 'I used a different card' }).click()
    await page.getByRole('radio', { name: /Everyday Debit/ }).click()
    await page.getByRole('button', { name: 'Log with Everyday Debit' }).click()
    await page.getByText('Logged · $2.55 missed').waitFor()
    const after = await until(async () => {
      const s = await stored()
      return s.count === before.count + 1 && s
    }, 'the purchase to be saved')
    assert(after.missedCents === before.missedCents + 255, `missed went ${before.missedCents} → ${after.missedCents}`)
    await screenshot(page, '11-scan-logged')
  })

  await check(page, 'Rewards adds it up from GET /api/missed', async () => {
    const s = await stored()
    await page.getByRole('button', { name: 'See Rewards' }).click()
    assert((await nav.getByRole('button', { name: 'Rewards' }).getAttribute('aria-current')) === 'page', 'Rewards tab is not active')
    await page.getByText('captured').waitFor()
    const missed = `$${(s.missedCents / 100).toFixed(2)}`
    await page.getByText(missed, { exact: true }).waitFor()
    await page.getByText('Used Everyday Debit · best Apple Card').first().waitFor()
    await page.waitForTimeout(1200)
    await noHorizontalScroll(page)
    await screenshot(page, '12-rewards')
    return { left_on_the_table: missed, purchases: s.count }
  })

  await check(page, 'Typing a store checks the form, then stacks it', async () => {
    await nav.getByRole('button', { name: 'Scan' }).click()
    await page.getByRole('button', { name: 'Find the best stack' }).click()
    await page.getByRole('alert').filter({ hasText: 'Enter a store name.' }).waitFor()
    await page.getByLabel('Store').fill("Joe's Pizza")
    await page.getByLabel('Subtotal').fill('30')
    await page.getByRole('button', { name: 'Find the best stack' }).click()
    await resultShown(page)
    await page.getByText("Joe's Pizza").first().waitFor()
    await page.getByText('New store').waitFor()
    await screenshot(page, '13-scan-typed-store')
  })

  await check(page, 'Uploaded screenshot of an unknown store is read', async () => {
    await page.getByRole('button', { name: 'New scan' }).click()
    await upload(page, 'cart_unknown_store.png')
    await resultShown(page, 45_000)
    if (!gemini) {
      await page.getByText('Sample cart', { exact: true }).waitFor()
      return { gemini: false }
    }
    await page.getByText('From your screenshot').waitFor()
    await page.getByText('Greenpoint Cycle Works').first().waitFor()
    await page.getByRole('button', { name: /items/ }).click()
    for (const item of ['Commuter Helmet MIPS', 'U-Lock with Cable']) await page.getByText(item, { exact: false }).first().waitFor()
    await screenshot(page, '14-scan-upload-unknown-store')
  })

  await check(page, 'Uploaded screenshot of a known store uses its coupon', async () => {
    await page.getByRole('button', { name: 'New scan' }).click()
    await upload(page, 'cart_lululemon.png')
    await resultShown(page, 45_000)
    if (!gemini) return { gemini: false }
    await page.getByText('Lululemon').first().waitFor()
    await page.getByText('LULU20').waitFor()
    await page.getByText('−$20.00').waitFor()
    await screenshot(page, '15-scan-upload-known-store')
  })

  await check(page, 'A screenshot that isn’t a cart falls back to the sample, and says why', async () => {
    await page.getByRole('button', { name: 'New scan' }).click()
    await upload(page, 'not_a_cart.png')
    await resultShown(page, 45_000)
    await page.getByText('Sample cart', { exact: true }).waitFor()
    await page.getByText(/Showing a sample cart instead\./).waitFor()
    await screenshot(page, '16-scan-not-a-cart')
  })

  await check(page, 'A file that isn’t an image is turned away with a clear message', async () => {
    await page.getByRole('button', { name: 'New scan' }).click()
    await upload(page, { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not a screenshot') })
    await page.getByRole('alert').filter({ hasText: 'Upload a PNG, JPEG, or WEBP screenshot.' }).waitFor()
    await page.getByRole('button', { name: 'New scan' }).click()
    await page.getByRole('button', { name: 'Try a sample cart' }).waitFor()
  })

  await check(page, 'Deals lists today’s stacks; arrow keys switch categories', async () => {
    await nav.getByRole('button', { name: 'Deals' }).click()
    await page.getByRole('tab', { name: /Meals/, selected: true }).waitFor()
    await page.getByText('Top stack today').waitFor()
    await page.getByRole('tab', { name: /Clothing/ }).click()
    await page.getByRole('button', { name: /^Nike/ }).waitFor()
    await page.getByRole('tab', { name: /Clothing/ }).focus()
    await page.keyboard.press('ArrowRight')
    await page.getByRole('tab', { name: /Travel/, selected: true }).waitFor()
    await page.keyboard.press('ArrowLeft')
    await page.getByRole('tab', { name: /Clothing/, selected: true }).waitFor()
    await page.waitForTimeout(500)
    await noHorizontalScroll(page)
    await screenshot(page, '17-deals-clothing')
  })

  await check(page, 'A deal opens the same stack in Scan', async () => {
    await page.getByRole('button', { name: /^Nike/ }).click()
    await dialog.getByText('SAVE15').waitFor()
    await page.waitForTimeout(500)
    await screenshot(page, '18-deal-sheet', { full: false })
    await dialog.getByRole('button', { name: 'Open in Scan' }).click()
    await resultShown(page)
    assert((await nav.getByRole('button', { name: 'Scan' }).getAttribute('aria-current')) === 'page', 'Scan tab is not active')
    await page.getByText('$17.55', { exact: true }).waitFor()
    await screenshot(page, '19-scan-from-deal')
  })
}

// ---------------------------------------------------------------- laptop and preview

async function laptop(page) {
  const nav = page.getByRole('navigation', { name: 'Main' })

  await check(page, 'Laptop: a sidebar, and the best card open beside the stack', async () => {
    await page.getByRole('button', { name: /^Amex Gold ending 4821, earns \$3\.06 here$/ }).waitFor()
    await page.getByRole('heading', { name: 'Amex Gold', level: 2 }).waitFor()
    await page.getByRole('heading', { name: 'Latest Transactions' }).waitFor()
    for (const tab of ['Wallet', 'Scan', 'Deals', 'Rewards', 'Pay']) await nav.getByRole('button', { name: tab, exact: true }).waitFor()
    await page.waitForTimeout(800)
    await screenshot(page, '20-laptop-wallet', { full: false })
  })

  await check(page, 'Laptop: Pay opens as a panel in the middle', async () => {
    await nav.getByRole('button', { name: 'Pay', exact: true }).click()
    await page.getByRole('button', { name: 'Hold to pay with Amex Gold' }).waitFor()
    await page.waitForTimeout(700)
    await screenshot(page, '21-laptop-pay', { full: false })
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: /^Hold to pay with/ }).waitFor({ state: 'hidden' })
  })

  await check(page, 'Laptop: every tab lays out wide', async () => {
    await nav.getByRole('button', { name: 'Scan' }).click()
    await page.getByRole('button', { name: 'Try a sample cart' }).click()
    await resultShown(page)
    await page.waitForTimeout(900)
    await screenshot(page, '22-laptop-scan', { full: false })
    await nav.getByRole('button', { name: 'Deals' }).click()
    await page.getByText('Top stack today').waitFor()
    await page.waitForTimeout(700)
    await screenshot(page, '23-laptop-deals', { full: false })
    await nav.getByRole('button', { name: 'Rewards' }).click()
    await page.getByText('captured').waitFor()
    await page.waitForTimeout(1400)
    await noHorizontalScroll(page)
    await screenshot(page, '24-laptop-rewards', { full: false })
  })
}

async function preview(page) {
  await check(page, '?preview shows the phone app in an iPhone frame; the side button opens Pay', async () => {
    await page.getByRole('button', { name: /^Amex Gold ending 4821, earns \$3\.06 here$/ }).waitFor()
    // Inside the frame it's the phone layout, whatever the window's width.
    await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Rewards' }).waitFor()
    assert(!(await page.getByRole('heading', { name: 'Latest Transactions' }).isVisible()), 'the laptop layout is showing inside the frame')
    await page.waitForTimeout(800)
    await screenshot(page, '25-preview', { full: false })
    await page.getByRole('button', { name: 'Side button, double-click to pay' }).dblclick()
    await page.getByRole('button', { name: 'Hold to pay with Amex Gold' }).waitFor()
    await page.waitForTimeout(700)
    await screenshot(page, '26-preview-pay', { full: false })
  })
}

// ---------------------------------------------------------------- main

function watchConsole(page, errors) {
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    // The browser logs every non-2xx fetch; the not-an-image check expects a 415.
    if (m.type() === 'error' && !/status of 415/.test(m.text())) errors.push(m.text())
  })
}

let browser
const tmp = await mkdtemp(path.join(os.tmpdir(), 'cardmax-e2e-'))
try {
  await rm(OUT, { recursive: true, force: true })
  await mkdir(OUT, { recursive: true })
  startServers(path.join(tmp, 'e2e.sqlite3'))
  const health = await waitForHealth()
  report.backend = health
  browser = await chromium.launch({ channel: process.env.E2E_BROWSER_CHANNEL ?? 'chrome' })
  report.browser = `${browser.browserType().name()} ${browser.version()}`
  const errors = []

  const phoneContext = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const phonePage = await phoneContext.newPage()
  phonePage.setDefaultTimeout(15_000)
  watchConsole(phonePage, errors)
  await phonePage.goto(`${BASE_URL}/${AT_TRADER_JOES}`)
  await phone(phonePage, health.gemini_configured)

  const laptopPage = await browser.newPage({ viewport: LAPTOP })
  laptopPage.setDefaultTimeout(15_000)
  watchConsole(laptopPage, errors)
  await laptopPage.goto(`${BASE_URL}/${AT_TRADER_JOES}`)
  await laptop(laptopPage)

  const previewPage = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  previewPage.setDefaultTimeout(15_000)
  watchConsole(previewPage, errors)
  await previewPage.goto(`${BASE_URL}/${AT_TRADER_JOES}&preview`)
  await preview(previewPage)

  await check(phonePage, 'No unexpected console errors', async () => assert(errors.length === 0, errors.join('\n')))
} finally {
  await browser?.close()
  stopServers()
  await rm(tmp, { recursive: true, force: true })
  report.finished_at = new Date().toISOString()
  report.passed = report.checks.length > 0 && report.checks.every((c) => c.ok)
  await writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n')
  console.log(`\n${report.checks.filter((c) => c.ok).length}/${report.checks.length} checks passed · artifacts in ${path.relative(process.cwd(), OUT) || OUT}`)
  process.exitCode = report.passed ? 0 : 1
}
