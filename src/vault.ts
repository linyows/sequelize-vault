import * as Crypto from 'crypto'
import * as Path from 'path'
import {Buffer} from 'buffer'
import axios, {AxiosInstance, AxiosResponse} from 'axios'

/* tslint:disable:no-require-imports no-var-requires */
const pkgJson = require('../package.json')
/* tslint:enable:no-require-imports no-var-requires */
const VERSION = pkgJson.version
const NAME = pkgJson.name
const PROJECT_URL = pkgJson.homepage

export interface IConfig {
  enabled?: boolean
  app?: string
  token?: string
  address?: string
  suffix?: string
  convergented?: boolean
  context?: string
  path?: string
  timeout?: number
  ua?: string
}

export class Vault {
  public static INMEMORY_ALGORITHM: string = 'aes-128-cbc'
  public static DEV_W_MSG: string = 'this is not secure and should never be used in production-like environments!'
  public static DEV_WARNING: string = `[sequelize-vault] Using in-memory cipher - ${Vault.DEV_W_MSG}\n`
  public static DEFAULT_UA: string = `${NAME}/${VERSION} (+${PROJECT_URL}; ${process.version})`
  public static IV: string = 'abcdefghijklmnop'

  // config
  public static enabled: boolean
  public static app: string
  public static token: string
  public static address: string
  public static suffix: string
  public static path: string
  public static timeout: number
  public static ua: string
  public static convergented: boolean
  public static context: string

  private pClient: AxiosInstance

  public static ENCRYPT_IN_MEMORY(key: string, plaintext: string): string {
    if (Vault.DEV_WARNING !== '') {
      process.stdout.write(Vault.DEV_WARNING)
    }
    const passowrd = Vault.MEMORY_FOR_KEY(key)
    const cipher = Crypto.createCipheriv(Vault.INMEMORY_ALGORITHM, passowrd, Vault.IV)
    let cipheredText = cipher.update(plaintext, 'utf8', 'base64')
    cipheredText += cipher.final('base64')

    return cipheredText
  }

  public static DECRYPT_IN_MEMORY(key: string, ciphertext: string): string {
    if (Vault.DEV_WARNING !== '') {
      process.stdout.write(Vault.DEV_WARNING)
    }
    const passowrd = Vault.MEMORY_FOR_KEY(key)
    const decipher = Crypto.createDecipheriv(Vault.INMEMORY_ALGORITHM, passowrd, Vault.IV)
    let decipheredText = decipher.update(ciphertext, 'base64', 'utf8')
    decipheredText += decipher.final('utf8')

    return decipheredText
  }

  public static BUILD_PATH(table: string, column: string): string {
    return `${Vault.app}_${table}_${column}`
  }

  public static MEMORY_FOR_KEY(key: string): string {
    const length = 16

    return Buffer
      .from(`${Vault.path}/${key}`, 'utf8')
      .toString('base64')
      .substr(0, length)
  }

  public static RESET(): void {
    Vault.config = Vault.defaults
  }

  public static get defaults(): IConfig {
    const sec = 180
    const msec = 1000

    return {
      enabled: process.env.NODE_ENV === 'production',
      app: 'my-app',
      token: 'abcd1234',
      address: 'https://vault.example.com',
      suffix: '_encrypted',
      convergented: false,
      context: '',
      path: 'v1/transit',
      timeout: sec * msec,
      ua: Vault.DEFAULT_UA
    }
  }

  public static get config(): IConfig {
    return {
      enabled: Vault.enabled,
      app: Vault.app,
      token: Vault.token,
      address: Vault.address,
      suffix: Vault.suffix,
      convergented: Vault.convergented,
      context: Vault.context,
      path: Vault.path,
      timeout: Vault.timeout,
      ua: Vault.ua
    }
  }

  public static set config(c: IConfig) {
    for (const key of Object.keys(c)) {
      Vault[key] = c[key]
    }
  }

  public get client(): AxiosInstance {
    if (this.pClient === undefined) {
      this.pClient = axios.create({
        timeout: Vault.timeout,
        baseURL: Vault.address,
        headers: {
          'User-Agent': Vault.ua,
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
    const data = {
      plaintext: Buffer
        .from(plaintext, 'utf8')
        .toString('base64')
    }
    if (Vault.convergented) {
      if (Vault.context === '') {
        Vault.context = Vault.app
      }
      data['context'] = Buffer
        .from(Vault.context, 'utf8')
        .toString('base64')
    }
    const res: AxiosResponse = await this.client.post(route, data)

    return res.data.data.ciphertext
  }

  public async decryptByVault(key: string, ciphertext: string): Promise<string> {
    if (ciphertext === '') {
      return ''
    }

    const route = Path.join(Vault.path, 'decrypt', key)
    const data = { ciphertext: ciphertext }
    if (Vault.convergented) {
      if (Vault.context === '') {
        Vault.context = Vault.app
      }
      data['context'] = Buffer
        .from(Vault.context, 'utf8')
        .toString('base64')
    }
    const res: AxiosResponse = await this.client.post(route, data)

    return Buffer
      .from(res.data.data.plaintext, 'base64')
      .toString('utf8')
  }
}

Vault.RESET()
