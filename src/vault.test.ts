import * as TD from 'testdouble'
import Test from 'ava'
import Vault from './vault'
import Axios, {AxiosRequestConfig, AxiosResponse} from 'axios'

Test.beforeEach(() => { Vault.RESET() })

Test('#DEFAULT_UA includes name, version, url and node.js runtime version', async (t) => {
  const re = /^sequelize-vault\/\d\.\d\.\d \(\+https:\/\/github.com\/linyows\/sequelize-vault; v\d\.\d\.\d\)$/
  t.true(re.test(Vault.DEFAULT_UA))
})

Test('#ENCRYPT_IN_MEMORY returns encrypted text on memory', async (t) => {
  TD.replace(process.stdout, 'write')
  const encrypted = await Vault.ENCRYPT_IN_MEMORY('key', 'secret')
  t.is(encrypted, 'e6iA4LdnZEJYpeGafw8OyQ==')
  TD.reset()
})

Test('#DECRYPT_IN_MEMORY returns encrypted text on memory', async (t) => {
  TD.replace(process.stdout, 'write')
  const decrypted = await Vault.DECRYPT_IN_MEMORY('key', 'e6iA4LdnZEJYpeGafw8OyQ==')
  t.is(decrypted, 'secret')
  TD.reset()
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

Test('#config sets attributes as config', async (t) => {
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

Test('.client returns a axios instance', async (t) => {
  const v = new Vault()
  t.is(v.client.defaults.baseURL, 'https://vault.example.com')
  t.is(v.client.defaults.timeout, 180000)
  t.is(v.client.defaults.headers['X-Vault-Token'], 'abcd1234')
  const re = /^sequelize-vault\/\d\.\d\.\d \(\+https:\/\/github.com\/linyows\/sequelize-vault; v\d\.\d\.\d\)$/
  t.true(re.test(v.client.defaults.headers['User-Agent']))
})

Test('.client sets as a axios instance', async (t) => {
  const v = new Vault()
  const baseURL = 'http://foo'
  v.client = Axios.create({ baseURL })
  t.is(v.client.defaults.baseURL, baseURL)
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
