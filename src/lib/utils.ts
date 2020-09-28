import * as path from 'path'
import * as fs from 'fs'
import {Adapter, parseUrl} from 'pg-adapter'
import ErrnoException = NodeJS.ErrnoException
import {DbConfigs, DbConfig} from '../types'
import { config as dotenvConfig } from 'dotenv'

export const DbConfigsPath = () =>
  process.env.DB_CONFIG_PATH

export const dbDirPath = () =>
  process.env.DB_DIR_PATH || path.join(process.cwd(), 'db')

export const dbMigratePath = () =>
  path.join(dbDirPath(), 'migrate')

const search = [
  'database.js',
  path.join('config', 'database.js'),
]

export const readFile = (path: string) => <Promise<Buffer>>new Promise((resolve, reject) => {
  fs.readFile(path, (err, content) => {
    if (err) return reject(err)
    resolve(content)
  })
})

const getConfigSource = () => {
  const filePath = DbConfigsPath()
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
  const js: Buffer = await getConfigSource()
  if (!js)
    throwError(
      'Database config is not found!\n' +
      'Please specify env variable DATABASE_URL=postgres://user:password@host:port/database in .env file or in command\n' +
      'or put config to one of the files:\n' +
      search.join('\n')
    )

  try {
    return eval(js.toString())
  } catch (err) {
    throwError(`Failed to parse database config: ${err.message}`)
  }
}

const validateConfig = (config: DbConfigs) => {
  const invalidEnvs: string[] = []
  let validConfigs: DbConfigs = {}
  for (let env in config) {
    if (config[env].url || config[env].database)
      validConfigs[env] = config[env]
    else
      invalidEnvs.push(env)
  }
  if (Object.keys(validConfigs).length !== 0)
    return validConfigs
  throwError(
    'Invalid database config:\n' +
    `database option is required and not found in ${invalidEnvs.join(', ')} environments`
  )
}

const getDatabaseUrlFromDotEnv = () => {
  const { parsed } = dotenvConfig()
  return parsed && parsed.DATABASE_URL
}

let camelCase = true
let cacheConfig: undefined | DbConfigs = undefined
export const getConfig = async () => {
  if (!cacheConfig) {
    let config
    const url = process.env.DATABASE_URL || getDatabaseUrlFromDotEnv()
    config = url && { default: parseUrl(url) } || await parseConfig()
    if ('camelCase' in config) {
      camelCase = config.camelCase
      delete config.camelCase
    }
    cacheConfig = validateConfig(config)
  }
  return cacheConfig
}

export const adapter = (config: DbConfig, Class = Adapter, params = {}) => {
  if (config.url)
    return Class.fromURL(config.url, {pool: 1, log: false, ...params})
  else
    return new Class({...config, pool: 1, log: false, ...params})
}

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

export const throwError = (message: string) => {
  console.error(message)
  process.exit(1)
}
