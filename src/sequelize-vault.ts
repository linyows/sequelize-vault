import {Vault, IConfig as Config} from './vault'
import {addHooks as SequelizeVault, findOneByEncrypted, IModel as SequelizeVaultModel} from './hooks'

export {Vault, Config, findOneByEncrypted, SequelizeVaultModel}
export default SequelizeVault
