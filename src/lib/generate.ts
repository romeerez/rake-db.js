import * as fs from 'fs'
import * as path from 'path'
import { getConfig, mkdirRecursive } from './utils'

const generateFileContent = (name: string, args: string[]) => {
  const lines = [
    "import { Migration } from 'rake-db'\n\nexport const change = (db: Migration, up: boolean) => {",
  ]

  let command: string | undefined = undefined
  if (name.startsWith('create_')) command = 'create'
  else if (name.startsWith('change_')) command = 'change'
  else if (name.startsWith('add_')) command = 'add'
  else if (name.startsWith('remove_')) command = 'remove'
  else if (name.startsWith('drop_')) command = 'drop'

  if (command) {
    name = name.slice(command.length + 1)
    const hasColumns =
      command === 'drop' && args.find((arg) => arg.indexOf(':') !== -1)

    if (command === 'create') {
      lines.push(`  db.createTable('${name}', (t) => {`)
    } else if (command === 'drop') {
      lines.push(`  db.dropTable(${name}${hasColumns ? '(t) => {' : ')'}`)
    } else {
      lines.push(`  db.changeTable('${name}', (t) => {`)
    }

    args.forEach((pair) => {
      if (pair.indexOf(':') !== -1) {
        const [column, type] = pair.split(':')
        if (command === 'create' || command === 'add') {
          lines.push(`    t.${type}('${column}')`)
        } else if (command === 'change') {
          lines.push(`    t.change('${column}', up ? {type: '${type}'} : {?})`)
        } else if (command === 'remove') {
          lines.push(`    t.drop('${column}', {type: '${type}'})`)
        }
      }
    })

    if (command === 'create') lines.push(`    t.timestamps()`)

    if (command !== 'drop' || hasColumns) lines.push(`  })`)
  }
  lines.push('}', '')
  return lines.join('\n')
}

const createMigrationFile = (
  name: string,
  content: string,
  migrationsPath: string,
) => {
  const now = new Date()
  const prefix = [
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds(),
  ]
    .map((value) => (value < 10 ? `0${value}` : value))
    .join('')
  const filePath = path.resolve(migrationsPath, `${prefix}_${name}.ts`)
  fs.writeFileSync(filePath, content)
  console.log(`Created ${filePath}`)
}

export const generate = async (name: string, ...fields: string[]) => {
  if (!name) throw new Error('Please provide migration name')
  const { migrationsPath } = getConfig()
  mkdirRecursive(migrationsPath)
  const content = generateFileContent(name, fields)
  await createMigrationFile(name, content, migrationsPath)
}
