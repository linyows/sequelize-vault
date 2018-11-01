import * as TD from 'testdouble'
import Test from 'ava'
import {addHooks, findOneByEncrypted} from './hooks'
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

const randomNumber = (max: number) => {
  return Math.floor(Math.random() * Math.floor(max))
}

const genName = () => {
  return `foobar-${randomNumber(100000)}`
}

const genEmail = () => {
  return `${randomNumber(100000)}@example.com`
}

const schema = {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: Sequelize.STRING,
  email_encrypted: Sequelize.STRING,
  credit_card_number_encrypted: Sequelize.STRING,
  created_at: Sequelize.DATE,
  updated_at: Sequelize.DATE,
}

const User = sequelize.define('user', {
  name: Sequelize.STRING,
  email_encrypted: Sequelize.STRING,
  email: Sequelize.VIRTUAL,
  credit_card_number_encrypted: Sequelize.STRING,
  credit_card_number: Sequelize.VIRTUAL,
},
{
  tableName: 'users',
  underscored: true,
})

sequelize['queryInterface'].createTable('users', schema)
addHooks(User)

// Hide stdout!!!!!!!!!!!!!!!!
TD.replace(process.stdout, 'write')

Test('when native, replace vault attributes "before save" to database', async (t) => {
  const name = genName()
  const u = User.build({name, email: 'foo@example.com', credit_card_number: '0000111122223333'})
  await u.save()
  t.is(u.email_encrypted, 'DXFOoiyZq30TEwAu+8tFoQ==')
  t.is(u.email, 'foo@example.com')
  t.is(u.credit_card_number_encrypted, 'KMT0s+O8EqtiezZo6xQbIGkZuRbEBM04hKxuDqQaNeA=')
  t.is(u.credit_card_number, '0000111122223333')
})

Test('when native, replace vault attributes "before create" to database', async (t) => {
  const name = genName()
  const u = await User.create({name, email: 'foo@example.com', credit_card_number: '0000111122223333'})
  t.is(u.email_encrypted, 'DXFOoiyZq30TEwAu+8tFoQ==')
  t.is(u.email, 'foo@example.com')
  t.is(u.credit_card_number_encrypted, 'KMT0s+O8EqtiezZo6xQbIGkZuRbEBM04hKxuDqQaNeA=')
  t.is(u.credit_card_number, '0000111122223333')
})

Test('when native, replace vault attributes "before update" to database', async (t) => {
  const name = genName()
  const u = await User.create({name, email: 'foo@example.com', credit_card_number: '0000111122223333'})
  u.email = 'foo-to-zoo@example.com'
  await u.save()
  t.not(u.email_encrypted, 'DXFOoiyZq30TEwAu+8tFoQ==')
  t.is(u.email, 'foo-to-zoo@example.com')
  t.is(u.credit_card_number_encrypted, 'KMT0s+O8EqtiezZo6xQbIGkZuRbEBM04hKxuDqQaNeA=')
  t.is(u.credit_card_number, '0000111122223333')
})

Test('when native, set vault attributes "after find" to database', async (t) => {
  const name = genName()
  await User.create({name, email: 'foo@example.com', credit_card_number: '0000111122223333'})
  const u = await User.findOne({where: { name }})
  t.is(u.email, 'foo@example.com')
  t.is(u.credit_card_number, '0000111122223333')
})

Test('when native, use findOneByEncrypted', async (t) => {
  const name = genName()
  const email = genEmail()
  await User.create({name, email, credit_card_number: '0000111122223333'})
  const u = await findOneByEncrypted(User, { email }) as any
  t.is(u.email, email)
  t.is(u.credit_card_number, '0000111122223333')
})

