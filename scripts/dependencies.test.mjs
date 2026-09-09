import assert from 'node:assert/strict'
import test from 'node:test'
import { validateConsumer } from './check-dependencies.mjs'

const names = ['core', 'react', 'react-native', 'angular']
const lock = { packages: Object.fromEntries(names.map(name => [`@rerune/${name}@1.3.1`, { resolution: { integrity: 'sha512-test' } }])) }
const manifest = { private: true, dependencies: { '@rerune/react': '1.3.1' } }

test('rejects workspace links and unpublished candidate pins', () => {
  for (const pin of ['workspace:*', 'file:../sdk.tgz', '1.3.0-rc.1', '^1.3.1']) {
    assert.throws(() => validateConsumer([{ ...manifest, dependencies: { '@rerune/react': pin } }], lock))
  }
  assert.throws(() => validateConsumer([{ ...manifest, dependencies: { '@rerune/react': '2.0.0' } }], lock))
})

test('rejects mixed transitive SDK versions and private lockfile paths', () => {
  const mixed = structuredClone(lock)
  mixed.packages['@rerune/core@2.0.0'] = { resolution: { integrity: 'sha512-other' } }
  assert.throws(() => validateConsumer([manifest], mixed))
  assert.throws(() => validateConsumer([manifest], { ...lock, importers: { sdk: 'link:../../packages/core' } }))
  assert.equal(validateConsumer([manifest], lock), '1.3.1')
})
