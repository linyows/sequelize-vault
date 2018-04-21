import * as TD from 'testdouble'
import Test from 'ava'
import * as Vault from './hooks'
const Sequelize = require('sequelize')

const sequelize =  new Sequelize({
  database: 'test',
  dialect: 'sqlite',
  username: 'root',
  password: '',
  storage: ':memory:',
  operatorsAliases: false,
})

const schema = {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: Sequelize.STRING,
  email_encrypted: Sequelize.STRING,
  created_at: Sequelize.DATE,
  updated_at: Sequelize.DATE,
}

const User = sequelize.define('user', {
  name: Sequelize.STRING,
  email_encrypted: Sequelize.STRING,
  email: Sequelize.VIRTUAL,
},
{
  tableName: 'users',
  underscored: true,
})

sequelize['queryInterface'].createTable('users', schema)
Vault.shield(User)
TD.replace(process.stdout, 'write')

Test('replace vault attributes "before save" to database', async (t) => {
  const u = User.build({name: 'foobar', email: 'foo@example.com'})
  await u.save()
  t.is(u.email_encrypted, 'A2BPy5oy0zYg1iG5wuGqzg==')
  t.is(u.email, 'foo@example.com')
})

Test('replace vault attributes "before create" to database', async (t) => {
  const u = await User.create({name: 'foobar', email: 'foo@example.com'})
  t.is(u.email_encrypted, 'A2BPy5oy0zYg1iG5wuGqzg==')
  t.is(u.email, 'foo@example.com')
})

Test('set vault attributes "after find" to database', async (t) => {
  await User.create({name: 'foobaz', email: 'foo@example.com'})
  const u = await User.findOne({where: { name: 'foobaz' }})
  t.is(u.email, 'foo@example.com')
})

Test('set vault attributes "before find" to database', async (t) => {
  await User.create({name: 'foobaz', email: 'foo@example.com'})
  const u = await User.findOne({where: { email: 'foo@example.com' }})
  t.is(u.email, 'foo@example.com')
})
