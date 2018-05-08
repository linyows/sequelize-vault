import * as TD from 'testdouble'
import Test from 'ava'
import {addHooks} from './hooks'
import {Sequelize as SequelizeTS, Table, Column, Model, DataType} from 'sequelize-typescript'
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
addHooks(User)
TD.replace(process.stdout, 'write')

Test('(integration) replace vault attributes "before save" to database', async (t) => {
  const u = User.build({name: 'foobar', email: 'foo@example.com'})
  await u.save()
  t.is(u.email_encrypted, 'A2BPy5oy0zYg1iG5wuGqzg==')
  t.is(u.email, 'foo@example.com')
})

Test('(integration) replace vault attributes "before create" to database', async (t) => {
  const u = await User.create({name: 'foobar', email: 'foo@example.com'})
  t.is(u.email_encrypted, 'A2BPy5oy0zYg1iG5wuGqzg==')
  t.is(u.email, 'foo@example.com')
})

Test('(integration) set vault attributes "after find" to database', async (t) => {
  await User.create({name: 'foobaz', email: 'foo@example.com'})
  const u = await User.findOne({where: { name: 'foobaz' }})
  t.is(u.email, 'foo@example.com')
})

Test('(integration) set vault attributes "before find" to database', async (t) => {
  await User.create({name: 'foobaz', email: 'foo@example.com'})
  const u = await User.findOne({where: { email: 'foo@example.com' }})
  t.is(u.email, 'foo@example.com')
})

const sequelizeTS = new SequelizeTS({
  database: 'testts',
  dialect: 'sqlite',
  username: 'root',
  password: '',
  storage: ':memory:',
  operatorsAliases: false,
})

@Table({ tableName: 'persons' })
class Person extends Model<Person> {
  @Column
  public name: string

  @Column(DataType.VIRTUAL)
  public email: string

  @Column({ field: 'email_encrypted' })
  public emailEncrypted: string
}

const schemaTS = {
  id: {
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: DataType.STRING,
  email_encrypted: DataType.STRING,
}

sequelizeTS['queryInterface'].createTable('persons', schemaTS)
sequelizeTS.addModels([Person])
addHooks(Person)

Test('(sequelize-typescript) replace vault attributes "before save" to database', async (t) => {
  const p = Person.build({name: 'foobar', email: 'foo@example.com'})
  await p.save()
  t.is(p.emailEncrypted, 'A2BPy5oy0zYg1iG5wuGqzg==')
  t.is(p.email, 'foo@example.com')
})

Test('(sequelize-typescript) replace vault attributes "before create" to database', async (t) => {
  const p = await Person.create({name: 'foobar', email: 'foo@example.com'})
  t.is(p.emailEncrypted, 'A2BPy5oy0zYg1iG5wuGqzg==')
  t.is(p.email, 'foo@example.com')
})
