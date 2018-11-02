import * as td from 'testdouble'

// Hide stdout!!!!!!!!!!!!!!!!
// Use stderr for debug
td.replace(process.stdout, 'write')

const randomNumber = (max: number) => {
  return Math.floor(Math.random() * Math.floor(max))
}

export const genTable = () => {
  return `users${randomNumber(100000)}`
}

export const genName = () => {
  return `foobar-${randomNumber(100000)}`
}

export const genEmail = () => {
  return `${randomNumber(100000)}@example.com`
}
