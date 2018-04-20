import * as Crypto from 'crypto'
import {Buffer} from 'buffer'
import 'reflect-metadata'
import {Model, DataType} from 'sequelize-typescript'

export interface IOptions {
  enabled?: boolean
  app?: string
  token?: string
  address?: string
  suffix?: string
  path?: string
}

//const ATTRIBUTES_KEY = 'sequelize:attributes'
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

export function vaultConfig(options: IOptions) {
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

export function vaultField(name: string, options?: any | undefined) {
  if (options === undefined) {
    options = {}
  }

  return {
    ...{
    type: DataType.VIRTUAL,
    get: () => {
      rawGetter(name, this)
    },
    set: (value: string) => {
      rawSetter(name, value, this)
    },
    allowNull: true,
    },
    ...options,
  }
}

export async function rawGetter<T extends Model<T>>(this: Model<T>, name: string, instance: Model<T>): Promise<string> {
  const raw = instance.getDataValue(name)
  if (raw && raw !== '') {
    return raw
  }
  const key = buildPath(instance.constructor.name, name)
  const encrypted = instance.getDataValue(`${name}${suffix}`)
  return await decrypt(path, key, encrypted)
}

export async function rawSetter<T extends Model<T>>(name: string, value: string, instance: Model<T>): Promise<void> {
  instance.setDataValue(name, value)
  const key = buildPath(instance.constructor.name, name)
  const ciphertext = await encrypt(path, key, value)
  instance.setDataValue(`${name}${suffix}`, ciphertext)
}

/*
export default function shield(model: typeof Model, opt?: IOptions | undefined) {
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

async function loadAttributes(seq: Sequelize) {
  const ciphertext = ''
  const key = buildPath(seq.constructor.name, '')
  await decrypt(path, key, ciphertext)
  process.stdout.write(typeof seq)
}

function getAttributes<T extends Model<T>>(ins: Model<T>): object {
  const data = Reflect.getMetadata(ATTRIBUTES_KEY, ins)

  return Object.keys(data).reduce(
    (copy, key) => {
      copy[key] = {...data[key]}

      return copy
    },
    {}
  )
}
*/

function buildPath(table: string, column: string): string {
  return `${app}_${table}_${column}`
}

/*
async function persistAttributes<T extends Model<T>>(ins: Model<T>, _: Object, fn?: Function | undefined): Promise<void> {
  const attributes = getAttributes(ins)

  for (const attrName of Object.keys(attributes)) {
    const replacedAttrName = attrName.replace(suffix, '')
    if (replacedAttrName === attrName) { continue }
    const plaintext = ins.getDataValue(replacedAttrName)
    if (!plaintext || plaintext === '') {
      continue
    }
    const key = buildPath(ins.constructor.name, replacedAttrName)
    const ciphertext = await encrypt(path, key, plaintext)
    ins.setDataValue(attrName, ciphertext)
    if (ins.dataValues[replacedAttrName]) { delete ins.dataValues[replacedAttrName] }
  }

  Reflect.defineMetadata(ATTRIBUTES_KEY, {...attributes}, ins)

  return fn !== undefined ? fn(null, ins) : ins
}
*/

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
