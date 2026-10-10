// Shared demo-data fixtures for component tests.

import type { Card, Location, Merchant, RecommendResponse } from '../types'

export const amexGold: Card = {
  id: 'amex-gold', user_id: 'demo', type: 'amex-gold', image: '/cards/amex-gold.svg',
  name: 'Amex Gold', issuer: 'American Express', network: 'amex', last4: '4821',
  reward_type: 'points', cpp: 1.8, base_rate: 1, category_rates: { grocery: 4 },
  merchant_rates: {}, gradient: ['#d4af37', '#8a6d1d'], glow: '#f5c84c',
  text_color: '#1a1405', is_default_debit: false,
}

export const chaseFreedom: Card = {
  id: 'chase-freedom', user_id: 'demo', type: 'chase-freedom', image: '/cards/chase-freedom.svg',
  name: 'Chase Freedom', issuer: 'Chase', network: 'visa', last4: '1177',
  reward_type: 'cash', cpp: 1, base_rate: 1, category_rates: { wholesale_club: 5 },
  merchant_rates: {}, gradient: ['#1f5fae', '#0b2a55'], glow: '#4a90e2',
  text_color: '#ffffff', is_default_debit: false,
}

function merchant(id: string, name: string, category: string, categoryLabel: string, emoji: string): Merchant {
  return {
    id, name, known: true, category, category_label: categoryLabel, mcc: '5411', mcc_label: 'Grocery Stores',
    mcc_note: null, accepts: ['visa', 'mastercard', 'amex'], channels: ['store'], typical_cents: 4250,
    deal_feed: null, emoji, coupons: [],
  }
}

export const traderJoes: Location = {
  id: 'trader-joes',
  merchant: merchant('trader-joes', "Trader Joe's", 'grocery', 'Grocery', '🛒'),
  address: '142 E 14th St, New York, NY',
  distance_m: 18,
}

export const costco: Location = {
  id: 'costco',
  merchant: merchant('costco', 'Costco', 'wholesale_club', 'Wholesale club', '📦'),
  address: '517 E 117th St, New York, NY',
  distance_m: 2400,
}

export function recommendationFor(loc: Location, winner: Card): RecommendResponse {
  return {
    merchant: loc.merchant,
    amount_cents: loc.merchant.typical_cents,
    winner_card_id: winner.id,
    no_accepted_card: false,
    ranking: [
      {
        card_id: winner.id, card_name: winner.name, network: winner.network, accepted: true, rejection_reason: null,
        multiplier: 4, rate_source: 'category', rate_label: '4x points', yield_pct: 7.2, points: 170,
        value_cents: 306, rank: 1, is_winner: true,
      },
    ],
    why: null,
    is_demo_data: true,
  }
}
