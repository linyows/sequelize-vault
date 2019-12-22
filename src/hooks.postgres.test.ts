import Test from 'ava'
import {addHooks} from './hooks'
import {genTable, genName} from './testhelper'
import {Sequelize, SequelizeOptions, Table, Column, Model, DataType} from 'sequelize-typescript'

const table = genTable()

@Table({ tableName: table })
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

  @Column({ field: 'created_at' })
  public createdAt: Date

  @Column({ field: 'updated_at' })
  public updatedAt: Date
}

Test.before(async () => {
  const sequelize = new Sequelize({
    database: 'sequelizevault',
    dialect: 'postgres',
    username: 'sequelizevault',
    password: '',
  } as SequelizeOptions)

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
    created_at: DataType.DATE,
    updated_at: DataType.DATE,
  }

  await sequelize['queryInterface'].createTable(table, schema)
  sequelize.addModels([Admin])
  addHooks(Admin)
})

Test('replace vault attributes "before save" to database', async (t) => {
  const name = genName()
  const a = Admin.build({name, email: 'foo@example.com', creditCardNumber: '0000111122223333'})
  await a.save()

  t.is(a.emailEncrypted, 'WHPeiafX8JeC1zvRYlj8mQ==')
  t.is(a.creditCardNumberEncrypted, 'iQwpoyqMFAb04LksupZEeAhfV1Yldq83qrVCkHU6bDE=')
  t.is(a.email, null)
  t.is(a.creditCardNumber, null)
})
