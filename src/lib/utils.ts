// import * as path from 'path'
// import * as fs from 'fs'
// import { Adapter, parseUrl } from 'pg-adapter'
// import ErrnoException = NodeJS.ErrnoException
// import { DbConfigs, DbConfig } from '../types'
// import { config as dotenvConfig } from 'dotenv'
//
// export const DbConfigsPath = () => process.env.DB_CONFIG_PATH
//
// export const dbDirPath = () =>
//   process.env.DB_DIR_PATH || path.join(process.cwd(), 'db')
//
// export const dbMigratePath = () => path.join(dbDirPath(), 'migrate')
//
// const search = ['database.js', path.join('config', 'database.js')]
//
// export const readFile = (path: string) =>
//   <Promise<Buffer>>new Promise((resolve, reject) => {
//     fs.readFile(path, (err, content) => {
//       if (err) return reject(err)
//       resolve(content)
//     })
//   })
//
// const getConfigSource = () => {
//   const filePath = DbConfigsPath()
//   if (filePath) return readFile(filePath)
//
//   return <Promise<Buffer>>new Promise((resolve) => {
//     let { length } = search
//     let data: Buffer
//     const callback = (err: ErrnoException | null, content: Buffer) => {
//       if (content) data = content
//       if (--length === 0) resolve(data)
//     }
//     search.forEach((filePath) =>
//       fs.readFile(path.join(process.cwd(), filePath), callback),
//     )
//   })
// }
//
// const parseConfig = async () => {
//   const js: Buffer = await getConfigSource()
//   if (!js)
//     throwError(
//       'Database config is not found!\n' +
//         'Please specify env variable DATABASE_URL=postgres://user:password@host:port/database in .env file or in command\n' +
//         'or put config to one of the files:\n' +
//         search.join('\n'),
//     )
//
//   try {
//     return eval(js.toString())
//   } catch (err) {
//     throwError(`Failed to parse database config: ${err.message}`)
//   }
// }
//
// const validateConfig = (config: DbConfigs) => {
//   const invalidEnvs: string[] = []
//   const validConfigs: DbConfigs = {}
//   for (const env in config) {
//     if (config[env].url || config[env].database) validConfigs[env] = config[env]
//     else invalidEnvs.push(env)
//   }
//   if (Object.keys(validConfigs).length !== 0) return validConfigs
//   throwError(
//     'Invalid database config:\n' +
//       `database option is required and not found in ${invalidEnvs.join(
//         ', ',
//       )} environments`,
//   )
// }
//
// const getDatabaseUrlFromDotEnv = () => {
//   const { parsed } = dotenvConfig()
//   return parsed && parsed.DATABASE_URL
// }
//
// let camelCase = true
// let cacheConfig: undefined | DbConfigs = undefined
// export const getConfig = async () => {
//   if (!cacheConfig) {
//     const url = process.env.DATABASE_URL || getDatabaseUrlFromDotEnv()
//     const config = (url && { default: parseUrl(url) }) || (await parseConfig())
//     if ('camelCase' in config) {
//       camelCase = config.camelCase
//       delete config.camelCase
//     }
//     cacheConfig = validateConfig(config)
//   }
//   return cacheConfig
// }
//
// export const adapter = (config: DbConfig, Class = Adapter, params = {}) => {
//   if (config.url)
//     return Class.fromURL(config.url, { pool: 1, log: false, ...params })
//   else return new Class({ ...config, pool: 1, log: false, ...params })
// }
//
//
// export const throwError = (message: string) => {
//   console.error(message)
//   process.exit(1)
// }

import fs from 'fs'
import { Adapter, parseUrl } from 'pg-adapter'
import { config } from 'dotenv'
import path from 'path'

const { Snippet } = require('enquirer')

export type Creds = {
  database: string
  user: string
  password: string
  host: string
  port: number
}

let camelCase = true

export const noop = () => {
  // noop
}

export const join = (...args: string[]) => {
  if (camelCase)
    return (
      args[0] +
      args
        .slice(1)
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join('')
    )
  else return args.map((word) => word.toLowerCase()).join('_')
}

export const mkdirRecursive = (inputPath: string) => {
  if (fs.existsSync(inputPath)) return
  const basePath = path.dirname(inputPath)
  if (!fs.existsSync(basePath)) mkdirRecursive(basePath)
  fs.mkdirSync(inputPath)
}

export const getConfig = (): {
  camelCase: boolean
  migrationsPath: string
  configs: Creds[]
} => {
  config()

  camelCase = process.env.DATABASE_CAMEL_CASE === 'false' ? false : true
  const migrationsPath = process.env.MIGRATIONS_PATH
  if (!migrationsPath) throw new Error('MIGRATIONS_PATH variable is not set')
  const databasesString = process.env.DATABASES
  if (!databasesString) throw new Error('DATABASES variable is not set')
  const databases = databasesString.split(',')
  const databasesURLs = databases.map((key) => process.env[key])
  const absentIndex = databasesURLs.findIndex((url) => !url)
  if (absentIndex !== -1)
    throw new Error(
      `DATABASES env variable contains ${databases[absentIndex]}, but ${databases[absentIndex]} variable is not set`,
    )

  return {
    camelCase,
    migrationsPath,
    configs: databasesURLs.map(parseUrl),
  }
}

export const askAdminCreds = async (
  { user, password }: { user: string; password: string } = {
    user: 'postgres',
    password: '',
  },
) => {
  const adminCredsPrompt = new Snippet({
    message: `What are postgres admin login and password?`,
    fields: [
      {
        name: 'user',
        required: true,
      },
      {
        name: 'password',
      },
    ],
    values: {
      user,
      password,
    },
    template: 'Admin user: {{user}}\nAdmin password: {{password}}',
  })

  const { values } = await adminCredsPrompt.run()
  if (!values.password) values.password = ''

  return { user, password }
}

export const createSchemaMigrations = async (db: Adapter) => {
  try {
    await db.connect()
    await db.exec(
      'CREATE TABLE IF NOT EXISTS "schemaMigrations" ( version TEXT NOT NULL )',
    )
    console.log('Created versions table')
  } catch (err) {
    if (err.code === '42P07') {
      console.log('Versions table exists')
    } else {
      throw err
    }
  }
}
