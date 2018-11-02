import * as td from 'testdouble'
import * as crypto from 'crypto'

// Hide stdout!!!!!!!!!!!!!!!!
// Use stderr for debug
td.replace(process.stdout, 'write')

const size = 12

const randomNumber = () => {
  return crypto.randomBytes(size).toString('hex')
}

export const genTable = () => {
  return `users${randomNumber()}`
}

export const genName = () => {
  return `foobar-${randomNumber()}`
}

export const genEmail = () => {
  return `${randomNumber()}@example.com`
}
