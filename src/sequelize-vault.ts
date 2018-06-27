import {Vault, IConfig as Config} from './vault'
import {addHooks as SequelizeVault, findOneByEncrypted} from './hooks'

export {Vault, Config, findOneByEncrypted}
export default SequelizeVault
