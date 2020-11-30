import { exec } from 'child_process'
import { getConfig } from './utils'
import { createForConfig } from './versionsTable'
import { DbConfig } from '../types'
import { parseUrl } from 'pg-adapter'

type CallbackType = (config: DbConfig) => void

const execCreateOrDrop = (
  utility: string,
  config: DbConfig,
  callback?: CallbackType,
) => {
  if (config.url) config = parseUrl(config.url)
  let command = utility
  if (config.host) command += ' -h ' + config.host
  if (config.port) command += ' -p ' + config.port
  if (config.user) command += ' -U ' + config.user
  command += ' ' + config.database
  exec(command, async (error, stdout, stderr) => {
    if (stderr) console.error(stderr.trim())
    else {
      if (stdout.length) console.log(stdout)
      if (callback) await callback(config)
      const action = utility === 'createdb' ? 'created' : 'dropped'
      console.log(`Database ${config.database} was ${action} successfully`)
    }
  })
}

const createOrDrop = async (utility: string, callback?: CallbackType) => {
  const config = await getConfig()
  for (const env in config) execCreateOrDrop(utility, config[env], callback)
}

export const createDb = () => createOrDrop('createdb', createForConfig)

export const dropDb = () => createOrDrop('dropdb')
