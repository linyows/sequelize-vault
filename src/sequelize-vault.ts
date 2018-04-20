import * as Crypto from 'crypto'
import {Buffer} from 'buffer'
import 'reflect-metadata'

export interface IOptions {
  enabled?: boolean
  app?: string
  token?: string
  address?: string
  suffix?: string
  path?: string
}

const DEFAULT_SUFFIX = '_encrypted'
const INMEMORY_ALGORITHM = 'aes-128-cbc'
const INMEMORY_ENCODING = 'base64'
const devWMsg = 'this is not secure and should never be used in production-like environments!'
const DEV_WARNING = `[sequelize-vault] Using in-memory cipher - ${devWMsg}\n`

let enabled = process.env.NODE_ENV === 'production'
let app = 'my-app'
let token = 'abcd1234'
let address = 'https://vault.example.com'
let suffix = DEFAULT_SUFFIX
let path = 'transit'

export function shield(model: any, opt?: IOptions | undefined) {
  if (opt !== undefined) {
    if (opt.enabled !== undefined) {
      enabled = opt.enabled
    }
    if (opt.app !== undefined) {
      app = opt.app
    }
    if (opt.token !== undefined) {
      token = opt.token
    }
    if (opt.address !== undefined) {
      address = opt.address
    }
    if (opt.suffix !== undefined) {
      suffix = opt.suffix
    }
    if (opt.path !== undefined) {
      path = opt.path
    }
  }

  model.afterInit('loadAttributes', loadAttributes)
  model.beforeCreate('persistAttributes', persistAttributes)
  model.beforeUpdate('persistAttributes', persistAttributes)
}

async function loadAttributes(seq: any) {
  const ciphertext = ''
  const key = buildPath(seq.constructor.name, '')
  await decrypt(path, key, ciphertext)
  process.stdout.write(typeof seq)
}

function buildPath(table: string, column: string): string {
  return `${app}_${table}_${column}`
}

/* tslint:disable:no-string-literal */
async function persistAttributes(ins: any, options: Object, fn?: Function | undefined): Promise<void> {
  if (options['fields'] !== undefined) {
    for (const field of options['fields']) {
      const replaced = field.replace(suffix, '')
      if (replaced === field) {
        continue
      }
      const plaintext = ins.getDataValue(replaced)
      if (!plaintext || plaintext === '') {
        continue
      }
      const key = buildPath(ins.constructor.name, replaced)
      const ciphertext = await encrypt(path, key, plaintext)
      ins.setDataValue(field, ciphertext)
    }
  }

  return fn !== undefined ? fn(null, ins) : ins
}
/* tslint:enable:no-string-literal */

async function encrypt(p: string, k: string, plaintext: string): Promise<string> {
  if (enabled) {
    return encryptByVault(p, k, plaintext)
  } else {
    return encryptInMemory(p, k, plaintext)
  }
}

async function decrypt(p: string, k: string, ciphertext: string): Promise<string> {
  if (enabled) {
    return decryptByVault(p, k, ciphertext)
  } else {
    return decryptInMemory(p, k, ciphertext)
  }
}

async function encryptByVault(p: string, k: string, plaintext: string): Promise<string> {
  process.stdout.write(token)
  process.stdout.write(address)

  return `${p} - ${k} - ${plaintext}`
}

async function decryptByVault(p: string, k: string, ciphertext: string): Promise<string> {
  return `${p} - ${k} - ${ciphertext}`
}

function memoryForKey(p: string, k: string): string {
  const length = 16

  return Buffer.from(`${p}/${k}`, 'utf8').toString('base64').substr(0, length)
}

async function encryptInMemory(p: string, k: string, plaintext: string): Promise<string> {
  process.stdout.write(DEV_WARNING)
  const passowrd = memoryForKey(p, k)
  const cipher = Crypto.createCipher(INMEMORY_ALGORITHM, passowrd)
  let cipheredText = cipher.update(plaintext, 'utf8', INMEMORY_ENCODING)
  cipheredText += cipher.final(INMEMORY_ENCODING)

  return cipheredText
}

async function decryptInMemory(p: string, k: string, ciphertext: string): Promise<string> {
  process.stdout.write(DEV_WARNING)
  const passowrd = memoryForKey(p, k)
  const decipher = Crypto.createDecipher(INMEMORY_ALGORITHM, passowrd)
  let decipheredText = decipher.update(ciphertext, INMEMORY_ENCODING, 'utf8')
  decipheredText += decipher.final('utf8')

  return decipheredText
}
