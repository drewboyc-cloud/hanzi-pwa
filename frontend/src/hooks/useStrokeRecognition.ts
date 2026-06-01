import type { Stroke } from './useDrawing'

/**
 * Compares user strokes against reference stroke paths from hanzi-writer-data.
 * Returns a confidence score 0–100.
 * Algorithm: Fréchet-distance-inspired — sample points from each stroke,
 * then compare direction vectors and relative stroke count.
 */
export function scoreStrokes(userStrokes: Stroke[], referenceJson: string | null | undefined): number {
  if (!referenceJson || userStrokes.length === 0) return 0

  let ref: { strokes: number[][][] }
  try {
    ref = JSON.parse(referenceJson)
  } catch {
    return 0
  }

  const refStrokes = ref.strokes ?? []
  if (refStrokes.length === 0) return 0

  // Stroke count match (40% of score)
  const countDiff = Math.abs(userStrokes.length - refStrokes.length)
  const countScore = Math.max(0, 1 - countDiff / refStrokes.length) * 40

  // Direction similarity per matched stroke (60% of score)
  const pairCount = Math.min(userStrokes.length, refStrokes.length)
  let dirScore = 0
  for (let i = 0; i < pairCount; i++) {
    const user = userStrokes[i].points
    const refPath = refStrokes[i]
    if (user.length < 2 || refPath.length < 2) continue

    // Direction of first and last vector
    const userDx = user[user.length - 1].x - user[0].x
    const userDy = user[user.length - 1].y - user[0].y
    const refStart = refPath[0]
    const refEnd = refPath[refPath.length - 1]
    const refDx = refEnd[0] - refStart[0]
    const refDy = refEnd[1] - refStart[1]

    const uMag = Math.hypot(userDx, userDy)
    const rMag = Math.hypot(refDx, refDy)
    if (uMag === 0 || rMag === 0) continue

    const dot = (userDx / uMag) * (refDx / rMag) + (userDy / uMag) * (refDy / rMag)
    const similarity = (dot + 1) / 2  // map -1..1 → 0..1
    dirScore += similarity * (60 / pairCount)
  }

  return Math.round(countScore + dirScore)
}
