import test from 'ava'
import {Sequelize, Table, Column, Model} from 'sequelize-typescript'

@Table
class User extends Model<User> {
  @Column
  name: string

  @Column
  email: string
}

const sequelize =  new Sequelize({
  database: 'test',
  dialect: 'sqlite',
  username: 'root',
  password: '',
  storage: ':memory:'
})
sequelize.addModels([User])

test('foo', (t) => {
  const u = User.build({name: 'foo', email: 'foo@example.com'})
  u.save()
  t.true(true)
})
