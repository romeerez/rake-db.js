import {exec} from 'child_process'
import {getConfig} from './utils'
import {createForConfig} from './versionsTable'
import {DbConfig} from '../types'

type CallbackType = (config: DbConfig) => any

const execCreateOrDrop = (utility: string, config: DbConfig, callback?: CallbackType) => {
  const command = utility + ' ' + config.database
  exec(command, async (error, stdout, stderr) => {
    if (stderr)
      console.error(stderr.trim())
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

const createOrDrop = async (utility: string, callback?: CallbackType) => {
  let config
  try {
    config = await getConfig()
  } catch (err) {
    return
  }
  for (let env in config)
    execCreateOrDrop(utility, config[env], callback)
}

export const createDb = () =>
  createOrDrop('createdb', createForConfig)

export const dropDb = () =>
  createOrDrop('dropdb')
