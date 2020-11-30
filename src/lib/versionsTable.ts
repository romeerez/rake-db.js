import { getConfig, adapter } from './utils'
import { DbConfig } from '../types'
import Migration from './migration'

const schemaMigrationsSQL =
  'CREATE TABLE schema_migrations ( version TEXT NOT NULL )'

export const createSchemaMigrations = (db: Migration) =>
  db.exec(schemaMigrationsSQL)

export const createForConfig = async (config: DbConfig) => {
  const db = adapter(config)
  await db.exec(schemaMigrationsSQL)
  db.close()
}

export const create = async () => {
  let config
  try {
    config = await getConfig()
  } catch (err) {
    return
  }
  for (const env in config) {
    const envConfig = config[env]
    createForConfig(envConfig)
  }
}
