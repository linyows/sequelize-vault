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

Test('when native, replace vault attributes "before save" to database', async (t) => {
  const u = User.build({name: 'foobar', email: 'foo@example.com'})
  await u.save()
  t.is(u.email_encrypted, 'DXFOoiyZq30TEwAu+8tFoQ==')
  t.is(u.email, 'foo@example.com')
})

Test('when native, replace vault attributes "before create" to database', async (t) => {
  const u = await User.create({name: 'foobar', email: 'foo@example.com'})
  t.is(u.email_encrypted, 'DXFOoiyZq30TEwAu+8tFoQ==')
  t.is(u.email, 'foo@example.com')
})

Test('when native, set vault attributes "after find" to database', async (t) => {
  await User.create({name: 'foobaz', email: 'foo@example.com'})
  const u = await User.findOne({where: { name: 'foobaz' }})
  t.is(u.email, 'foo@example.com')
})

Test('when native, set vault attributes "before find" to database', async (t) => {
  await User.create({name: 'foobaz', email: 'foo@example.com'})
  const u = await User.findOne({where: { email: 'foo@example.com' }})
  t.is(u.email, 'foo@example.com')
})

Test('when native, no set vault attributes "before find" to database', async (t) => {
  const uu = await User.create({name: 'foo'})
  const u = await User.findOne({where: { id: uu.id }})
  t.is(uu.email, undefined)
  t.is(u.email, undefined)
})

Test('when native, skip decrypt on "find all"', async (t) => {
  await User.create({name: 'findall', email: 'findall@example.com'})
  const users = await User.findAll()
  t.is(users[users.length-1].name, 'findall')
  t.is(users[users.length-1].email, undefined)
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

Test('when typescript, replace vault attributes "before save" to database', async (t) => {
  const p = Person.build({name: 'foobar', email: 'foo@example.com'})
  await p.save()
  t.is(p.emailEncrypted, 'DXFOoiyZq30TEwAu+8tFoQ==')
  t.is(p.email, 'foo@example.com')
})

Test('when typescript, replace vault attributes "before create" to database', async (t) => {
  const p = await Person.create({name: 'foobar', email: 'foo@example.com'})
  t.is(p.emailEncrypted, 'DXFOoiyZq30TEwAu+8tFoQ==')
  t.is(p.email, 'foo@example.com')
})

Test('when typescript, set vault attributes "after find" to database', async (t) => {
  await Person.create({name: 'foobaz', email: 'foo@example.com'})
  const p = await Person.findOne<Person>({where: { name: 'foobaz' }})
  if (p === null) {
    return
  }
  t.is(p.email, 'foo@example.com')
})

Test('when typescript, set vault attributes "before find" to database', async (t) => {
  await Person.create({name: 'foobaz', email: 'foo@example.com'})
  const p = await Person.findOne<Person>({where: { email: 'foo@example.com' }})
  if (p === null) {
    return
  }
  t.is(p.email, 'foo@example.com')
})

Test('when typescript, no set vault attributes "before find" to database', async (t) => {
  const pp = await Person.create({name: 'foo'})
  const p = await Person.findOne<Person>({where: { id: pp.id }})
  if (p === null) {
    return
  }
  t.is(pp.email, undefined)
  t.is(p.email, undefined)
})

Test('when typescript, skip decrypt on "find all"', async (t) => {
  await Person.create({name: 'findall', email: 'findall@example.com'})
  const persons = await Person.findAll<Person>()
  t.is(persons[persons.length-1].name, 'findall')
  t.is(persons[persons.length-1].email, undefined)
})

Test('when typescript and postgres, replace vault attributes "before save" to database', async (t) => {
  @Table({ tableName: 'admins' })
  class Admin extends Model<Admin> {
    @Column
    public name: string

    @Column(DataType.VIRTUAL)
    public email: string

    @Column({ field: 'email_encrypted' })
    public emailEncrypted: string
  }

  const sequelize = new SequelizeTS({
    name: 'sequelizevault',
    dialect: 'postgres',
    username: 'sequelizevault',
    password: '',
    operatorsAliases: false,
  })

  const schema = {
    id: {
      type: DataType.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: DataType.STRING,
    // If the column of virtual type exists, its value is returned as null.
    email: DataType.STRING,
    email_encrypted: DataType.STRING,
  }

  await sequelize['queryInterface'].createTable('admins', schema)
  sequelize.addModels([Admin])
  addHooks(Admin)

  const a = Admin.build({name: 'foobar', email: 'foo@example.com'})
  await a.save()
  t.is(a.emailEncrypted, 'DXFOoiyZq30TEwAu+8tFoQ==')
  t.is(a.email, 'foo@example.com')
})
