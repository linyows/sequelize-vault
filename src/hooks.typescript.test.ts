import Test from 'ava'
import {addHooks, findOneByEncrypted} from './hooks'
import {genTable, genName, genEmail} from './testhelper'
import {Sequelize, SequelizeOptions, Table, Column, Model, DataType} from 'sequelize-typescript'

const table = genTable()

const sequelize = new Sequelize({
  database: 'test-typescript',
  dialect: 'sqlite',
  username: 'root',
  password: '',
  storage: ':memory:',
} as SequelizeOptions)

@Table({ tableName: table })
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

  @Column({ field: 'created_at' })
  public createdAt: Date

  @Column({ field: 'updated_at' })
  public updatedAt: Date
}

const schema = {
  id: {
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: DataType.STRING,
  email_encrypted: DataType.STRING,
  credit_card_number_encrypted: DataType.STRING,
  created_at: DataType.DATE,
  updated_at: DataType.DATE,
}

sequelize['queryInterface'].createTable(table, schema)
sequelize.addModels([Person])
addHooks(Person)

Test('replace vault attributes "before save" to database', async (t) => {
  const name = genName()
  const p = Person.build({name, email: 'foo@example.com', creditCardNumber: '0000111122223333'})
  await p.save()
  t.is(p.emailEncrypted, 'DXFOoiyZq30TEwAu+8tFoQ==')
  t.is(p.email, 'foo@example.com')
  t.is(p.creditCardNumberEncrypted, 'KMT0s+O8EqtiezZo6xQbIGkZuRbEBM04hKxuDqQaNeA=')
  t.is(p.creditCardNumber, '0000111122223333')
})

Test('replace vault attributes "before create" to database', async (t) => {
  const name = genName()
  const p = await Person.create({name, email: 'foo@example.com', creditCardNumber: '0000111122223333'})
  t.is(p.emailEncrypted, 'DXFOoiyZq30TEwAu+8tFoQ==')
  t.is(p.email, 'foo@example.com')
  t.is(p.creditCardNumberEncrypted, 'KMT0s+O8EqtiezZo6xQbIGkZuRbEBM04hKxuDqQaNeA=')
  t.is(p.creditCardNumber, '0000111122223333')
})

Test('replace vault attributes "before update" to database', async (t) => {
  const name = genName()
  const p = await Person.create({name, email: 'foo@example.com', creditCardNumber: '0000111122223333'})
  p.email = 'foo-to-zoo@example.com'
  await p.save()
  t.not(p.emailEncrypted, 'DXFOoiyZq30TEwAu+8tFoQ==')
  t.is(p.email, 'foo-to-zoo@example.com')
  t.is(p.creditCardNumberEncrypted, 'KMT0s+O8EqtiezZo6xQbIGkZuRbEBM04hKxuDqQaNeA=')
  t.is(p.creditCardNumber, '0000111122223333')
})

Test('set vault attributes "after find" to database', async (t) => {
  const name = genName()
  await Person.create({name, email: 'foo@example.com', creditCardNumber: '0000111122223333'})
  const p = await Person.findOne<Person>({where: { name }})
  if (p === null) {
    return
  }
  t.is(p.email, 'foo@example.com')
  t.is(p.creditCardNumber, '0000111122223333')
})

Test('set vault attributes "after find" to database, when findAll', async (t) => {
  await Person.create({name: 'findall', email: 'findall@example.com', creditCardNumber: '0000111122223333'})
  const persons = await Person.findAll<Person>()
  for (let p of persons) {
    if (p.name === 'findall') {
      t.is(p.email, 'findall@example.com')
      t.is(p.emailEncrypted, 'BRbdmy3GTxnMNVdDUmX4njI23FczaEzUmwaKm7we0FY=')
      t.is(p.creditCardNumber, '0000111122223333')
      t.is(p.creditCardNumberEncrypted, 'KMT0s+O8EqtiezZo6xQbIGkZuRbEBM04hKxuDqQaNeA=')
    }
  }
})

Test('use findOneByEncrypted', async (t) => {
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
