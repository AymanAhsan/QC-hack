// Frozen copies of the real demo API responses (captured from the running
// backend on 2026-10-10) so every design shows identical numbers.

import walletJson from './wallet.json'
import locationsJson from './locations.json'
import recommendJson from './recommend.json'
import dealsJson from './deals.json'
import missedJson from './missed.json'
import stackJson from './stack-nike.json'
import type {
  Card,
  DealsResponse,
  Location,
  MissedResponse,
  RecommendResponse,
  StackResponse,
  Transaction,
  WalletResponse,
} from './types'

export type * from './types'

export const wallet = walletJson as unknown as WalletResponse
export const cards: Card[] = wallet.cards
export const cardById: Record<string, Card> = Object.fromEntries(cards.map((c) => [c.id, c]))
export const defaultDebitId = wallet.default_debit_card_id ?? 'everyday-debit'

export const locations: Location[] = (locationsJson as unknown as { locations: Location[] }).locations
export const locationById: Record<string, Location> = Object.fromEntries(locations.map((l) => [l.id, l]))

export const recommendations = recommendJson as unknown as Record<string, RecommendResponse>
export const deals = dealsJson as unknown as DealsResponse
export const missed = missedJson as unknown as MissedResponse
export const nikeStack = stackJson as unknown as StackResponse

/** Seeded history, newest first. */
export const history: Transaction[] = [...missed.recent].sort((a, b) => b.ts.localeCompare(a.ts))

/** Brand-ish colors for merchant marks. `ink` is the text color that passes on `color`. */
export const merchantMeta: Record<string, { color: string; ink: string; mark: string }> = {
  starbucks: { color: '#00704A', ink: '#ffffff', mark: 'S' },
  chipotle: { color: '#A81612', ink: '#ffffff', mark: 'C' },
  'trader-joes': { color: '#C8102E', ink: '#ffffff', mark: 'TJ' },
  cvs: { color: '#CC0000', ink: '#ffffff', mark: 'CVS' },
  sweetgreen: { color: '#0E5A3A', ink: '#ffffff', mark: 'sg' },
  'whole-foods': { color: '#00674B', ink: '#ffffff', mark: 'WF' },
  target: { color: '#CC0000', ink: '#ffffff', mark: 'T' },
  nike: { color: '#111111', ink: '#ffffff', mark: 'N' },
  shell: { color: '#FFD500', ink: '#C1121F', mark: 'S' },
  costco: { color: '#005DAA', ink: '#ffffff', mark: 'C' },
  ubereats: { color: '#06C167', ink: '#0b0b0b', mark: 'UE' },
  doordash: { color: '#FF3008', ink: '#ffffff', mark: 'D' },
  hm: { color: '#E50010', ink: '#ffffff', mark: 'H&M' },
  lululemon: { color: '#D22030', ink: '#ffffff', mark: 'L' },
  uniqlo: { color: '#FF0000', ink: '#ffffff', mark: 'U' },
  delta: { color: '#003366', ink: '#ffffff', mark: 'Δ' },
  marriott: { color: '#7A1F2B', ink: '#ffffff', mark: 'M' },
  airbnb: { color: '#FF5A5F', ink: '#ffffff', mark: 'A' },
  'chase-travel': { color: '#117ACA', ink: '#ffffff', mark: 'CT' },
  'capital-one-travel': { color: '#004977', ink: '#ffffff', mark: 'C1' },
}

export function merchantMark(id: string, name: string) {
  return merchantMeta[id] ?? { color: '#3f3f46', ink: '#ffffff', mark: name.slice(0, 1).toUpperCase() }
}

export const categoryLabel: Record<string, string> = {
  airfare: 'Airfare',
  apparel: 'Apparel',
  dining: 'Dining',
  discount_store: 'Discount store',
  drugstore: 'Drugstore',
  gas: 'Gas',
  grocery: 'Grocery',
  hotel: 'Hotel',
  travel: 'Travel',
  travel_portal: 'Travel portal',
  wholesale_club: 'Wholesale club',
}

/** Rate a card earns in a category, as the engine would (merchant rates aside). */
export function categoryRate(card: Card, category: string): number {
  return card.category_rates[category] ?? card.base_rate
}

/** Effective cents-per-dollar yield for a card in a category. */
export function categoryYieldPct(card: Card, category: string): number {
  return Math.round(categoryRate(card, category) * card.cpp * 10) / 10
}

/** The sample cart the backend uses (backend/routers/cart.py SAMPLE_CART). Prices are line totals. */
export const sampleCart = {
  merchantName: 'Nike',
  items: [
    { name: 'Nike Revolution 7 Road Running Shoes', qty: 1, priceCents: 7000 },
    { name: 'Nike Everyday Cushioned Crew Socks (3 pairs)', qty: 1, priceCents: 1800 },
    { name: 'Nike Swoosh Headband', qty: 2, priceCents: 1200 },
  ],
  subtotalCents: 10000,
}
