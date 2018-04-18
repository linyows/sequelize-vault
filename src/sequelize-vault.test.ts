import test from 'ava'
import {Sequelize, Table, Column, Model} from 'sequelize-typescript'
import SequelizeVault from './sequelize-vault'

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
}

@Table({ tableName: 'users' })
class User extends Model<User> {
  @Column
  public name: string
  @Column
  public email_encrypted: string
  @Column
  public email: string
}

sequelize['queryInterface'].createTable('users', schema)
sequelize.addModels([User])
SequelizeVault.shield(User)

test('replace vault attributes before "save" to database', async (t) => {
  const u = User.build({name: 'foobar', email: 'foo@example.com'})
  await u.save()
  t.is(u.email_encrypted, 'A2BPy5oy0zYg1iG5wuGqzg==')
  t.is(u.email, undefined)
})

test('replace vault attributes before "create" to database', async (t) => {
  const u = await User.create({name: 'foobar', email: 'foo@example.com'})
  t.is(u.email_encrypted, 'A2BPy5oy0zYg1iG5wuGqzg==')
  t.is(u.email, undefined)
})
