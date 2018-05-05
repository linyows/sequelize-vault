import * as TD from 'testdouble'
import Test from 'ava'
import {Vault} from './vault'
import Axios, {AxiosRequestConfig, AxiosResponse} from 'axios'

Test.beforeEach(() => {
  TD.reset()
  Vault.RESET()
})

Test('#DEFAULT_UA includes name, version, url and node.js runtime version', (t) => {
  const re = /^sequelize-vault\/\d+\.\d+\.\d+ \(\+https:\/\/github.com\/linyows\/sequelize-vault; v\d+\.\d+\.\d+\)$/
  t.true(re.test(Vault.DEFAULT_UA))
})

Test('#ENCRYPT_IN_MEMORY returns encrypted text on memory', (t) => {
  TD.replace(process.stdout, 'write')
  const encrypted = Vault.ENCRYPT_IN_MEMORY('key', 'secret')
  t.is(encrypted, 'e6iA4LdnZEJYpeGafw8OyQ==')
})

Test('#DECRYPT_IN_MEMORY returns encrypted text on memory', (t) => {
  TD.replace(process.stdout, 'write')
  const decrypted = Vault.DECRYPT_IN_MEMORY('key', 'e6iA4LdnZEJYpeGafw8OyQ==')
  t.is(decrypted, 'secret')
})

Test('#BUILD_PATH returns path for Vault', (t) => {
  const p = Vault.BUILD_PATH('users', 'name')
  t.is(p, 'my-app_users_name')
})

Test('#MEMORY_FOR_KEY returns base64 key', (t) => {
  const m = Vault.MEMORY_FOR_KEY('bar')
  t.is(m, 'dHJhbnNpdC9iYXI=')
})

Test('#config returns default config', (t) => {
  Vault.ua = 'test'
  const c = Vault.config
  const defaults = {
    address: 'https://vault.example.com',
    app: 'my-app',
    enabled: false,
    path: 'transit',
    suffix: '_encrypted',
    token: 'abcd1234',
    timeout: 180000,
    ua: 'test'
  }
  t.deepEqual(c, defaults)
})

Test('#config sets attributes as config', (t) => {
  Vault.config = { token: 'secret', app: 'foo', address: 'http://vault', ua: 'test' }
  const expect = {
    address: 'http://vault',
    app: 'foo',
    enabled: false,
    path: 'transit',
    suffix: '_encrypted',
    token: 'secret',
    timeout: 180000,
    ua: 'test'
  }
  const c = Vault.config
  t.deepEqual(c, expect)
})

Test('.client returns a axios instance', (t) => {
  const v = new Vault()
  t.is(v.client.defaults.baseURL, 'https://vault.example.com')
  t.is(v.client.defaults.timeout, 180000)
  t.is(v.client.defaults.headers['X-Vault-Token'], 'abcd1234')
  const re = /^sequelize-vault\/\d+\.\d+\.\d+ \(\+https:\/\/github.com\/linyows\/sequelize-vault; v\d+\.\d+\.\d+\)$/
  t.true(re.test(v.client.defaults.headers['User-Agent']))
})

Test('.client sets as a axios instance', (t) => {
  const v = new Vault()
  const baseURL = 'http://foo'
  v.client = Axios.create({ baseURL })
  t.is(v.client.defaults.baseURL, baseURL)
})

Test('.encrypt calls backend method', async (t) => {
  const key = 'foo/bar'
  const pw = 'secret'
  const encrypted = 'vault:v2:0VHTTBb2EyyNYHsa3XiXsvXOQSLKulH+NqS4eRZdtc2TwQCxqJ7PUipvqQ=='
  let v: Vault
  let ciphertext: string
  class TestEncryptVault extends Vault {}

  Vault.enabled = true
  TD.replace(TestEncryptVault.prototype, 'encryptByVault', async () => { return encrypted })
  v = new TestEncryptVault()
  ciphertext = await v.encrypt(key, pw)

  t.is(ciphertext, encrypted)
  TD.reset()

  TD.replace(process.stdout, 'write')
  Vault.enabled = false
  v = new TestEncryptVault()
  ciphertext = await v.encrypt(key, pw)

  t.is(ciphertext, 'GKQR6G1CtWynueC7MjyI1A==')
})

Test('.decrypt calls backend method', async (t) => {
  const key = 'foo/bar'
  const pw = 'GKQR6G1CtWynueC7MjyI1A=='
  const decrypted = 'bXkgc2VjcmV0IGRhdGEK'
  let v: Vault
  let plaintext: string
  class TestDecryptVault extends Vault {}

  Vault.enabled = true
  TD.replace(TestDecryptVault.prototype, 'decryptByVault', async () => { return decrypted })
  v = new TestDecryptVault()
  plaintext = await v.decrypt(key, pw)

  t.is(plaintext, decrypted)
  TD.reset()

  TD.replace(process.stdout, 'write')
  Vault.enabled = false
  v = new TestDecryptVault()
  plaintext = await v.decrypt(key, pw)

  t.is(plaintext, 'secret')
})

Test('.encryptByVault returns encrypted text', async (t) => {
  const encrypted = 'vault:v2:0VHTTBb2EyyNYHsa3XiXsvXOQSLKulH+NqS4eRZdtc2TwQCxqJ7PUipvqQ=='
  const v = new Vault()
  v.client = Axios.create({
    adapter: async (config: AxiosRequestConfig) => {
      const response: AxiosResponse = {
        data: `{"ciphertext":"${encrypted}"}`,
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      }
      return Promise.resolve(response)
    }
  })
  const ciphertext = await v.encryptByVault('foo/bar', 'secret')
  t.is(ciphertext, encrypted)
})

Test('.decryptByVault returns decrypted text', async (t) => {
  const decrypted = 'bXkgc2VjcmV0IGRhdGEK'
  const v = new Vault()
  v.client = Axios.create({
    adapter: async (config: AxiosRequestConfig) => {
      const response: AxiosResponse = {
        data: `{"plaintext":"${decrypted}"}`,
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      }
      return Promise.resolve(response)
    }
  })
  const plaintext = await v.decryptByVault('foo/bar', 'vault:v1:8SDd3WHDOjf7mq69CyCqYjBXAiQQAVZRkFM13ok481zoCmHnSeDX9vyf7w==')
  t.is(plaintext, 'YlhrZ2MyVmpjbVYwSUdSaGRHRUs=')
})
