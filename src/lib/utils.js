const path = require('path')
const fs = require('fs')
// const {Adapter} = require('pg-adapter')
const {Adapter} = require('pg-adapter')

const dbConfigPath = () =>
  process.env.DB_CONFIG_PATH

const dbDirPath = () =>
  process.env.DB_DIR_PATH || path.join(process.cwd(), 'db')

const dbMigratePath = () =>
  path.join(dbDirPath(), 'migrate')

const search = [
  'database.json',
  path.join('config', 'database.json'),
]

const readFile = (path) => new Promise((resolve, reject) => {
  fs.readFile(path, (err, content) => {
    if (err) return reject(err)
    resolve(content)
  })
})

const getConfigSource = () =>
  new Promise((resolve) => {
    const filePath = dbConfigPath()
    if (filePath)
      return readFile(filePath, resolve)

    let {length} = search
    let data
    callback = (err, content) => {
      if (!err) data = content
      if (--length === 0)
        resolve(data)
    }
    search.forEach(filePath =>
      fs.readFile(path.join(process.cwd(), filePath), callback)
    )
  })

const parseConfig = (json) => {
  try {
    return JSON.parse(json)
  } catch (err) {
    throw new Error(`Failed to parse database config: ${err.message}`)
  }
}

const validateConfig = (config) => {
  const noDatabase = []
  for (let env in config) {
    if (!config[env].database) {
      noDatabase.push(env)
    }
  }
  if (noDatabase.length) {
    throw new Error(
      'Invalid database config:\n' +
      'database option is required and not found in ' +
      noDatabase.join(', ') + ' environments'
    )
  }
}

let camelCase = true
const getConfig = async () => {
  const configSource = await getConfigSource()
  if (!configSource)
    throw new Error(
      'Database config not found, expected to find it somewhere here:\n' +
      search.join('\n')
    )

  let config = parseConfig(configSource)
  if ('camelCase' in config) {
    camelCase = config.camelCase
    delete config.camelCase
  }
  validateConfig(config)
  return config
}

const adapter = (config, Class = Adapter, params = {}) =>
  new Class({ ...config, pool: 1, log: false, ...params })

const join = (...args) => {
  if (camelCase)
    return (
      args[0] +
      args.slice(1).map(word =>
        word[0].toUpperCase() + word.slice(1)
      ).join('')
    )
  else
    return args.map(word => word.toLowerCase()).join('_')
}

module.exports = {
  noop: () => {},
  join, dbConfigPath, dbDirPath, dbMigratePath, getConfig, readFile, adapter
}
