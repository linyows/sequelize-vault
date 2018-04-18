import {Model} from 'sequelize-typescript'

export interface IOptions {
  enabled?: boolean
  application?: string
  token?: string
  address?: string
}

export default class SequelizeVault {
  private enabled: boolean
  private application: string
  private token: string
  private address: string

  public constructor(model: Model, opt: IOptions) {
    this.enabled = opt.enabled || process.env.NODE_ENV == 'production'
    this.application = opt.application || 'my-app'
    this.token = opt.token || 'abcd1234'
    this.address = opt.address || 'https://vault.example.com'

    model.afterInit('loadAttributes', this.loadAttributes)
    model.beforeSave('persistAttributes', this.persistAttributes)
  }

  public loadAttributes(instance: object, options: object, next: object) {
    console.log(this.enabled)
    console.log(this.application)
    console.log(this.token)
    console.log(this.address)

    console.log(instance)
    console.log(options)
    console.log(next)
  }

  public persistAttributes(instance: object, options: object, next: object) {
    console.log(instance)
    console.log(options)
    console.log(next)
  }

  public encrypt(path: string, key: string, plaintext: string) {
    console.log(path)
    console.log(key)
    console.log(plaintext)
  }

  public decrypt(path: string, key: string, ciphertext: string) {
    console.log(path)
    console.log(key)
    console.log(ciphertext)
  }

  public encryptByVault(path: string, key: string, plaintext: string) {
    console.log(path)
    console.log(key)
    console.log(plaintext)
  }

  public decryptByVault(path: string, key: string, ciphertext: string) {
    console.log(path)
    console.log(key)
    console.log(ciphertext)
  }

  public encryptInMemory(path: string, key: string, plaintext: string) {
    console.log(path)
    console.log(key)
    console.log(plaintext)
  }

  public decryptInMemory(path: string, key: string, ciphertext: string) {
    console.log(path)
    console.log(key)
    console.log(ciphertext)
  }
}
