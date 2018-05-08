import Test from 'ava'
import SequelizeVault, {Vault} from './sequelize-vault'

Test('sequelize-vault exports', async (t) => {
  t.is(Vault.prototype.constructor.name, 'Vault')
  t.is(SequelizeVault.prototype.constructor.name, 'addHooks')
})
