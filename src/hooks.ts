import {Vault} from './vault'

const fields: object = {}

export interface IModel {
  tableName: string
  rawAttributes: object
  findOne: Function
  afterFind: Function
  beforeCreate: Function
  beforeUpdate: Function
  afterCreate: Function
  afterUpdate: Function
}

// This requires "convergent_encryption" and "derived" to be set to true for vault.
// See https://www.vaultproject.io/api/secret/transit/index.html#convergent_encryption
export async function findOneByEncrypted<T extends IModel>(model: T, cond: object, context?: string): Promise<T> {
  const table = model.tableName
  const keys = Object.keys(cond)
  const field = keys[0]
  const value = cond[field]

  const vault = new Vault()
  const encrypted = await vault.encrypt(Vault.BUILD_PATH(table, field), value, context)
  const where: object = {}
  where[`${field}${Vault.suffix}`] = encrypted

  return model.findOne({ where })
}

export function addHooks<T extends IModel>(model: T): void {
  const table = model.tableName
  fields[table] = {}
  const rawAttrs = model.rawAttributes

  for (const key of Object.keys(rawAttrs)) {
    fields[table][rawAttrs[key]['field']] = rawAttrs[key]['fieldName']
  }

  model.afterFind('loadAttributesOnAfterFind', loadAttributesOnAfterFind)
  model.beforeCreate('persistAttributesOnBeforeSave', persistAttributesOnBeforeSave)
  model.beforeUpdate('persistAttributesOnBeforeSave', persistAttributesOnBeforeSave)
  model.afterCreate('persistAttributesOnAfterSave', persistAttributesOnAfterSave)
  model.afterUpdate('persistAttributesOnAfterSave', persistAttributesOnAfterSave)
}

async function loadAttributesOnAfterFind(ins: any, _: Object, fn?: Function | undefined): Promise<void> {
  if (ins === null) {
    return
  }

  const vault = new Vault()
  const arrayAttrs = ins.constructor.prototype.attributes

  if (!Array.isArray(arrayAttrs)) {
    return fn !== undefined ? fn(null, ins) : ins
  }

  const rawAttrs = ins.constructor.prototype.rawAttributes
  const table = ins.constructor.tableName

  for (const attr of arrayAttrs) {
    const field = rawAttrs === undefined ? attr : rawAttrs[attr]['field']
    const replaced = field.replace(Vault.suffix, '')
    if (replaced === field) {
      continue
    }
    const ciphertext = ins.getDataValue(attr)
    if (!ciphertext || ciphertext === '') {
      continue
    }

    const contextFieldName = `${field}${Vault.contextSuffix}`
    let context
    if (fields[table][contextFieldName] !== undefined) {
      context = ins.getDataValue(contextFieldName)
    }

    const key = Vault.BUILD_PATH(table, replaced)
    const plaintext = await vault.decrypt(key, ciphertext, context)
    ins.setDataValue(replaced, plaintext)
  }

  return fn !== undefined ? fn(null, ins) : ins
}

async function persistAttributesOnBeforeSave(ins: any, opts: Object, fn?: Function | undefined): Promise<void> {
  if (opts['fields'] !== undefined) {
    const vault = new Vault()
    const rawAttrs = ins.constructor.prototype.rawAttributes
    const table = ins.constructor.tableName

    for (const f of opts['fields']) {
      const field = rawAttrs === undefined ? f : rawAttrs[f]['field']
      const encryptedFieldName = `${field}${Vault.suffix}`
      if (fields[table][encryptedFieldName] === undefined) {
        continue
      }
      const plaintext = ins.getDataValue(field)
      if (!plaintext || plaintext === '') {
        continue
      }

      const contextFieldName = `${field}${Vault.contextSuffix}`
      let context
      if (fields[table][contextFieldName] !== undefined) {
        context = ins.getDataValue(contextFieldName)
      }

      const key = Vault.BUILD_PATH(table, field)
      const ciphertext = await vault.encrypt(key, plaintext, context)
      ins.setDataValue(fields[table][encryptedFieldName], ciphertext)
    }
  }

  return fn !== undefined ? fn(null, ins) : ins
}

async function persistAttributesOnAfterSave(ins: any, opts: Object, fn?: Function | undefined): Promise<void> {
  if (opts['fields'] !== undefined) {
    const vault = new Vault()
    const rawAttrs = ins.constructor.prototype.rawAttributes
    const table = ins.constructor.tableName

    for (const f of opts['fields']) {
      const field = rawAttrs === undefined ? f : rawAttrs[f]['field']
      const replaced = field.replace(Vault.suffix, '')
      if (replaced === field || ins.getDataValue(replaced) !== null) {
        continue
      }
      const ciphertext = ins.getDataValue(f)
      if (!ciphertext || ciphertext === '') {
        continue
      }

      const contextFieldName = `${field}${Vault.contextSuffix}`
      let context
      if (fields[table][contextFieldName] !== undefined) {
        context = ins.getDataValue(contextFieldName)
      }

      const key = Vault.BUILD_PATH(table, replaced)
      const plaintext = await vault.decrypt(key, ciphertext, context)
      ins.setDataValue(replaced, plaintext)
    }
  }

  return fn !== undefined ? fn(null, ins) : ins
}
