import {
  askAdminCreds,
  createSchemaMigrations,
  Creds,
  getConfig,
} from './utils'
import { Adapter } from 'pg-adapter'

const createOrDropDatabase = async (
  {
    sql,
    successMessage,
    alreadyMessage,
    createVersionsTable,
  }: {
    sql: string
    successMessage: string
    alreadyMessage: string
    createVersionsTable?: boolean
  },
  creds: Creds,
  adminCreds: Creds,
) => {
  const db = new Adapter(adminCreds)
  await db.connect()
  try {
    await db.exec(sql)
    console.log(successMessage)
  } catch (err) {
    if (err.code === '42P04' || err.code === '3D000') {
      console.log(alreadyMessage)
    } else if (err.code === '42501') {
      Object.assign(adminCreds, await askAdminCreds())
      await createOrDropDatabase(
        { sql, successMessage, alreadyMessage, createVersionsTable },
        creds,
        adminCreds,
      )
      return
    } else {
      throw err
    }
  } finally {
    await db.close()
  }

  if (!createVersionsTable) return

  const targetDb = new Adapter(creds)
  await createSchemaMigrations(targetDb)
  await targetDb.close()
}

const createOrDrop = async ({
  sql,
  successMessage,
  alreadyMessage,
  createVersionsTable,
}: {
  sql(config: Creds): string
  successMessage(config: Creds): string
  alreadyMessage(config: Creds): string
  createVersionsTable?: boolean
}) => {
  const { configs } = getConfig()
  const adminCreds = { ...configs[0], database: 'postgres' }
  for (const config of configs) {
    await createOrDropDatabase(
      {
        sql: sql(config),
        successMessage: successMessage(config),
        alreadyMessage: alreadyMessage(config),
        createVersionsTable,
      },
      config,
      adminCreds,
    )
  }
}

export const createDb = () => {
  createOrDrop({
    sql: ({ database, user }) =>
      `CREATE DATABASE "${database}" OWNER "${user}"`,
    successMessage: ({ database }) =>
      `Database ${database} successfully created`,
    alreadyMessage: ({ database }) => `Database ${database} already exists`,
    createVersionsTable: true,
  })
}

export const dropDb = () => {
  createOrDrop({
    sql: ({ database }) => `DROP DATABASE "${database}"`,
    successMessage: ({ database }) =>
      `Database ${database} successfully dropped`,
    alreadyMessage: ({ database }) => `Database ${database} does not exist`,
  })
}
