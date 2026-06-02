/**
 * Merges all hanzi-writer-data JSON files into one all-strokes.json
 * so the service worker can precache it as a single file for offline use.
 * Run automatically before build via prebuild script.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const src = join(__dirname, '../node_modules/hanzi-writer-data')
const dest = join(__dirname, '../public/hanzi-data')

if (!existsSync(dest)) mkdirSync(dest, { recursive: true })

const files = readdirSync(src).filter(f => f.endsWith('.json'))
const all = {}
let count = 0

for (const file of files) {
  const char = file.slice(0, -5) // strip .json
  try {
    const data = JSON.parse(readFileSync(join(src, file), 'utf-8'))
    all[char] = data
    count++
  } catch {
    // skip malformed files
  }
}

const outPath = join(dest, 'all-strokes.json')
writeFileSync(outPath, JSON.stringify(all))
console.log(`✓ Merged ${count} stroke files into all-strokes.json`)
