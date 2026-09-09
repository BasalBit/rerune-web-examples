import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { preview } from 'vite'

const [app, port, output] = process.argv.slice(2)
if (!app || !port || !output) throw new Error('Expected app, port, and build directory')
const outDir = resolve('examples', app, output)
if (!existsSync(resolve(outDir, 'index.html'))) throw new Error(`Build ${app} first with pnpm build`)

// Serve the production output without inheriting application or parent Vite configuration.
await preview({
  configFile: false,
  root: process.cwd(),
  build: { outDir },
  preview: { host: '127.0.0.1', port: Number(port), strictPort: true },
})