Test('when native, skip decrypt on "find all"', async (t) => {
  await User.create({name: 'findall', email: 'findall@example.com', credit_card_number: '0000111122223333'})
  const users = await User.findAll()
  t.is(users[users.length-1].name, 'findall')
  t.is(users[users.length-1].email, undefined)
  t.is(users[users.length-1].credit_card_number, undefined)
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

  @Column({ field: 'credit_card_number', type: DataType.VIRTUAL })
  public creditCardNumber: string

  @Column({ field: 'credit_card_number_encrypted' })
  public creditCardNumberEncrypted: string
}

const schemaTS = {
  id: {
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: DataType.STRING,
  email_encrypted: DataType.STRING,
  credit_card_number_encrypted: DataType.STRING,
}

sequelizeTS['queryInterface'].createTable('persons', schemaTS)
sequelizeTS.addModels([Person])
addHooks(Person)

Test('when typescript, replace vault attributes "before save" to database', async (t) => {
  const name = genName()
  const p = Person.build({name, email: 'foo@example.com', creditCardNumber: '0000111122223333'})
  await p.save()
  t.is(p.emailEncrypted, 'DXFOoiyZq30TEwAu+8tFoQ==')
  t.is(p.email, 'foo@example.com')
  t.is(p.creditCardNumberEncrypted, 'KMT0s+O8EqtiezZo6xQbIGkZuRbEBM04hKxuDqQaNeA=')
  t.is(p.creditCardNumber, '0000111122223333')
})

Test('when typescript, replace vault attributes "before create" to database', async (t) => {
  const name = genName()
  const p = await Person.create({name, email: 'foo@example.com', creditCardNumber: '0000111122223333'})
  t.is(p.emailEncrypted, 'DXFOoiyZq30TEwAu+8tFoQ==')
  t.is(p.email, 'foo@example.com')
  t.is(p.creditCardNumberEncrypted, 'KMT0s+O8EqtiezZo6xQbIGkZuRbEBM04hKxuDqQaNeA=')
  t.is(p.creditCardNumber, '0000111122223333')
})

Test('when typescript, replace vault attributes "before update" to database', async (t) => {
  const name = genName()
  const p = await Person.create({name, email: 'foo@example.com', creditCardNumber: '0000111122223333'})
  p.email = 'foo-to-zoo@example.com'
  await p.save()
  t.not(p.emailEncrypted, 'DXFOoiyZq30TEwAu+8tFoQ==')
  t.is(p.email, 'foo-to-zoo@example.com')
  t.is(p.creditCardNumberEncrypted, 'KMT0s+O8EqtiezZo6xQbIGkZuRbEBM04hKxuDqQaNeA=')
  t.is(p.creditCardNumber, '0000111122223333')
})

Test('when typescript, set vault attributes "after find" to database', async (t) => {
  const name = genName()
  await Person.create({name, email: 'foo@example.com', creditCardNumber: '0000111122223333'})
  const p = await Person.findOne<Person>({where: { name }})
  if (p === null) {
    return
  }
  t.is(p.email, 'foo@example.com')
  t.is(p.creditCardNumber, '0000111122223333')
})

Test('when typescript, use findOneByEncrypted', async (t) => {
  const name = genName()
  const email = genEmail()
  await Person.create({name, email, creditCardNumber: '0000111122223333'})
  const p = await findOneByEncrypted<Person>(Person, { email })
  if (p === null) {
    return
  }
  t.is(p.email, email)
  t.is(p.creditCardNumber, '0000111122223333')
})

Test('when typescript, skip decrypt on "find all"', async (t) => {
  await Person.create({name: 'findall', email: 'findall@example.com', creditCardNumber: '0000111122223333'})
  const persons = await Person.findAll<Person>()
  t.is(persons[persons.length-1].name, 'findall')
  t.is(persons[persons.length-1].email, undefined)
  t.is(persons[persons.length-1].creditCardNumber, undefined)
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

    @Column({ field: 'credit_card_number', type: DataType.VIRTUAL })
    public creditCardNumber: string

    @Column({ field: 'credit_card_number_encrypted' })
    public creditCardNumberEncrypted: string
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
    email_encrypted: DataType.STRING,
    credit_card_number_encrypted: DataType.STRING,
    // If the column of virtual type exists, its value is returned as null.
    email: DataType.STRING,
    credit_card_number: DataType.STRING,
  }

  await sequelize['queryInterface'].createTable('admins', schema)
  sequelize.addModels([Admin])
  addHooks(Admin)

  const name = genName()
  const a = Admin.build({name, email: 'foo@example.com', creditCardNumber: '0000111122223333'})
  await a.save()
  t.is(a.emailEncrypted, 'DXFOoiyZq30TEwAu+8tFoQ==')
  t.is(a.email, 'foo@example.com')
})
