import Test from 'ava'
import {addHooks, findOneByEncrypted} from './hooks'
import {genTable, genName, genEmail} from './testhelper'
const Sequelize = require('sequelize')

const table = genTable()

const sequelize =  new Sequelize({
  database: 'test-purejs',
  dialect: 'sqlite',
  username: 'root',
  password: '',
  storage: ':memory:',
})

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
  tableName: table,
  underscored: true,
})

sequelize['queryInterface'].createTable(table, schema)
addHooks(User)

Test('replace vault attributes "before save" to database', async (t) => {
  const name = genName()
  const u = User.build({name, email: 'foo@example.com', credit_card_number: '0000111122223333'})
  await u.save()
  t.is(u.email_encrypted, 'WHPeiafX8JeC1zvRYlj8mQ==')
  t.is(u.email, 'foo@example.com')
  t.is(u.credit_card_number_encrypted, 'iQwpoyqMFAb04LksupZEeAhfV1Yldq83qrVCkHU6bDE=')
  t.is(u.credit_card_number, '0000111122223333')
})

Test('replace vault attributes "before create" to database', async (t) => {
  const name = genName()
  const u = await User.create({name, email: 'foo@example.com', credit_card_number: '0000111122223333'})
  t.is(u.email_encrypted, 'WHPeiafX8JeC1zvRYlj8mQ==')
  t.is(u.email, 'foo@example.com')
  t.is(u.credit_card_number_encrypted, 'iQwpoyqMFAb04LksupZEeAhfV1Yldq83qrVCkHU6bDE=')
  t.is(u.credit_card_number, '0000111122223333')
})

Test('replace vault attributes "before update" to database', async (t) => {
  const name = genName()
  const u = await User.create({name, email: 'foo@example.com', credit_card_number: '0000111122223333'})
  u.email = 'foo-to-zoo@example.com'
  await u.save()
  t.not(u.email_encrypted, 'WHPeiafX8JeC1zvRYlj8mQ==')
  t.is(u.email, 'foo-to-zoo@example.com')
  t.is(u.credit_card_number_encrypted, 'iQwpoyqMFAb04LksupZEeAhfV1Yldq83qrVCkHU6bDE=')
  t.is(u.credit_card_number, '0000111122223333')
})

Test('set vault attributes "after find" to database', async (t) => {
  const name = genName()
  await User.create({name, email: 'foo@example.com', credit_card_number: '0000111122223333'})
  const u = await User.findOne({where: { name }})
  t.is(u.email, 'foo@example.com')
  t.is(u.credit_card_number, '0000111122223333')
})

Test('set vault attributes "after find" to database, when findAll', async (t) => {
  await User.create({name: 'findall', email: 'findall@example.com', credit_card_number: '0000111122223333'})
  const users = await User.findAll()
  for (let u of users) {
    if (u.name === 'findall') {
      t.is(u.email, 'findall@example.com')
      t.is(u.email_encrypted, 'EsSL2RtvklhmKiqvLT+/nYmMohcPrlOb8MvWRL4CEnk=')
      t.is(u.credit_card_number, '0000111122223333')
      t.is(u.credit_card_number_encrypted, 'iQwpoyqMFAb04LksupZEeAhfV1Yldq83qrVCkHU6bDE=')
    }
  }
})

Test('use findOneByEncrypted', async (t) => {
  const name = genName()
  const email = genEmail()
  await User.create({name, email, credit_card_number: '0000111122223333'})
  const u = await findOneByEncrypted(User, { email }) as any
  t.is(u.email, email)
  t.is(u.credit_card_number, '0000111122223333')
})
