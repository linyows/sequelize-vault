export default class SequelizeVault {
  private enabled: boolean
  private application: string
  private token: string
  private address: string

  public constructor(model, opt) {
    this.enabled = opt.enabled || process.env.NODE_ENV == 'production'
    this.application = opt.application || 'my-app'
    this.token = opt.token || 'abcd1234'
    this.address = opt.address || 'https://vault.example.com'

    model.afterInit('loadAttributes', this.loadAttributes)
    model.beforeSave('persistAttributes', this.persistAttributes)
  }

  public loadAttributes(instance, options, next) {
  }

  public persistAttributes(instance, options, next) {
  }

  public encrypt(path: string, key: string, plaintext: string) {
  }

  public decrypt(path: string, key: string, ciphertext: string) {
  }

  public encryptByVault(path: string, key: string, plaintext: string) {
  }

  public decryptByVault(path: string, key: string, ciphertext: string) {
  }

  public encryptInMemory(path: string, key: string, plaintext: string) {
  }

  public decryptInMemory(path: string, key: string, ciphertext: string) {
  }
}
