const {getConfig, adapter} = require('./utils')

schemaMigrationsSQL = 'CREATE TABLE schema_migrations ( version TEXT NOT NULL )'

const createForConfig = async (config) => {
  const db = adapter(config)
  await db.exec(schemaMigrationsSQL)
  db.close()
}

exports.createForConfig = createForConfig

exports.create = async () => {
  let config
  try { config = await getConfig() } catch (err) { return }
  for (let env in config) {
    const envConfig = config[env]
    createForConfig(envConfig)
  }
}
