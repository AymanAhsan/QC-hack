// How merchants and cards look: logo fallbacks, category names, card templates.

import type { Card, CardType } from '../types'

/** Brand colors for merchants without a logo in public/logos. `ink` is the text color that passes on `color`. */
const MERCHANT_META: Record<string, { color: string; ink: string; mark: string }> = {
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
  return MERCHANT_META[id] ?? { color: '#3f3f46', ink: '#ffffff', mark: name.slice(0, 1).toUpperCase() }
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

/** The rate a card earns in a category, as the engine would (merchant rates aside). */
export function categoryRate(card: Card, category: string): number {
  return card.category_rates[category] ?? card.base_rate
}

/** What a card face needs to draw itself. */
export type CardLook = Pick<Card, 'type' | 'name' | 'network' | 'last4' | 'gradient' | 'glow' | 'text_color'>

/** The cards you can add (the card types in backend/data.py), for the Add card sheet. */
export const CARD_TEMPLATES: (CardLook & { issuer: string })[] = (
  [
    ['amex-gold', 'Amex Gold', 'American Express', 'amex'],
    ['chase-sapphire', 'Chase Sapphire', 'Chase', 'visa'],
    ['chase-freedom', 'Chase Freedom', 'Chase', 'visa'],
    ['venture-x', 'Venture X', 'Capital One', 'visa'],
    ['apple-card', 'Apple Card', 'Goldman Sachs', 'mastercard'],
    ['everyday-debit', 'Everyday Debit', 'Your bank', 'visa'],
  ] as const
).map(([type, name, issuer, network]) => ({
  type: type as CardType,
  name,
  issuer,
  network,
  last4: '',
  gradient: ['#3f3f46', '#18181b'],
  glow: '#ffffff',
  text_color: '#ffffff',
}))
