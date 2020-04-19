import path from 'path'
import fs from 'fs'
import {Adapter, parseUrl} from 'pg-adapter'
import ErrnoException = NodeJS.ErrnoException
import {DbConfig} from '../types'

export const dbConfigPath = () =>
  process.env.DB_CONFIG_PATH

export const dbDirPath = () =>
  process.env.DB_DIR_PATH || path.join(process.cwd(), 'db')

export const dbMigratePath = () =>
  path.join(dbDirPath(), 'migrate')

const search = [
  'database.json',
  path.join('config', 'database.json'),
]

export const readFile = (path: string) => <Promise<Buffer>>new Promise((resolve, reject) => {
  fs.readFile(path, (err, content) => {
    if (err) return reject(err)
    resolve(content)
  })
})

const getConfigSource = () => {
  const filePath = dbConfigPath()
  if (filePath)
    return readFile(filePath)

  return <Promise<Buffer>>new Promise((resolve) => {
    let {length} = search
    let data: Buffer
    const callback = (err: ErrnoException | null, content: Buffer) => {
      if (content) data = content
      if (--length === 0)
        resolve(data)
    }
    search.forEach(filePath =>
      fs.readFile(path.join(process.cwd(), filePath), callback)
    )
  })
}

const parseConfig = async () => {
  const json: Buffer = await getConfigSource()
  if (!json)
    throw new Error(
      'Database config not found, expected to find it somewhere here:\n' +
      search.join('\n')
    )

  try {
    return JSON.parse(json.toString())
  } catch (err) {
    throw new Error(`Failed to parse database config: ${err.message}`)
  }
}

const validateConfig = (config: DbConfig) => {
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
export const getConfig = async () => {
  let config
  const url = process.env.DATABASE_URL
  config = url ? {default: parseUrl(url)} : await parseConfig()
  if ('camelCase' in config) {
    camelCase = config.camelCase
    delete config.camelCase
  }
  validateConfig(config)
  return config
}

export const adapter = (config: DbConfig, Class = Adapter, params = {}) =>
  new Class({ ...config, pool: 1, log: false, ...params })

export const join = (...args: string[]) => {
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

export const noop = () => {}
