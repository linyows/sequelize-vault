import * as Crypto from 'crypto'
import * as Path from 'path'
import {Buffer} from 'buffer'
import Axios, {AxiosInstance, AxiosResponse} from 'axios'

export interface IConfig {
  enabled?: boolean
  app?: string
  token?: string
  address?: string
  suffix?: string
  path?: string
}

export default class Vault {
  public static INMEMORY_ALGORITHM: string = 'aes-128-cbc'
  public static DEV_W_MSG: string = 'this is not secure and should never be used in production-like environments!'
  public static DEV_WARNING: string = `[sequelize-vault] Using in-memory cipher - ${Vault.DEV_W_MSG}\n`

  public static enabled: boolean = process.env.NODE_ENV === 'production'
  public static app: string = 'my-app'
  public static token: string = 'abcd1234'
  public static address: string = 'https://vault.example.com'
  public static suffix: string = '_encrypted'
  public static path: string = 'transit'

  private pClient: AxiosInstance

  public static async ENCRYPT_IN_MEMORY(key: string, plaintext: string): Promise<string> {
    process.stdout.write(Vault.DEV_WARNING)
    const passowrd = Vault.MEMORY_FOR_KEY(key)
    const cipher = Crypto.createCipher(Vault.INMEMORY_ALGORITHM, passowrd)
    let cipheredText = cipher.update(plaintext, 'utf8', 'base64')
    cipheredText += cipher.final('base64')

    return cipheredText
  }

  public static async DECRYPT_IN_MEMORY(key: string, ciphertext: string): Promise<string> {
    process.stdout.write(Vault.DEV_WARNING)
    const passowrd = Vault.MEMORY_FOR_KEY(key)
    const decipher = Crypto.createDecipher(Vault.INMEMORY_ALGORITHM, passowrd)
    let decipheredText = decipher.update(ciphertext, 'base64', 'utf8')
    decipheredText += decipher.final('utf8')

    return decipheredText
  }

  public static BUILD_PATH(table: string, column: string): string {
    return `${Vault.app}_${table}_${column}`
  }

  public static MEMORY_FOR_KEY(key: string): string {
    const length = 16

    return Buffer.from(`${Vault.path}/${key}`, 'utf8').toString('base64').substr(0, length)
  }

  public static get config(): IConfig {
    return {
      enabled: Vault.enabled,
      app: Vault.app,
      token: Vault.token,
      address: Vault.address,
      suffix: Vault.suffix,
      path: Vault.path
    }
  }

  public static set config(c: IConfig) {
    for (const key of Object.keys(c)) {
      Vault[key] = c[key]
    }
  }

  public get client(): AxiosInstance {
    if (this.pClient === undefined) {
      const min = 3
      const sec = 60
      const msec = 1000

      this.pClient = Axios.create({
        timeout: min * sec * msec,
        baseURL: Vault.address,
        headers: {
          'user-agent': 'Vault Client',
          'X-Vault-Token': Vault.token
        }
      })
    }

    return this.pClient
  }

  public set client(ins: AxiosInstance) {
    this.pClient = ins
  }

  public async encrypt(key: string, plaintext: string): Promise<string> {
    if (Vault.enabled) {
      return this.encryptByVault(key, plaintext)
    } else {
      return Vault.ENCRYPT_IN_MEMORY(key, plaintext)
    }
  }

  public async decrypt(key: string, ciphertext: string): Promise<string> {
    if (Vault.enabled) {
      return this.decryptByVault(key, ciphertext)
    } else {
      return Vault.DECRYPT_IN_MEMORY(key, ciphertext)
    }
  }

  public async encryptByVault(key: string, plaintext: string): Promise<string> {
    if (plaintext === '') {
      return ''
    }

    const route = Path.join(Vault.path, 'encrypt', key)
    const res: AxiosResponse = await this.client.post(route, {
      plaintext: Buffer.from(plaintext, 'utf8').toString('base64')
    })

    return res.data.ciphertext
  }

  public async decryptByVault(key: string, ciphertext: string): Promise<string> {
    if (ciphertext === '') {
      return ''
    }

    const route = Path.join(Vault.path, 'decrypt', key)
    const res: AxiosResponse = await this.client.post(route, {
      ciphertext: ciphertext
    })

    return Buffer.from(res.data.plaintext, 'utf8').toString('base64')
  }
}
