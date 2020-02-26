const fs = require('fs')
const path = require('path')
const {getConfig, adapter, dbMigratePath, noop} = require('./utils')
const schema = require('./schema')

const getMigratedVersions = (db) =>
  db.value(
    `SELECT COALESCE(json_agg(schema_migrations.version ORDER BY version), '[]')` +
    `FROM schema_migrations`
  )

const getFiles = (rollback) => new Promise((resolve, reject) => {
  fs.readdir(dbMigratePath(), (err, allFiles) => {
    if (err) return reject(err)
    if (rollback)
      allFiles.sort((a, b) => a < b ? 1 : -1)
    else
      allFiles.sort()
    const files = []
    allFiles.forEach(file => {
      const arr = file.split('_')
      if (arr.length === 1) return
      const version = arr[0]
      if (version.length !== 14) return
      files.push({version, path: file})
    })
    resolve(files)
  })
})

const migrate = (db, fn, version) =>
  db.transaction(async (t) => {
    try {
      fn(t)
      await t.sync()
      const sql =
        db.reverse ?
          `DELETE FROM schema_migrations WHERE version = '${version}'` :
          `INSERT INTO schema_migrations VALUES ('${version}')`

      t.exec(sql).catch(noop)
      t.commit()
    } catch (err) {

    }
  })

const migrateFile = async (db, version, file) => {
  const filePath = path.resolve(dbMigratePath(), file)
  const migration = require(filePath)
  if (!db.reverse && !migration.up && !migration.change)
    throw new Error(`Migration ${file} does not contain up or change exports`)
  else if (!migration.down && !migration.change)
    throw new Error(`Migration ${file} does not contain down or change exports`)

  for (let key in migration)
    if (key === db.reverse ? 'down' : 'up' || key === 'change')
      await migrate(db, migration[key], version)

  console.info(`${filePath} ${db.reverse ? 'rolled back' : 'migrated'}`)
}

const migrateDb = async (db, files) => {
  for (let {path, version} of files) {
    try {
      await migrateFile(db, version, path)
    } catch (err) {
      console.error(err)
      break
    }
  }
}

const migrateOrRollback = async (args, rollback) => {
  const configs = await getConfig()
  for (let env in configs) {
    const config = configs[env]
    const db = adapter(config, schema, {reverse: rollback})
    await db.connect()
    let [files, versions] = await Promise.all([getFiles(rollback), getMigratedVersions(db)])
    versions = JSON.parse(versions)
    if (rollback) {
      const lastVersion = versions[versions.length - 1]
      if (!lastVersion) {
        files = []
      } else {
        const lastFile = files.find(({version}) => version === lastVersion)
        files = [lastFile]
      }
    } else
      files = files.filter(file => !versions.includes(file.version))

    if (files.length)
      await migrateDb(db, files)

    db.close()
  }
}

exports.migrate = (args) => migrateOrRollback(args, false)

exports.rollback = (args) => migrateOrRollback(args, true)
