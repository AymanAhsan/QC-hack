// Money landing: Fluent's 3D coin (public/emoji/coin.png) rains through the
// shared confetti canvas as a bitmap shape. The emoji glyph 🪙 renders grey on
// Apple platforms, so the image is used instead.

import type { Shape } from 'canvas-confetti'
import { celebrate } from '../../shared/confetti'

const SCALAR = 2.4
// Drawn at twice the on-screen size so the coin stays sharp.
const PX = Math.round(10 * SCALAR * 2)
let coin: Shape | null = null

const img = new Image()
img.src = `${import.meta.env.BASE_URL}emoji/coin.png`
img
  .decode()
  .then(() => createImageBitmap(img, { resizeWidth: PX, resizeHeight: PX, resizeQuality: 'high' }))
  .then((bitmap) => {
    const scale = 1 / (SCALAR * 2)
    // canvas-confetti passes this array to new DOMMatrix(), as its own shapeFromText does; @types says DOMMatrix.
    const matrix = [scale, 0, 0, scale, (-PX * scale) / 2, (-PX * scale) / 2] as unknown as DOMMatrix
    coin = { type: 'bitmap', bitmap, matrix }
  })
  .catch(() => {
    // Falls back to gold discs.
  })

/** A short shower of gold coins. Pair it with the regular burst. */
export function coinBurst(origin = { x: 0.5, y: 0.42 }) {
  celebrate({ colors: ['#FFD60A', '#FFC93C'], shapes: coin ? [coin] : ['circle'], scalar: SCALAR, count: 12, origin })
}
