import * as Crypto from 'crypto'
import * as Path from 'path'
import {Buffer} from 'buffer'
import 'reflect-metadata'
import Axios, {AxiosInstance, AxiosResponse} from 'axios'

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
const fields: string[] = []
let modelName: string = ''
let client: AxiosInstance

export interface IOptions {
  enabled?: boolean
  app?: string
  token?: string
  address?: string
  suffix?: string
  path?: string
}

export function setOptions(options: IOptions): void {
  if (options.enabled !== undefined) {
    enabled = options.enabled
  }
  if (options.app !== undefined) {
    app = options.app
  }
  if (options.token !== undefined) {
    token = options.token
  }
  if (options.address !== undefined) {
    address = options.address
  }
  if (options.suffix !== undefined) {
    suffix = options.suffix
  }
  if (options.path !== undefined) {
    path = options.path
  }
}

export function shield(model: any, options?: IOptions | undefined) {
  modelName = model
  if (options !== undefined) {
    setOptions(options)
  }

  const min = 3
  const sec = 60
  const msec = 1000
  client = Axios.create({
    timeout: min * sec * msec,
    baseURL: address,
    headers: {
      'user-agent': 'Vault Client',
      'X-Vault-Token': token,
    }
  })

  for (const attribute of model.prototype.attributes) {
    const replaced = attribute.replace(suffix, '')
    if (replaced === attribute) {
      continue
    }
    fields.push(replaced)
  }

  model.beforeFind('loadAttributesOnBeforeFind', loadAttributesOnBeforeFind)
  model.afterFind('loadAttributesOnAfterFind', loadAttributesOnAfterFind)
  model.beforeCreate('persistAttributes', persistAttributes)
  model.beforeUpdate('persistAttributes', persistAttributes)
}

async function loadAttributesOnBeforeFind(query: any): Promise<void> {
  if (query.where === undefined) {
    return
  }

  for (const f of fields) {
    if (query.where[f] !== undefined) {
      const key = buildPath(modelName, f)
      query.where[`${f}${suffix}`] = await encrypt(path, key, query.where[f])
      delete query.where[f]
    }
  }
}

async function loadAttributesOnAfterFind(ins: any, prop: Object, fn?: Function | undefined): Promise<void> {
  if (prop['attributes'] !== undefined) {
    for (const field of prop['attributes']) {
      const replaced = field.replace(suffix, '')
      if (replaced === field) {
        continue
      }
      const ciphertext = ins.getDataValue(field)
      if (!ciphertext || ciphertext === '') {
        continue
      }
      const key = buildPath(ins.constructor.name, replaced)
      const plaintext = await decrypt(path, key, ciphertext)
      ins.setDataValue(replaced, plaintext)
    }
  }

  return fn !== undefined ? fn(null, ins) : ins
}

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
  if (plaintext === '') {
    return ''
  }

  const route = Path.join(p, 'encrypt', k)
  const res: AxiosResponse = await client.post(route, {
    plaintext: Buffer.from(plaintext, 'utf8').toString('base64'),
  })

  return res.data.ciphertext
}

async function decryptByVault(p: string, k: string, ciphertext: string): Promise<string> {
  if (ciphertext === '') {
    return ''
  }

  const route = Path.join(p, 'decrypt', k)
  const res: AxiosResponse = await client.post(route, {
    ciphertext: ciphertext,
  })

  return Buffer.from(res.data.plaintext, 'utf8').toString('base64')
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

export function buildPath(table: string, column: string): string {
  return `${app}_${table}_${column}`
}

export function memoryForKey(p: string, k: string): string {
  const length = 16

  return Buffer.from(`${p}/${k}`, 'utf8').toString('base64').substr(0, length)
}
