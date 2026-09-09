import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

const root = fileURLToPath(new URL('../', import.meta.url))
const sdkNames = ['@rerune/core', '@rerune/react', '@rerune/react-native', '@rerune/angular']
const json = path => JSON.parse(readFileSync(path, 'utf8'))

export function validateConsumer(manifests, lock) {
  let version
  for (const manifest of manifests) {
    assert.equal(manifest.private, true, `${manifest.name} must remain private: true`)
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
      for (const [name, value] of Object.entries(manifest[field] ?? {})) {
        assert(!/^(?:workspace:|file:|link:|\.\.?\/|\/|git\+|https?:)/.test(value), `Non-registry dependency: ${name}`)
        if (!name.startsWith('@rerune/')) continue
        assert(sdkNames.includes(name), `Unexpected SDK package: ${name}`)
        assert(/^\d+\.\d+\.\d+$/.test(value), `${name} needs an exact published version`)
        version ??= value
        assert.equal(value, version, 'SDK versions must match')
      }
    }
  }
  assert(version, 'Missing SDK pins')
  const serialized = JSON.stringify(lock)
  assert(!/(?:workspace:|file:|link:|\/Users\/|\.tgz|packages\/[^/]+\/src)/.test(serialized), 'Lockfile contains a local/private dependency')
  for (const name of sdkNames) {
    const packages = Object.keys(lock.packages ?? {}).filter(key => key.startsWith(`${name}@`))
    assert.deepEqual(packages, [`${name}@${version}`], `${name} has an unexpected resolved version`)
    assert(lock.packages[packages[0]].resolution.integrity, `${name} must have registry integrity`)
  }
  return version
}

function withinCheckout(path) {
  const target = realpathSync(path)
  assert(!relative(root, target).startsWith('..'), `Path leaves checkout: ${path}`)
  return target
}

function checkPaths(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (['node_modules', '.artifacts', '.git', '.expo', '.angular', 'dist'].includes(entry.name)) continue
    const path = join(directory, entry.name)
    assert(!entry.isSymbolicLink(), `Source symlink: ${path}`)
    if (entry.isDirectory()) { checkPaths(path); continue }
    if (/\.(?:ts|tsx|css|html)$/.test(path)) {
      const text = readFileSync(path, 'utf8')
      for (const match of text.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)) {
        const base = resolve(dirname(path), match[1])
        const target = ['', '.ts', '.tsx', '.css', '.png', '/index.ts'].map(ext => base + ext).find(existsSync)
        assert(target, `Unresolved local import: ${path}: ${match[1]}`)
        withinCheckout(target)
      }
    }
  }
}

async function main() {
  const appDirs = readdirSync(join(root, 'examples')).map(name => join(root, 'examples', name))
    .filter(path => existsSync(join(path, 'package.json')))
  const manifests = [json(join(root, 'package.json')), ...appDirs.map(path => json(join(path, 'package.json')))]
  const version = validateConsumer(manifests, parse(readFileSync(join(root, 'pnpm-lock.yaml'), 'utf8')))
  const base = json(join(root, 'tsconfig.base.json'))
  assert(!base.compilerOptions.paths, 'SDK source aliases are prohibited')
  assert(!base.compilerOptions.types?.includes('vitest/globals'), 'No private test type dependency')
  for (const app of appDirs) {
    const configPath = join(app, 'tsconfig.json')
    if (existsSync(configPath)) withinCheckout(resolve(app, json(configPath).extends))
    const angular = join(app, 'angular.json')
    if (existsSync(angular)) {
      const options = json(angular).projects.demo.architect.build.options
      for (const path of [...options.styles, ...options.assets.map(asset => asset.input)]) withinCheckout(resolve(app, path))
    }
    for (const name of Object.keys(json(join(app, 'package.json')).dependencies)) {
      withinCheckout(join(app, 'node_modules', name))
    }
  }
  checkPaths(join(root, 'examples'))
  for (const name of sdkNames) {
    const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/${version}`)
    assert(response.ok, `${name}@${version} is not publicly available: ${response.status}`)
    const metadata = await response.json()
    assert.equal(metadata.version, version)
    const lock = parse(readFileSync(join(root, 'pnpm-lock.yaml'), 'utf8'))
    assert.equal(metadata.dist.integrity, lock.packages[`${name}@${version}`].resolution.integrity)
  }
  console.log(`PASS: public SDK ${version}, registry integrity, aligned pins, and checkout-local imports/configuration`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
