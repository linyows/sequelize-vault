Sequelize Vault
===============

A Sequelize plugin for easily integrating [Hashicorp Vault][vault].

<a href="https://www.npmjs.com/package/sequelize-vault" title="npm"><img src="http://img.shields.io/npm/v/sequelize-vault.svg?style=flat-square"></a>
<a href="https://travis-ci.org/linyows/sequelize-vault" title="travis"><img src="https://img.shields.io/travis/linyows/sequelize-vault.svg?style=flat-square"></a>
<a href="https://coveralls.io/github/linyows/sequelize-vault" title="coveralls"><img src="https://img.shields.io/coveralls/linyows/sequelize-vault.svg?style=flat-square"></a>
<a href="https://github.com/linyows/sequelize-vault/blob/master/LICENSE" title="MIT License"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square"></a>

[vault]: https://www.vaultproject.io/

Installation
------------

```sh
$ npm install sequelize-vault
```

Usage
-----

```ts
import {Sequelize, Table, Column, Model} from 'sequelize-typescript'
import SequelizeVault from 'sequelize-vault'

@Table
class User extends Model<User> {
  @Column
  ssn_encrypted: string
  @Column
  ssn: string
}

sequelize.addModels([User...])
SequelizeVault(User)

const u = await User.create({ ssn: '123-45-6789' })
console.log(u.ssn_encrypted)
// vault:v0:EE3EV8P5hyo9h...
```

Options
-------

Key     | Value
---     | ---
enabled | true or false
app     | my-app
token   | abcd1234
address | https://vault.example.com
suffix  | \_encrypted
path    | transit

Contribution
------------

1. Fork (https://github.com/linyows/sequelize-vault/fork)
1. Create a feature branch
1. Commit your changes
1. Rebase your local changes against the master branch
1. Run test suite with the `npm ci` command and confirm that it passes
1. Create a new Pull Request

Author
------

[linyows](https://github.com/linyows)

