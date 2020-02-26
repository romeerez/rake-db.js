const {exec} = require("child_process")
const {getConfig, adapter} = require('./utils')

const execCreateOrDrop = (utility, config, callback) => {
  const command = utility + ' ' + config.database
  exec(command, async (error, stdout, stderr) => {
    if (error)
      console.error(error)
    else if (stderr)
      console.error(stderr)
    else {
      if (stdout.length)
        console.log(stdout)
      if (callback)
        await callback(config)
      const action = utility === 'createdb' ? 'created' : 'dropped'
      console.log(`Database ${config.database} was ${action} successfully`)
    }
  })
}

const createOrDrop = async (utility, callback) => {
  const config = await getConfig()
  for (let env in config)
    execCreateOrDrop(utility, config[env], callback)
}

schemaMigrationsSQL = 'CREATE TABLE schema_migrations ( version TEXT NOT NULL )'

const createSchemaMigrations = async (config) => {
  const db = adapter(config)
  await db.exec(schemaMigrationsSQL)
  db.close()
}

const createDb = () =>
  createOrDrop('createdb', createSchemaMigrations)

const dropDb = (config) =>
  createOrDrop('dropdb')

module.exports = {
  createDb, dropDb
}
