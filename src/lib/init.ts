import fs from 'fs'
import path from 'path'
import {dbConfigPath, dbDirPath, dbMigratePath} from './utils'

const initConfig =
`{
  "development": {
    
  },
  "camelCase": true
}`

const createConfig = () => {
  const configPath = dbConfigPath() || path.join(process.cwd(), 'database.json')
  fs.access(configPath, (err) => {
    if (err)
      fs.writeFile(configPath, initConfig, (err) => {
        if (err) throw err
      })
  })
}

const createDbDir = (cb: (...args: any[]) => any) => {
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
