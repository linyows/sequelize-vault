import {Vault} from './vault'

const fields: object = {}

// This requires "convergent_encryption" and "derived" to be set to true for vault.
// See https://www.vaultproject.io/api/secret/transit/index.html#convergent_encryption
export async function findOneByEncrypted<T>(model: any, cond: object): Promise<T|null> {
  const table = model.tableName
  const keys = Object.keys(cond)
  const field = keys[0]
  const value = cond[field]

  const vault = new Vault()
  const encrypted = await vault.encrypt(Vault.BUILD_PATH(table, field), value)
  const where: object = {}
  where[`${field}${Vault.suffix}`] = encrypted

  return model.findOne({ where })
}

export function addHooks(model: any): void {
  const table = model.tableName
  fields[table] = {}
  const rawAttrs = model.rawAttributes

  for (const key of Object.keys(rawAttrs)) {
    fields[table][rawAttrs[key]['field']] = rawAttrs[key]['fieldName']
  }

  // see sequelize hooks
  // https://github.com/sequelize/sequelize/blob/830357553d15ecf41652ec997926bd5cf442eb17/lib/hooks.js#L8-L49
  model.afterFind('loadAttributesOnAfterFind', loadAttributesOnAfterFind)
  model.beforeCreate('persistAttributesOnBeforeSave', persistAttributesOnBeforeSave)
  model.beforeUpdate('persistAttributesOnBeforeSave', persistAttributesOnBeforeSave)
  model.afterCreate('persistAttributesOnAfterSave', persistAttributesOnAfterSave)
  model.afterUpdate('persistAttributesOnAfterSave', persistAttributesOnAfterSave)
}

async function loadAttributesOnAfterFind(instancesOrInstance: any, _: any, fn?: Function | undefined): Promise<void> {
  if (instancesOrInstance === null) {
    return
  }

  if (Array.isArray(instancesOrInstance)) {
    for (const ins of instancesOrInstance) {
      await loadAttributes(ins, fn)
    }
  } else {
    return loadAttributes(instancesOrInstance, fn)
  }
}

async function loadAttributes(instance: any, fn?: Function | undefined): Promise<void> {
  const vault = new Vault()

  // For sequelize ver5
  const arrayAttrs = (typeof instance._options !== 'undefined' && typeof instance._options.attributes !== 'undefined') ?
    instance._options.attributes : instance.constructor.prototype.attributes

  if (!Array.isArray(arrayAttrs)) {
    return fn !== undefined ? fn(undefined, instance) : instance
  }

  const rawAttrs = instance.constructor.prototype.rawAttributes
  const table = instance.constructor.tableName

  for (const attr of arrayAttrs) {
    const field = rawAttrs === undefined ? attr : rawAttrs[attr]['field']
    const replaced = field.replace(Vault.suffix, '')
    if (replaced === field) {
      continue
    }
    const ciphertext = instance.getDataValue(attr)
    if (!ciphertext || ciphertext === '') {
      continue
    }

    const key = Vault.BUILD_PATH(table, replaced)
    const plaintext = await vault.decrypt(key, ciphertext)
    Object
      .keys(rawAttrs)
      .forEach((rAttr) => {
        if (rawAttrs[rAttr]['field'] === replaced) {
            instance.setDataValue(rAttr, plaintext)
        }
    })
  }

  return fn !== undefined ? fn(undefined, instance) : instance
}

async function persistAttributesOnBeforeSave(ins: any, opts: Object, fn?: Function | undefined): Promise<void> {
  if (opts['fields'] !== undefined) {
    const vault = new Vault()
    const rawAttrs = ins.constructor.prototype.rawAttributes
    const table = ins.constructor.tableName

    for (const f of opts['fields']) {
      const dbColumn = rawAttrs === undefined ? f : rawAttrs[f]['field']
      const fieldName = rawAttrs === undefined ? f : rawAttrs[f]['fieldName']
      const encryptedFieldName = `${dbColumn}${Vault.suffix}`
      if (fields[table][encryptedFieldName] === undefined) {
        continue
      }
      const plaintext = ins.getDataValue(fieldName)
      if (!plaintext || plaintext === '') {
        continue
      }

      const key = Vault.BUILD_PATH(table, dbColumn)
      const ciphertext = await vault.encrypt(key, plaintext)
      ins.setDataValue(fields[table][encryptedFieldName], ciphertext)
    }
  }

  return fn !== undefined ? fn(undefined, ins) : ins
}

async function persistAttributesOnAfterSave(ins: any, opts: Object, fn?: Function | undefined): Promise<void> {
  if (opts['fields'] !== undefined) {
    const vault = new Vault()
    const rawAttrs = ins.constructor.prototype.rawAttributes
    const table = ins.constructor.tableName

    for (const fieldNameEncrypted of opts['fields']) {
      const fieldName = fieldNameEncrypted.replace(Vault.suffix, '')
      if (fieldName === fieldNameEncrypted) {
        continue
      }
      const ciphertext = ins.getDataValue(fieldNameEncrypted)
      if (!ciphertext || ciphertext === '') {
        continue
      }

      const dbColumn = rawAttrs[fieldName]['field']
      const key = Vault.BUILD_PATH(table, dbColumn)
      const plaintext = await vault.decrypt(key, ciphertext)
      ins.setDataValue(rawAttrs[fieldName]['fieldName'], plaintext)
    }
  }

  return fn !== undefined ? fn(undefined, ins) : ins
}
