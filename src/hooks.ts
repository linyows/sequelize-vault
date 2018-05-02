import Vault from './vault'
export * from './vault'

const fields: string[] = []
let modelName: string = ''

export default function SequelizeVault(model: any) {
  modelName = model

  for (const attribute of model.prototype.attributes) {
    const replaced = attribute.replace(Vault.suffix, '')
    if (replaced === attribute) {
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
      const key = Vault.BUILD_PATH(modelName, f)
      query.where[`${f}${Vault.suffix}`] = await vault.encrypt(key, query.where[f])
      delete query.where[f]
    }
  }
}

async function loadAttributesOnAfterFind(ins: any, prop: Object, fn?: Function | undefined): Promise<void> {
  if (prop['attributes'] !== undefined) {
    const vault = new Vault()

    for (const field of prop['attributes']) {
      const replaced = field.replace(Vault.suffix, '')
      if (replaced === field) {
        continue
      }
      const ciphertext = ins.getDataValue(field)
      if (!ciphertext || ciphertext === '') {
        continue
      }
      const key = Vault.BUILD_PATH(ins.constructor.name, replaced)
      const plaintext = await vault.decrypt(key, ciphertext)
      ins.setDataValue(replaced, plaintext)
    }
  }

  return fn !== undefined ? fn(null, ins) : ins
}

async function persistAttributesOnBeforeSave(ins: any, opts: Object, fn?: Function | undefined): Promise<void> {
  if (opts['fields'] !== undefined) {
    const vault = new Vault()

    for (const field of opts['fields']) {
      const replaced = field.replace(Vault.suffix, '')
      if (replaced === field) {
        continue
      }
      const plaintext = ins.getDataValue(replaced)
      if (!plaintext || plaintext === '') {
        continue
      }
      const key = Vault.BUILD_PATH(ins.constructor.name, replaced)
      const ciphertext = await vault.encrypt(key, plaintext)
      ins.setDataValue(field, ciphertext)
    }
  }

  return fn !== undefined ? fn(null, ins) : ins
}
