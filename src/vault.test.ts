import * as TD from 'testdouble'
import Test from 'ava'
import Vault from './vault'

TD.replace(process.stdout, 'write')

Test('#BuildPath returns path', async (t) => {
  const p = Vault.BUILD_PATH('users', 'name')
  t.is(p, 'my-app_users_name')
})

Test('#MemoryForKey returns path', async (t) => {
  const m = Vault.MEMORY_FOR_KEY('bar')
  t.is(m, 'dHJhbnNpdC9iYXI=')
})
