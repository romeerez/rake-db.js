const fs = require('fs')
const path = require('path')
const {dbConfigPath, dbDirPath, dbMigratePath} = require('./utils')

const createConfig = () => {
  const configPath = dbConfigPath() || path.join(process.cwd(), 'database.json')
  fs.access(configPath, (err) => {
    if (err)
      fs.writeFile(configPath, '{\n  "development": {\n    \n  }\n}', (err) => {
        if (err) throw new Error(err)
      })
  })
}

const createDbDir = (cb) => {
  const dirPath = dbDirPath()
  fs.access(dirPath, (err) => {
    if (!err) return cb()
    fs.mkdir(dirPath, (err) => {
      if (err) throw new Error(err)
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
        if (err) throw new Error(err)
      })
    })
  })
}

module.exports = () => {
  createConfig()
  createMigrateDir()
}
