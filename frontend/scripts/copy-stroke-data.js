/**
 * Copies hanzi-writer-data JSON files into public/hanzi-data/
 * so they are served as static assets from GitHub Pages.
 * Run automatically before build via prebuild script.
 */
import { copyFileSync, mkdirSync, readdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const src = join(__dirname, '../node_modules/hanzi-writer-data')
const dest = join(__dirname, '../public/hanzi-data')

if (!existsSync(dest)) mkdirSync(dest, { recursive: true })

const files = readdirSync(src).filter(f => f.endsWith('.json'))
let count = 0
for (const file of files) {
  copyFileSync(join(src, file), join(dest, file))
  count++
}
console.log(`✓ Copied ${count} stroke data files to public/hanzi-data/`)
