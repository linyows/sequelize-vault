import {Vault} from './vault'

const fields: string[] = []
let tableName: string = ''

export function AddHooks(model: any) {
  tableName = model.tableName

  for (const attribute of model.prototype.attributes) {
    const field = model.rawAttributes === undefined ? attribute : model.rawAttributes[attribute]['field']
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

async function loadAttributesOnAfterFind(ins: any, prop: Object, fn?: Function | undefined): Promise<void> {
  if (ins === null) {
    return
  }

  if (prop['attributes'] !== undefined) {
    const vault = new Vault()

    for (const field of prop['attributes']) {
      let strField = field
      if (typeof field !== 'string') {
        strField = field[1]
      }
      const replaced = strField.replace(Vault.suffix, '')
      if (replaced === strField) {
        continue
      }
      const ciphertext = ins.getDataValue(strField)
      if (!ciphertext || ciphertext === '') {
        continue
      }
      const key = Vault.BUILD_PATH(ins.constructor.tableName, replaced)
      const plaintext = await vault.decrypt(key, ciphertext)
      ins.setDataValue(replaced, plaintext)
    }
  }

  return fn !== undefined ? fn(null, ins) : ins
}

async function persistAttributesOnBeforeSave(ins: any, opts: Object, fn?: Function | undefined): Promise<void> {
  if (opts['fields'] !== undefined) {
    const vault = new Vault()

    for (const f of opts['fields']) {
      const field = ins.constructor.prototype.rawAttributes === undefined ? f : ins.constructor.prototype.rawAttributes[f]['field']
      const replaced = field.replace(Vault.suffix, '')
      if (replaced === field) {
        continue
      }
      const plaintext = ins.getDataValue(replaced)
      if (!plaintext || plaintext === '') {
        continue
      }
      const key = Vault.BUILD_PATH(ins.constructor.tableName, replaced)
      const ciphertext = await vault.encrypt(key, plaintext)
      ins.setDataValue(f, ciphertext)
    }
  }

  return fn !== undefined ? fn(null, ins) : ins
}
