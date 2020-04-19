import fs from 'fs'
import path from 'path'
import {getConfig, adapter, dbMigratePath, noop} from './utils'
import Migration from './migration'
import {Transaction} from 'pg-adapter'

type MigrationFile = {
  version: string,
  path: string,
}

const getMigratedVersions = (db: Migration) =>
  db.value(
    `SELECT COALESCE(json_agg(schema_migrations.version ORDER BY version), '[]')` +
    `FROM schema_migrations`
  )

const getFiles = (rollback: boolean) => new Promise((resolve, reject) => {
  fs.readdir(dbMigratePath(), (err, allFiles) => {
    if (err) return reject(err)
    if (rollback)
      allFiles.sort((a, b) => a < b ? 1 : -1)
    else
      allFiles.sort()
    const files: MigrationFile[] = []
    allFiles.forEach((file, i, all) => {
      const arr = file.split('_')
      const match = file.match(/\..+$/)
      if (!match) return
      const ext = match[0]
      if (ext !== '.js') return
      if (arr.length === 1) return
      const version = arr[0]
      if (version.length !== 14) return
      files.push({version, path: file})
    })
    resolve(files)
  })
})

const run = (db: Migration, fn: (t: Migration) => any, version: string) => {
  const {promise} = db.wrapperTransaction(db, async (t: Migration & Transaction) => {
    fn(t)
    await t.sync()
    const sql =
      db.reverse ?
        `DELETE FROM schema_migrations WHERE version = '${version}'` :
        `INSERT INTO schema_migrations VALUES ('${version}')`

    t.exec(sql).catch(noop)
  })
  return promise
}

const migrateFile = async (db: Migration, version: string, file: string) => {
  const filePath = path.resolve(dbMigratePath(), file)
  const migration = require(filePath)
  if (!db.reverse && !migration.up && !migration.change)
    throw new Error(`Migration ${file} does not contain up or change exports`)
  else if (!migration.down && !migration.change)
    throw new Error(`Migration ${file} does not contain down or change exports`)

  for (let key in migration)
    if (key === (db.reverse ? 'down' : 'up') || key === 'change')
      await run(db, migration[key], version)

  console.info(`${filePath} ${db.reverse ? 'rolled back' : 'migrated'}`)
}

const migrateDb = async (db: Migration, files: MigrationFile[]) => {
  for (let {path, version} of files) {
    try {
      await migrateFile(db, version, path)
    } catch (err) {
      console.error(err)
      break
    }
  }
}

const migrateOrRollback = async (rollback: boolean) => {
  let db
  try {
    const configs = await getConfig()
    for (let env in configs) {
      const config = configs[env]
      db = <Migration>adapter(config, Migration, {reverse: rollback})
      await db.connect()
      let [files, versions] = (
        await Promise.all([getFiles(rollback), getMigratedVersions(db)])
      ) as [MigrationFile[], string]
      versions = JSON.parse(versions as string)
      if (rollback) {
        const lastVersion = versions[versions.length - 1]
        if (!lastVersion) {
          files = []
        } else {
          const lastFile = files.find(({version}) => version === lastVersion) as MigrationFile
          files = [lastFile]
        }
      } else
        files = files.filter(file => !versions.includes(file.version))

      if (files.length)
        await migrateDb(db, files)

      db.close()
    }
  } catch (err) {
    if (db) db.close()
    console.error(err)
  }
}

export const migrate = () => migrateOrRollback(false)

export const rollback = () => migrateOrRollback(true)
