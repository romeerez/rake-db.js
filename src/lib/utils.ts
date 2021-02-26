import fs from 'fs'
import { Adapter, parseUrl } from 'pg-adapter'
import { config } from 'dotenv'
import path from 'path'
import { defaultCamelCase, defaultMigrationsPath } from './defaults'

const { Snippet } = require('enquirer')

export type Creds = {
  database: string
  user: string
  password: string
  host: string
  port: number
}

let camelCase = false

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

  const camelCaseEnv = process.env.DATABASE_CAMEL_CASE
  camelCase =
    camelCaseEnv === 'true'
      ? true
      : camelCaseEnv === 'false'
      ? false
      : defaultCamelCase

  const migrationsPath = process.env.MIGRATIONS_PATH || defaultMigrationsPath

  const databasesString = process.env.DATABASES
  const databaseURL = process.env.DATABASE_URL

  let databasesURLs: string[]
  if (databasesString) {
    const databases = databasesString.split(',')
    const urls = databases.map((key) => process.env[key])
    const absentIndex = urls.findIndex((url) => !url)
    if (absentIndex !== -1)
      throw new Error(
        `DATABASES env variable contains ${databases[absentIndex]}, but ${databases[absentIndex]} variable is not set`,
      )

    databasesURLs = urls as string[]
  } else if (databaseURL) {
    databasesURLs = [databaseURL]
  } else {
    throw new Error('One of DATABASES or DATABASE_URL env variable must be set')
  }

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
