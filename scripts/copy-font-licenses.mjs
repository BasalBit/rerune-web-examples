import { copyFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const output = process.argv[2]
if (!output) throw new Error('Expected an export directory')
const destination = resolve(output, 'assets/fonts')
mkdirSync(destination, { recursive: true })
for (const name of ['InstrumentSans-OFL.txt', 'Lora-OFL.txt']) {
  copyFileSync(new URL(`../examples/shared/fonts/${name}`, import.meta.url), resolve(destination, name))
}
