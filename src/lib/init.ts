import * as fs from 'fs'
import * as path from 'path'
import { Adapter, parseUrl } from 'pg-adapter'
import { config } from 'dotenv'
import { Creds, askAdminCreds, mkdirRecursive } from './utils'

const { Snippet, Confirm, Input, Select } = require('enquirer')

type AdminCreds = Creds & { asked: boolean }

const checkEnv = () => {
  let envExists = false
  try {
    const stat = fs.statSync(`${process.cwd()}/.env`)
    if (!stat.isFile()) {
      if (stat.isDirectory()) {
        throw new Error("Found .env, but it's a directory, fix it please")
      } else {
        throw new Error(
          "Found .env, but not a file, it's something unusual, please fix it",
        )
      }
    }
    console.log('Found .env file')
    envExists = true
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Some problem with .env file')
      throw err
    }
  }

  return envExists
}

const askDatabaseCreds = async (
  { database, user, password, host, port }: Creds,
  adminCreds: AdminCreds,
): Promise<Creds> => {
  const credsPrompt = new Snippet({
    message: 'Enter database credentials',
    fields: [
      {
        name: 'database',
        required: true,
      },
      {
        name: 'user',
        required: true,
      },
      {
        name: 'password',
        required: false,
      },
      {
        name: 'host',
        required: true,
      },
      {
        name: 'port',
        required: true,
      },
    ],
    values: {
      database,
      user,
      password,
      host,
      port: String(port),
    },
    template:
      'Database name: {{database}}\nUser: {{user}}\nPassword: {{password}}\nHost: {{host}}\nPort: {{port}}',
  })

  const { values } = await credsPrompt.run()
  if (!values.password) values.password = ''

  return await tryDatabaseCreds(values, adminCreds)
}

const tryDatabaseCreds = async (
  creds: Creds,
  adminCreds: AdminCreds,
): Promise<Creds> => {
  const db = new Adapter(creds)
  try {
    await db.connect()
    await db.close()
  } catch (err) {
    console.log(`Error: ${err.message}`)

    const choices = [
      'Edit config',
      `Create database with owner ${creds.user}`,
      `Create both user and database`,
      `Create a user ${creds.user}`,
    ]
    const prompt = new Select({
      message: 'How can I help?',
      choices: [...choices],
    })
    const answer = await prompt.run()
    const index = choices.indexOf(answer)
    if (index === 0) return await askDatabaseCreds(creds, adminCreds)
    else if (index === 1) await createDatabase(creds, adminCreds)
    else if (index === 2) {
      await createUser(creds, adminCreds)
      await createDatabase(creds, adminCreds)
    } else if (index === 3) await createUser(creds, adminCreds)
    return await tryDatabaseCreds(creds, adminCreds)
  }

  return creds
}

const askCamelCase = () =>
  new Confirm({
    message: 'Should it use camelCase for tables and columns names?',
    initial: process.env.DATABASE_CAMEL_CASE === 'false' ? 'n' : 'y',
  }).run()

const askTestDb = async (creds: Creds, adminCreds: AdminCreds) => {
  const prompt = new Confirm({
    message: 'Do you also want to have database for tests?',
  })

  if (!(await prompt.run())) return

  return await askDatabaseCreds(
    {
      ...creds,
      database: `${creds.database}-test`,
    },
    adminCreds,
  )
}

const createMigrationsPath = async () => {
  const prompt = new Input({
    message: 'Where to store migrations files?',
    initial: process.env.MIGRATIONS_PATH || `db${path.sep}migrate`,
  })

  const migrationsPath = await prompt.run()
  mkdirRecursive(migrationsPath)
  return migrationsPath
}

const createDatabase = async (creds: Creds, adminCreds: AdminCreds) => {
  const db = await adminDatabase(adminCreds)
  try {
    await db.exec(`CREATE DATABASE "${creds.database}" OWNER "${creds.user}"`)
    await db.close()
  } catch (err) {
    console.error(`Error: ${err.message}`)
    adminCreds.asked = false
  }
}

