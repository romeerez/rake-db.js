import {getConfig, adapter} from './utils'
import {DbConfig} from '../types'

const schemaMigrationsSQL = 'CREATE TABLE schema_migrations ( version TEXT NOT NULL )'

export const createForConfig = async (config: DbConfig) => {
  const db = adapter(config)
  await db.exec(schemaMigrationsSQL)
  db.close()
}

export const create = async () => {
  let config
  try { config = await getConfig() } catch (err) { return }
  for (let env in config) {
    const envConfig = config[env]
    createForConfig(envConfig)
  }
}
