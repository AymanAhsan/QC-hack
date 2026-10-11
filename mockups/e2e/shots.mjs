// Drives every design through the same demo path at iPhone size and writes
// screenshots plus report.json to mockups/artifacts/. Fails on console errors
// or missing contract elements.
//
//   npm run dev            (in another terminal, port 5190)
//   npm run shots          all designs
//   npm run shots -- 1 3   only designs 1 and 3
//   PHONE=1 npm run shots -- 1   at iPhone size (390×844), where the app fills the screen; writes <id>-phone/
//
// Contract every design follows so one script can drive them all:
//   nav[aria-label="Main"] with buttons Wallet, Scan, Deals, Rewards
//   a hold button whose accessible name starts "Hold to pay", on Wallet or on a pay
//   screen opened by double-clicking the frame's side button (desktop) or a "Pay" button
//   a "Leave store" button while at a store
//   a "Try a sample cart" button on Scan

import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'artifacts')
const BASE = process.env.MOCKUPS_URL ?? 'http://localhost:5190'
const DESIGNS = ['native', 'arcade', 'sticker', 'loadout', 'ledger']
const PHONE = process.env.PHONE === '1'
const only = process.argv.slice(2).map(Number).filter(Boolean)
const targets = (only.length ? only : DESIGNS.map((_, i) => i + 1)).map((n) => ({ n, id: DESIGNS[n - 1] }))

const browser = await chromium.launch({ channel: process.env.E2E_BROWSER_CHANNEL ?? 'chrome' })
const report = { base: BASE, at: new Date().toISOString(), designs: {} }
let failed = false

for (const { n, id } of targets) {
  const dir = path.join(OUT, PHONE ? `${id}-phone` : id)
  await rm(dir, { recursive: true, force: true })
  await mkdir(dir, { recursive: true })
  const ctx = await browser.newContext({ viewport: PHONE ? { width: 390, height: 844 } : { width: 1280, height: 1000 }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  const errors = []
  const missing = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))

  const device = page.locator('.device')
  const main = page.locator('.device main').first()
  let i = 0
  const shot = async (name, wait = 700) => {
    await page.waitForTimeout(wait)
    i += 1
    await device.screenshot({ path: path.join(dir, `${String(i).padStart(2, '0')}-${name}.png`) })
  }
  const scroll = async (to) => main.evaluate((el, t) => el.scrollTo({ top: t === 'end' ? el.scrollHeight : t }), to)
  const tab = async (name) => {
    const b = page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name, exact: true })
    if (!(await b.count())) return missing.push(`tab ${name}`), false
    await b.click()
    return true
  }
  const tryClick = async (locator, what, opts) => {
    if (!(await locator.count())) return missing.push(what), false
    await locator.first().click(opts)
    return true
  }

  await page.goto(`${BASE}/?v=${n}`)
  await shot('wallet-at-store', 1400)
  await scroll('end')
  await shot('wallet-at-store-scrolled')
  await scroll(0)

  const hold = page.getByRole('button', { name: /^Hold to pay/ })
  if (!(await hold.count())) {
    // Pay is its own screen: the side button opens it like Apple Pay; at phone size there's no frame, so the Pay button.
    const side = page.getByRole('button', { name: /^Side button/ })
    if (!PHONE && (await side.count())) await side.dblclick()
    else await tryClick(page.getByRole('button', { name: 'Pay', exact: true }), 'pay button')
    await shot('pay', 800)
  }
  if (await hold.count()) {
    const box = await hold.first().boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await shot('wallet-holding', 600)
    await page.waitForTimeout(900)
    await page.mouse.up()
    await shot('wallet-paid', 250)
    await page.waitForTimeout(2800)
  } else missing.push('hold to pay')

  if (await tryClick(page.getByRole('button', { name: 'Leave store' }), 'leave store')) await shot('wallet-no-store', 900)

  if (await tab('Scan')) {
    await shot('scan-idle')
    if (await tryClick(page.getByRole('button', { name: /Try a sample cart/i }), 'sample cart')) {
      await shot('scan-scanning', 700)
      await shot('scan-result', 1800)
      await scroll('end')
      await shot('scan-result-scrolled')
    }
  }
  if (await tab('Deals')) {
    await shot('deals')
    await scroll('end')
    await shot('deals-scrolled')
  }
  if (await tab('Rewards')) {
    await shot('rewards', 1400)
    await scroll(600)
    await shot('rewards-mid')
    await scroll('end')
    await shot('rewards-end')
  }

  // Native only: the glass sheets, menu, and deal categories the shared walk never opens.
  if (id === 'native') {
    const esc = async () => (await page.keyboard.press('Escape'), page.waitForTimeout(500))
    if (await tab('Deals')) {
      await page.waitForTimeout(600)
      for (const name of ['Clothing', 'Travel']) if (await tryClick(page.getByRole('tab', { name: new RegExp(name) }), `deals ${name}`)) await shot(`deals-${name.toLowerCase()}`)
      if (await tryClick(page.locator('main button').filter({ hasText: 'Top stack today' }), 'top deal')) (await shot('deal-sheet'), await esc())
    }
    if (await tab('Wallet')) {
      await page.waitForTimeout(600)
      if (await tryClick(page.getByRole('button', { name: 'Add card' }), 'add card')) (await shot('add-card-sheet'), await esc())
      if (await tryClick(page.getByRole('button', { name: /^Where are you shopping/ }), 'store chip')) (await shot('store-sheet'), await esc())
      // A card opens to its purchases; paying happens on the pay screen, where the pile switches cards.
      // The walk left the store, so go back to Trader Joe's first.
      if (await tryClick(page.getByRole('button', { name: /^Where are you shopping/ }), 'store chip')) {
        await tryClick(page.getByRole('button', { name: /^Trader Joe's/ }), 'pick store')
        await page.waitForTimeout(600)
      }
      if (await tryClick(page.locator('main').getByRole('button', { name: /^Venture X ending/ }), 'open card', { position: { x: 60, y: 20 } })) {
        await shot('card-history', 900)
        await scroll('end')
        await shot('card-history-scrolled')
        await scroll(0)
        await tryClick(page.getByRole('button', { name: 'Back to Wallet' }), 'back to wallet')
        await page.waitForTimeout(600)
      }
      if (await tryClick(page.getByRole('button', { name: 'Pay', exact: true }), 'pay button')) {
        await page.waitForTimeout(800)
        if (await tryClick(page.getByRole('dialog').getByRole('button', { name: /^Pay with Venture X/ }), 'pay pile', { position: { x: 60, y: 20 } })) await shot('pay-switched', 800)
        if (await tryClick(page.getByRole('dialog').getByRole('button', { name: /^Shopping at/ }), 'pay store')) await shot('pay-store-picker', 600)
        await esc()
      }
    }
  }

  report.designs[id] = { screenshots: i, errors, missing }
  if (errors.length || missing.length) failed = true
  console.log(`${id}: ${i} shots, ${errors.length} errors, missing: ${missing.join(', ') || 'none'}`)
  errors.slice(0, 5).forEach((e) => console.log('   ', e.slice(0, 200)))
  await ctx.close()
}

await browser.close()
await writeFile(path.join(OUT, PHONE ? 'report-phone.json' : 'report.json'), JSON.stringify(report, null, 2))
process.exit(failed ? 1 : 0)