const createUser = async (creds: Creds, adminCreds: AdminCreds) => {
  const { user } = creds
  const db = await adminDatabase(adminCreds)
  const superUserPrompt = new Confirm({
    message: `Do you want ${user} to be a "superuser"?`,
  })
  const isSuperUser = await superUserPrompt.run()
  try {
    await db.exec(
      `CREATE ROLE "${user}" ${isSuperUser ? 'SUPERUSER' : 'LOGIN'}`,
    )
    await db.close()
  } catch (err) {
    await db.close()
    console.error(`Error: ${err.message}`)
    adminCreds.asked = false
    await createUser(creds, adminCreds)
  }
}

const adminDatabase = async (creds: AdminCreds): Promise<Adapter> => {
  if (!creds.asked) {
    Object.assign(creds, await askAdminCreds(creds))
    creds.asked = true
  }

  try {
    const db = new Adapter(creds)
    await db.connect()
    return db
  } catch (err) {
    console.log(`Error: ${err.message}`)
    creds.asked = false
    return await adminDatabase(creds)
  }
}

const createDatabaseURL = (creds: Creds) =>
  `postgres://${creds.user}:${creds.password}@${creds.host}:${creds.port}/${creds.database}`

const makeEnvData = (
  creds: Creds,
  camelCase: boolean,
  migrationsPath: string,
  testDbCreds?: Creds,
) => {
  const data: string[][] = [['DATABASE_URL', createDatabaseURL(creds)]]
  const dbs = ['DATABASE_URL']
  if (testDbCreds) {
    data.push(['DATABASE_URL_TEST', createDatabaseURL(testDbCreds)])
    dbs.push('DATABASE_URL_TEST')
  }
  data.push(['DATABASE_CAMEL_CASE', camelCase ? 'true' : 'false'])
  data.push(['MIGRATIONS_PATH', migrationsPath])
  data.push(['DATABASES', dbs.join(',')])

  return data
}

export default async () => {
  const envExists = checkEnv()
  if (envExists) config()

  let initialCreds: Creds | undefined = undefined
  if (process.env.DATABASE_URL)
    try {
      initialCreds = parseUrl(process.env.DATABASE_URL)
    } catch (err) {
      // noop
    }

  if (!initialCreds) {
    const cwdArray = process.cwd().split(path.sep)
    const defaultName = cwdArray[cwdArray.length - 1]

    initialCreds = {
      database: defaultName,
      user: process.env.USER || '',
      password: '',
      host: 'localhost',
      port: 5432,
    }
  }

  const adminCreds: AdminCreds = {
    ...initialCreds,
    database: 'postgres',
    user: 'postgres',
    asked: false,
  }

  const creds = await askDatabaseCreds(initialCreds, adminCreds)

  const initialTestDbCreds = creds
  if (process.env.DATABASE_URL_TEST) {
    try {
      const parsed = parseUrl(process.env.DATABASE_URL_TEST)
      if (parsed.database) initialTestDbCreds.database = parsed.database
    } catch (err) {
      // noop
    }
  }
  const testDbCreds = await askTestDb(initialTestDbCreds, adminCreds)

  const camelCase = await askCamelCase()
  const migrationsPath = await createMigrationsPath()

  const data = makeEnvData(creds, camelCase, migrationsPath, testDbCreds)
  const envPath = path.resolve(process.cwd(), '.env')
  let content: string
  try {
    content = fs.readFileSync(envPath, 'utf-8')
    data.forEach(([key, value]) => {
      let found = false
      content = content.replace(
        new RegExp(`(\n*)s*${key}*=[^\n]*`),
        (_, newLine) => {
          found = true
          return `${newLine}${key}=${value}`
        },
      )
      if (!found)
        content = `${content}${content.length ? '\n' : ''}${key}=${value}`
    })
  } catch (err) {
    if (err.code === 'ENOENT') {
      content = data.map((pair) => pair.join('=')).join('\n')
    } else {
      console.log(`Error while accessing the .env file`)
      throw err
    }
  }

  fs.writeFileSync(envPath, content)

  console.log("Setup's ready!")
}
