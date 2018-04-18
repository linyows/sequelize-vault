import * as Crypto from 'crypto'
import {Buffer} from 'buffer'
import 'reflect-metadata'
import {Sequelize,Model} from 'sequelize-typescript'

export interface IOptions {
  enabled?: boolean
  app?: string
  token?: string
  address?: string
  suffix?: string
  path?: string
}

const ATTRIBUTES_KEY = 'sequelize:attributes'
const DEFAULT_SUFFIX = '_encrypted'
const INMEMORY_ALGORITHM = 'aes-128-cbc'
const INMEMORY_ENCODING = 'base64'
const DEV_WARNING = '[sequelize-vault] Using in-memory cipher - this is not secure '
                  + 'and should never be used in production-like environments!\n'

export default class SequelizeVault<T extends Model<T>> {
  private static enabled: boolean
  private static app: string
  private static token: string
  private static address: string
  private static suffix: string
  private static path: string

  public static shield(model: typeof Model, opt?: IOptions | undefined) {
    if (!opt) {
      opt = {}
    }
    SequelizeVault.enabled = opt.enabled || process.env.NODE_ENV == 'production'
    SequelizeVault.app = opt.app || 'my-app'
    SequelizeVault.token = opt.token || 'abcd1234'
    SequelizeVault.address = opt.address || 'https://vault.example.com'
    SequelizeVault.suffix = opt.suffix || DEFAULT_SUFFIX
    SequelizeVault.path = opt.path || 'transit'

    model.afterInit('loadAttributes', SequelizeVault.loadAttributes)
    model.beforeCreate('persistAttributes', SequelizeVault.persistAttributes)
    model.beforeUpdate('persistAttributes', SequelizeVault.persistAttributes)
  }

  public static loadAttributes(sequelize: Sequelize) {
    console.log(SequelizeVault.enabled)
    console.log(SequelizeVault.app)
    console.log(SequelizeVault.token)
    console.log(SequelizeVault.address)

    console.log(typeof sequelize)
  }

  public static getAttributes<T extends Model<T>>(ins: Model<T>): object {
    const data = Reflect.getMetadata(ATTRIBUTES_KEY, ins)
    return Object.keys(data).reduce((copy, key) => {
      copy[key] = {...data[key]}
      return copy
    }, {})
  }

  public static buildPath(table: string, column: string): string {
    return `${SequelizeVault.app}_${table}_${column}`
  }

  public static async persistAttributes<T extends Model<T>>(ins: Model<T>, options: Object, fn?: Function | undefined): Promise<void> {
    const attributes = SequelizeVault.getAttributes(ins)

    for (let attrName of Object.keys(attributes)) {
      const replacedAttrName = attrName.replace(SequelizeVault.suffix, '')
      if (replacedAttrName === attrName) { continue }
      const plaintext = ins.getDataValue(replacedAttrName)
      if (!plaintext || plaintext === '') {
        continue
      }
      const path = SequelizeVault.path
      const key = SequelizeVault.buildPath(ins.constructor.name, replacedAttrName)
      const ciphertext = await SequelizeVault.encrypt(path, key, plaintext)
      ins.setDataValue(attrName, ciphertext)
      if (ins.dataValues[replacedAttrName]) { delete ins.dataValues[replacedAttrName] }
      if (options['fields'][replacedAttrName]) { delete options['fields'][replacedAttrName] }
      if (options['defaultFields'][replacedAttrName]) { delete options['defaultFields'][replacedAttrName] }
    }

    Reflect.defineMetadata(ATTRIBUTES_KEY, {...attributes}, ins)
    return fn ? fn(null, ins) : ins
  }

  public static async encrypt(path: string, key: string, plaintext: string): Promise<string> {
    if (SequelizeVault.enabled) {
      return SequelizeVault.encryptByVault(path, key, plaintext)
    } else {
      return SequelizeVault.encryptInMemory(path, key, plaintext)
    }
  }

  public static async decrypt(path: string, key: string, ciphertext: string): Promise<string> {
    if (SequelizeVault.enabled) {
      return SequelizeVault.decryptByVault(path, key, ciphertext)
    } else {
      return SequelizeVault.decryptInMemory(path, key, ciphertext)
    }
  }

  public static async encryptByVault(path: string, key: string, plaintext: string): Promise<string> {
    console.log(path)
    console.log(key)
    console.log(plaintext)
    return ''
  }

  public static async decryptByVault(path: string, key: string, ciphertext: string): Promise<string> {
    console.log(path)
    console.log(key)
    console.log(ciphertext)
    return ''
  }

  public static memoryForKey(path: string, key: string): string {
    const b = Buffer.from(`${path}/${key}`, 'utf8')
    return b.toString('base64').substr(0,16)
  }

  public static async encryptInMemory(path: string, key: string, plaintext: string): Promise<string> {
    process.stdout.write(DEV_WARNING)
    const passowrd = SequelizeVault.memoryForKey(path, key)
    const cipher = Crypto.createCipher(INMEMORY_ALGORITHM, passowrd)
    let cipheredText = cipher.update(plaintext, 'utf8', INMEMORY_ENCODING)
    cipheredText += cipher.final(INMEMORY_ENCODING)
    return cipheredText
  }

  public static async decryptInMemory(path: string, key: string, ciphertext: string): Promise<string> {
    process.stdout.write(DEV_WARNING)
    const passowrd = SequelizeVault.memoryForKey(path, key)
    const decipher = Crypto.createDecipher(INMEMORY_ALGORITHM, passowrd)
    let decipheredText = decipher.update(ciphertext, INMEMORY_ENCODING, 'utf8')
    decipheredText += decipher.final('utf8')
    return decipheredText
  }
}
