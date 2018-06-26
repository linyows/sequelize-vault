import {Vault} from './vault'

const fields: string[] = []
let tableName: string = ''

export function addHooks(model: any) {
  tableName = model.tableName
  const arrayAttrs = model.prototype.attributes
  const rawAttrs = model.rawAttributes

  for (const attr of arrayAttrs) {
    const field = rawAttrs === undefined ? attr : rawAttrs[attr]['field']
    const replaced = field.replace(Vault.suffix, '')
    if (replaced === field) {
      continue
    }
    fields.push(replaced)
  }

  model.beforeFind('loadAttributesOnBeforeFind', loadAttributesOnBeforeFind)
  model.afterFind('loadAttributesOnAfterFind', loadAttributesOnAfterFind)
  model.beforeCreate('persistAttributesOnBeforeSave', persistAttributesOnBeforeSave)
  model.beforeUpdate('persistAttributesOnBeforeSave', persistAttributesOnBeforeSave)
  model.afterCreate('persistAttributesOnAfterSave', persistAttributesOnAfterSave)
  model.afterUpdate('persistAttributesOnAfterSave', persistAttributesOnAfterSave)
}

async function loadAttributesOnBeforeFind(query: any): Promise<void> {
  if (query.where === undefined) {
    return
  }

  const vault = new Vault()

  for (const f of fields) {
    if (query.where[f] !== undefined && typeof query.where[f] === 'string') {
      const key = Vault.BUILD_PATH(tableName, f)
      query.where[`${f}${Vault.suffix}`] = await vault.encrypt(key, query.where[f])
      delete query.where[f]
    }
  }
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
    const key = Vault.BUILD_PATH(table, replaced)
    const plaintext = await vault.decrypt(key, ciphertext)
    ins.setDataValue(replaced, plaintext)
  }

  return fn !== undefined ? fn(null, ins) : ins
}

async function persistAttributesOnBeforeSave(ins: any, opts: Object, fn?: Function | undefined): Promise<void> {
  if (opts['fields'] !== undefined) {
    const vault = new Vault()
    const rawAttrs = ins.constructor.prototype.rawAttributes
    const table = ins.constructor.tableName

    let fields: object = {}
    for (const key of Object.keys(rawAttrs)) {
      fields[rawAttrs[key]['field']] = rawAttrs[key]['fieldName']
    }

    for (const f of opts['fields']) {
      const field = rawAttrs === undefined ? f : rawAttrs[f]['field']
      const encryptedFieldName = field+Vault.suffix
      if (fields[encryptedFieldName] === undefined) {
        continue
      }
      const plaintext = ins.getDataValue(field)
      if (!plaintext || plaintext === '') {
        continue
      }
      const key = Vault.BUILD_PATH(table, field)
      const ciphertext = await vault.encrypt(key, plaintext)
      ins.setDataValue(fields[encryptedFieldName], ciphertext)
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
      const key = Vault.BUILD_PATH(table, replaced)
      const plaintext = await vault.decrypt(key, ciphertext)
      ins.setDataValue(replaced, plaintext)
    }
  }

  return fn !== undefined ? fn(null, ins) : ins
}
