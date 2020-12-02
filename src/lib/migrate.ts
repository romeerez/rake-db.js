import * as fs from 'fs'
import * as path from 'path'
import { getConfig, noop, createSchemaMigrations } from './utils'
import Migration from './migration'
import { Transaction } from 'pg-adapter'
import 'typescript-require'

type MigrationFile = {
  version: string
  path: string
}

const getMigratedVersionsQuery = (db: Migration) =>
  db.value(
    `SELECT COALESCE(json_agg("schemaMigrations".version ORDER BY version), '[]')` +
      `FROM "schemaMigrations"`,
  )

const getMigratedVersions = async (db: Migration) => {
  try {
    return await getMigratedVersionsQuery(db)
  } catch (err) {
    if (err.message === 'relation "schema_migrations" does not exist') {
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

const run = (
  db: Migration,
  fn: (t: Migration, up: boolean) => void,
  version: string,
) =>
  db.wrapperTransaction(db, async (t: Migration & Transaction) => {
    fn(t, !db.reverse)
    await t.sync()
    if (t.failed) return
    const sql = db.reverse
      ? `DELETE FROM "schemaMigrations" WHERE "version" = '${version}'`
      : `INSERT INTO "schemaMigrations" VALUES ('${version}')`

    t.exec(sql).catch(noop)
  })

const migrateFile = async (
  db: Migration,
  migrationsPath: string,
  version: string,
  file: string,
) => {
  const filePath = path.resolve(migrationsPath, file)
  const migration = require(filePath)
  if (!db.reverse && !migration.up && !migration.change)
    throw new Error(`Migration ${file} does not contain up or change exports`)
  else if (!migration.down && !migration.change)
    throw new Error(`Migration ${file} does not contain down or change exports`)

  for (const key in migration)
    if (key === (db.reverse ? 'down' : 'up') || key === 'change')
      await run(db, migration[key], version)

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

const migrateOrRollback = async (rollback: boolean) => {
  let db
  try {
    const { migrationsPath, configs } = await getConfig()
    for (const config of configs) {
      db = new Migration({ ...config, reverse: rollback })
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
      } else files = files.filter((file) => !versions.includes(file.version))

      if (files.length) await migrateDb(db, migrationsPath, files)

      db.close()
    }
  } catch (err) {
    if (db) db.close()
    console.error(err)
  }
}

export const migrate = () => migrateOrRollback(false)

export const rollback = () => migrateOrRollback(true)
