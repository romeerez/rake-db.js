import * as fs from 'fs'
import * as path from 'path'
import { getConfig, noop, createSchemaMigrations } from './utils'
import Migration from './migration'
import { Transaction } from 'pg-adapter'
import { errorCodes } from './errorCodes'
import { register } from 'ts-node'
import { Value } from 'pg-adapter/dist/lib/quote'

register({ compilerOptions: { module: 'CommonJS' } })

type MigrationFile = {
  version: string
  path: string
}

const getMigratedVersionsQuery = (db: Migration) =>
  db.value(
    `SELECT COALESCE(json_agg(version ORDER BY version), '[]')` +
      `FROM "public"."schemaMigrations"`,
  )

const getMigratedVersions = async (db: Migration) => {
  try {
    return await getMigratedVersionsQuery(db)
  } catch (err) {
    if (errorCodes[err.code as keyof typeof errorCodes] === 'undefined_table') {
      await createSchemaMigrations(db)
      return await getMigratedVersionsQuery(db)
    } else {
      throw err
    }
  }
}

const getFiles = (migrationsPath: string, rollback: boolean) =>
  new Promise((resolve, reject) => {
    fs.readdir(migrationsPath, (err, allFiles) => {
      if (err) return reject(err)
      if (rollback) allFiles.sort((a, b) => (a < b ? 1 : -1))
      else allFiles.sort()
      const files: MigrationFile[] = []
      allFiles.forEach((file) => {
        const arr = file.split('_')
        const match = file.match(/\..+$/)
        if (!match) return
        const ext = match[0]
        if (ext !== '.ts') return
        if (arr.length === 1) return
        const version = arr[0]
        if (version.length !== 14) return
        files.push({ version, path: file })
      })
      resolve(files)
    })
  })

export const run = async (
  db: Migration,
  fn: (t: Migration, up: boolean) => void | Promise<void>,
  version: string,
) => {
  await db.wrapperTransaction(db, async (t: Migration & Transaction) => {
    if (fn.toString().startsWith('async')) {
      await fn(t, !db.reverse)
    } else {
      if (!db.reverse) {
        fn(t, true)
      } else {
        const originalExec = t.exec
        const argsList: [string | Promise<string>, Value?][] = [] // eslint-disable-line
        t.exec = (...args) => {
          argsList.push(args)
          return Promise.resolve()
        }
        await fn(t, false)
        t.exec = originalExec
        for (const [sql, value] of argsList.reverse()) {
          await t.exec(sql, value)
        }
      }
    }
    await t.sync()
    if (t.failed) return
    const sql = db.reverse
      ? `DELETE FROM "public"."schemaMigrations" WHERE "version" = '${version}'`
      : `INSERT INTO "public"."schemaMigrations"
         VALUES ('${version}')`

    await t.exec(sql).catch(noop)
  })
}

type UserMigration = {
  change?: (t: Migration, up: boolean) => void | Promise<void>
  up?: (t: Migration) => void | Promise<void>
  down?: (t: Migration) => void | Promise<void>
  before?: (t: Migration, up: boolean) => void | Promise<void>
  after?: (t: Migration, up: boolean) => void | Promise<void>
}

const migrateFile = async (
  db: Migration,
  migrationsPath: string,
  version: string,
  file: string,
) => {
  const filePath = path.resolve(migrationsPath, file)
  const migration = require(filePath) as UserMigration
  if (!db.reverse && !migration.up && !migration.change)
    throw new Error(`Migration ${file} does not contain up or change exports`)
  else if (!migration.down && !migration.change)
    throw new Error(`Migration ${file} does not contain down or change exports`)

  if (migration.before) {
    await migration.before(db, !db.reverse)
  }

  for (const key in migration) {
    if (key === (db.reverse ? 'down' : 'up') || key === 'change') {
      await run(
        db,
        (migration[key] as unknown) as Exclude<
          UserMigration['change'],
          undefined
        >,
        version,
      )
    }
  }

  if (migration.after) {
    await migration.after(db, !db.reverse)
  }

  console.info(`${filePath} ${db.reverse ? 'rolled back' : 'migrated'}`)
}

const migrateDb = async (
  db: Migration,
  migrationsPath: string,
  files: MigrationFile[],
) => {
  for (const { path, version } of files) {
    try {
      await migrateFile(db, migrationsPath, version, path)
    } catch (err) {
      console.error(err)
      break
    }
  }
}

const migrateOrRollbackDatabase = async (
  rollback: boolean,
  db: Migration,
  migrationsPath: string,
) => {
  await db.connect()

  let [files, versions] = (await Promise.all([
    getFiles(migrationsPath, rollback),
    getMigratedVersions(db),
  ])) as [MigrationFile[], string]

  versions = JSON.parse(versions as string)

  if (rollback) {
    const lastVersion = versions[versions.length - 1]
    if (!lastVersion) {
      files = []
    } else {
      const lastFile = files.find(
        ({ version }) => version === lastVersion,
      ) as MigrationFile
      files = [lastFile]
    }
  } else {
    files = files.filter((file) => !versions.includes(file.version))
  }

  if (files.length) await migrateDb(db, migrationsPath, files)
}

const migrateOrRollback = async (rollback: boolean) => {
  const { migrationsPath, configs } = await getConfig()
  for (const config of configs) {
    const db = new Migration({ ...config, reverse: rollback })
    try {
      await migrateOrRollbackDatabase(rollback, db, migrationsPath)
    } catch (err) {
      if (
        errorCodes[err.code as keyof typeof errorCodes] ===
        'invalid_catalog_name'
      ) {
        console.error(err.message)
      } else {
        console.error(err)
      }

      break
    } finally {
      db.close()
    }
  }
}

export const migrate = () => migrateOrRollback(false)

export const rollback = () => migrateOrRollback(true)
