import * as TD from 'testdouble'
import Test from 'ava'
import Vault from './vault'

TD.replace(process.stdout, 'write')

Test('#USER_AGENT includes name, version, url and node.js runtime version', async (t) => {
  const re = /^sequelize-vault\/\d\.\d\.\d \(\+https:\/\/github.com\/linyows\/sequelize-vault; v\d\.\d\.\d\)$/
  t.true(re.test(Vault.USER_AGENT))
})

Test('#ENCRYPT_IN_MEMORY returns encrypted text on memory', async (t) => {
  const encrypted = await Vault.ENCRYPT_IN_MEMORY('key', 'secret')
  t.is(encrypted, 'e6iA4LdnZEJYpeGafw8OyQ==')
})

Test('#DECRYPT_IN_MEMORY returns encrypted text on memory', async (t) => {
  const decrypted = await Vault.DECRYPT_IN_MEMORY('key', 'e6iA4LdnZEJYpeGafw8OyQ==')
  t.is(decrypted, 'secret')
})

Test('#BUILD_PATH returns path for Vault', async (t) => {
  const p = Vault.BUILD_PATH('users', 'name')
  t.is(p, 'my-app_users_name')
})

Test('#MEMORY_FOR_KEY returns base64 key', async (t) => {
  const m = Vault.MEMORY_FOR_KEY('bar')
  t.is(m, 'dHJhbnNpdC9iYXI=')
})

Test('#config returns default config', async (t) => {
  const c = Vault.config
  const defaults = {
    address: 'https://vault.example.com',
    app: 'my-app',
    enabled: false,
    path: 'transit',
    suffix: '_encrypted',
    token: 'abcd1234'
  }
  t.deepEqual(c, defaults)
})

Test('#config sets attributes as config', async (t) => {
  Vault.config = { token: 'secret', app: 'foo', address: 'http://vault' }
  const expect = {
    address: 'http://vault',
    app: 'foo',
    enabled: false,
    path: 'transit',
    suffix: '_encrypted',
    token: 'secret'
  }
  const c = Vault.config
  t.deepEqual(c, expect)
})
