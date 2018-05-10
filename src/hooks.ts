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

    for (const f of opts['fields']) {
      const field = rawAttrs === undefined ? f : rawAttrs[f]['field']
      const replaced = field.replace(Vault.suffix, '')
      if (replaced === field) {
        continue
      }
      const plaintext = ins.getDataValue(replaced)
      if (!plaintext || plaintext === '') {
        continue
      }
      const key = Vault.BUILD_PATH(table, replaced)
      const ciphertext = await vault.encrypt(key, plaintext)
      ins.setDataValue(f, ciphertext)
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
      if (replaced === field) {
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
