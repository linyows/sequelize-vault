import * as TD from 'testdouble'
import test from 'ava'
import * as Vault from './sequelize-vault'
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

test('replace vault attributes before "save" to database', async (t) => {
  const u = User.build({name: 'foobar', email: 'foo@example.com'})
  await u.save()
  t.is(u.email_encrypted, 'A2BPy5oy0zYg1iG5wuGqzg==')
  t.is(u.email, 'foo@example.com')
})

test('replace vault attributes before "create" to database', async (t) => {
  const u = await User.create({name: 'foobar', email: 'foo@example.com'})
  t.is(u.email_encrypted, 'A2BPy5oy0zYg1iG5wuGqzg==')
  t.is(u.email, 'foo@example.com')
})

test('set vault attributes after "find" to database', async (t) => {
  await User.create({name: 'foobaz', email: 'foo@example.com'})
  const u = await User.findOne({where: { name: 'foobaz' }})
  t.is(u.email, 'foo@example.com')
})

test('buildPath returns path', async (t) => {
  const p = Vault.buildPath('users', 'name')
  t.is(p, 'my-app_users_name')
})

test('memoryForKey returns path', async (t) => {
  const m = Vault.memoryForKey('foo', 'bar')
  t.is(m, 'Zm9vL2Jhcg==')
})
