import * as fs from 'fs'
import * as path from 'path'
import { DbConfigsPath, dbDirPath, dbMigratePath } from './utils'

const initConfig = `module.exports = {
  development: {
    database: 'dbname',
    user: '${process.env.USER || 'postgres'}',
    password: '',
    host: 'localhost',
    port: '5432',
  },
  camelCase: true,
}
`

const createConfig = () => {
  const configPath = DbConfigsPath() || path.join(process.cwd(), 'database.js')
  fs.access(configPath, (err) => {
    if (err)
      fs.writeFile(configPath, initConfig, (err) => {
        if (err) throw err
      })
  })
}

const createDbDir = (cb: (...args: unknown[]) => unknown) => {
  const dirPath = dbDirPath()
  fs.access(dirPath, (err) => {
    if (!err) return cb()
    fs.mkdir(dirPath, (err) => {
      if (err) throw err
      cb()
    })
  })
}

const createMigrateDir = () => {
  createDbDir(() => {
    const migratePath = dbMigratePath()
    fs.access(migratePath, (err) => {
      if (!err) return
      fs.mkdir(migratePath, (err) => {
        if (err) throw err
      })
    })
  })
}

export default () => {
  createConfig()
  createMigrateDir()
}
