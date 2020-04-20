import Migration from '../src/lib/migration'
import {ChangeTable} from '../src/lib/schema/changeTable'

class Sql extends Array {
  current = 0
  next = () =>
    this[this.current++]
}

let sql = new Sql()

let originalExec: (...args: any[]) => any
let originalValue: (...args: any[]) => any
let nextValue: any
const db = new Migration({reverse: false, pool: 0})
const reverse = new Migration({reverse: true, pool: 0})

beforeAll(() => {
  const mock = (s: string) => sql.push(s) && Promise.resolve(nextValue)
  originalExec = Migration.prototype.exec
  originalValue = Migration.prototype.value
  Migration.prototype.exec = mock as (sql: string | TemplateStringsArray, ...args: any[]) => any
  Migration.prototype.value = mock as (sql: string | TemplateStringsArray, ...args: any[]) => any
})

afterAll(() => {
  Migration.prototype.exec = originalExec
  Migration.prototype.value = originalValue
})

const reset = () => {
  sql.current = 0
  sql.length = 0
}

beforeEach(reset)

const trim = (s: string) => s.trim().replace(/\n\s+/g, '\n')
const toLine = (s: string) => s.trim().replace(/\n\s*/g, ' ')

test('schema createTable', async () => {
  await db.createTable('table')
  expect(trim(sql.next())).toBe(trim(`
    CREATE TABLE "tables" (
      "id" serial PRIMARY KEY
    )
  `))

  await reverse.createTable('table')
  expect(trim(sql.next())).toBe(trim(`
    DROP TABLE "tables" CASCADE
  `))
})

test('schema createTable without id', async () => {
  await db.createTable('table', {id: false})
  expect(trim(sql.next())).toBe(trim(`
    CREATE TABLE "tables" (
    )
  `))
})

test('schema createTable different columns', async () => {
  await db.createTable('table', {comment: 'this is table comment'}, (t) => {
    t.bigint('bigint', {index: true})
    t.bigserial('bigserial', {unique: true})
    t.boolean('boolean', {index: {unique: true, name: 'namedIndex'}})
    t.date('date', {index: {length: 10}})
    t.decimal('decimal', {index: {order: 'asc'}})
    t.float('float', {index: {including: 'date'}})
    t.integer('integer', {index: {including: ['decimal', 'float']}})
    t.text('text', {index: {with: 'fillfactor = 70'}})
    t.string('string', {index: {where: 'active'}})
    t.time('time', {index: {using: 'GIN'}})
    t.timestamp('timestamp')
    t.timestamptz('timestamptz', {comment: 'this is column comment'})
    t.binary('binary')
    t.serial('serial')
    t.column('custom', 'custom type with some expressions')
    t.reference('someTable', {type: 'bigint', foreignKey: true, index: true})
    t.reference('whateverTable', {foreignKey: {toTable: 'inFactOtherTable', onDelete: 'nullify'}})
    t.reference('anyTable', {foreignKey: {primaryKey: 'someKey', onDelete: 'noAction'}})
    t.reference('otherTable', {foreignKey: {onDelete: 'restrict', onUpdate: 'cascade'}})
    t.belongsTo('anotherTable', {foreignKey: {onDelete: 'setNull', onUpdate: 'setDefault'}})
  })
  expect(trim(sql.next())).toBe(trim(`
    CREATE TABLE "tables" (
      "id" serial PRIMARY KEY,
      "bigint" bigint,
      "bigserial" bigserial,
      "boolean" boolean,
      "date" date,
      "decimal" decimal,
      "float" float8,
      "integer" integer,
      "text" text,
      "string" text,
      "time" time,
      "timestamp" timestamp,
      "timestamptz" timestamptz,
      "binary" bytea,
      "serial" serial,
      "custom" custom type with some expressions,
      "someTableId" bigint REFERENCES "someTables" ("id"),
      "whateverTableId" integer REFERENCES "inFactOtherTable" ("id") ON DELETE SET NULL,
      "anyTableId" integer REFERENCES "anyTables" ("someKey") ON DELETE NO ACTION,
      "otherTableId" integer REFERENCES "otherTables" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      "anotherTableId" integer REFERENCES "anotherTables" ("id") ON DELETE SET NULL ON UPDATE SET DEFAULT
    )
  `))
  expect(sql.next()).toBe('CREATE INDEX "tablesBigintIndex" ON "tables" ("bigint")')
  expect(sql.next()).toBe('CREATE UNIQUE INDEX "tablesBigserialIndex" ON "tables" ("bigserial")')
  expect(sql.next()).toBe('CREATE UNIQUE INDEX "namedIndex" ON "tables" ("boolean")')
  expect(sql.next()).toBe('CREATE INDEX "tablesDateIndex" ON "tables" ("date"(10))')
  expect(sql.next()).toBe('CREATE INDEX "tablesDecimalIndex" ON "tables" ("decimal" asc)')
  expect(sql.next()).toBe('CREATE INDEX "tablesFloatIndex" ON "tables" ("float") INCLUDING (date)')
  expect(sql.next()).toBe('CREATE INDEX "tablesIntegerIndex" ON "tables" ("integer") INCLUDING (decimal, float)')
  expect(sql.next()).toBe('CREATE INDEX "tablesTextIndex" ON "tables" ("text") WITH (fillfactor = 70)')
  expect(sql.next()).toBe('CREATE INDEX "tablesStringIndex" ON "tables" ("string") WHERE active')
  expect(sql.next()).toBe('CREATE INDEX "tablesTimeIndex" ON "tables" USING GIN ("time")')
  expect(sql.next()).toBe('CREATE INDEX "tablesSomeTableIdIndex" ON "tables" ("someTableId")')
  expect(sql.next()).toBe(`COMMENT ON TABLE "tables" IS 'this is table comment'`)
  expect(sql.next()).toBe(`COMMENT ON COLUMN "tables"."timestamptz" IS 'this is column comment'`)
})

test('schema changeTable', async () => {
  await db.changeTable('table')
  expect(sql.next()).toBe(undefined)

  await reverse.changeTable('table')
  expect(sql.next()).toBe(undefined)
})

test('schema changeTable add columns', async () => {
  const table = 'table'
  const tableOptions = {comment: 'table comment'}
  const tableCallback = (t: ChangeTable) => {
    t.column('custom', 'custom type', {comment: 'column comment'})
    t.integer('integer', {default: 10, null: false})
    t.belongsTo('something', {index: true, foreignKey: true})
  }

  await db.changeTable(table, tableOptions, tableCallback)
  expect(trim(sql.next())).toBe(trim(`
    ALTER TABLE "tables"
    ADD COLUMN "custom" custom type,
    ADD COLUMN "integer" integer NOT NULL DEFAULT 10,
    ADD COLUMN "somethingId" integer REFERENCES "somethings" ("id")
  `))
  expect(sql.next()).toBe('CREATE INDEX "tablesSomethingIdIndex" ON "tables" ("somethingId")')
  expect(sql.next()).toBe(`COMMENT ON TABLE "tables" IS 'table comment'`)
  expect(sql.next()).toBe(`COMMENT ON COLUMN "tables"."custom" IS 'column comment'`)

  await reverse.changeTable(table, tableOptions, tableCallback)
  expect(trim(sql.next())).toBe(trim(`
    ALTER TABLE "tables"
    DROP COLUMN "custom" CASCADE,
    DROP COLUMN "integer" CASCADE,
    DROP COLUMN "somethingId" CASCADE
  `))
})

test('schema changeTable change columns', async () => {
  const table = 'table'
  const tableCallback = (t: ChangeTable) => {
    t.change('a', {type: 'integer', collate: 'collate', using: 'using'})
    t.change('b', {default: "'new default'"})
    t.change('c', {type: 'text', default: "'new default'"})
    t.change('d', {null: false})
    t.change('e', {null: true})
    t.change('f', {index: true})
    t.change('g', {index: false, mode: 'cascade'})
    t.change('h', {type: 'decimal', precision: 5, scale: 10 })
  }

  await db.changeTable(table, tableCallback)
  expect(trim(sql.next())).toBe(trim(`
    ALTER TABLE "tables"
    ALTER COLUMN "a" TYPE integer COLLATE collate USING using,
    ALTER COLUMN "b" SET DEFAULT 'new default',
    ALTER COLUMN "c" DROP DEFAULT,
    ALTER COLUMN "c" TYPE text,
    ALTER COLUMN "c" SET DEFAULT 'new default',
    ALTER COLUMN "d" SET NOT NULL,
    ALTER COLUMN "e" DROP NOT NULL,
    ALTER COLUMN "h" TYPE decimal (5, 10)
  `))
  expect(trim(sql.next())).toBe(trim(`CREATE INDEX "tablesFIndex" ON "tables" ("f")`))
  expect(trim(sql.next())).toBe(trim(`DROP INDEX "tablesGIndex" CASCADE`))


  await reverse.changeTable(table, tableCallback)
  expect(trim(sql.next())).toBe(trim(`
    ALTER TABLE "tables"
    ALTER COLUMN "a" TYPE integer COLLATE collate USING using,
    ALTER COLUMN "b" SET DEFAULT 'new default',
    ALTER COLUMN "c" DROP DEFAULT,
    ALTER COLUMN "c" TYPE text,
    ALTER COLUMN "c" SET DEFAULT 'new default',
    ALTER COLUMN "d" SET NOT NULL,
    ALTER COLUMN "e" DROP NOT NULL,
    ALTER COLUMN "h" TYPE decimal (5, 10)
  `))
  expect(trim(sql.next())).toBe(trim(`CREATE INDEX "tablesFIndex" ON "tables" ("f")`))
  expect(trim(sql.next())).toBe(trim(`DROP INDEX "tablesGIndex" CASCADE`))
})

test('schema changeTable remove columns', async () => {
  const table = 'table'
  const tableCallback = (t: ChangeTable) => {
    t.remove('a', 'text')
    t.remove('b', 'text', {mode: 'restrict'})
  }
  await db.changeTable(table, tableCallback)
  expect(trim(sql.next())).toBe(trim(`
    ALTER TABLE "tables"
    DROP COLUMN "a" CASCADE,
    DROP COLUMN "b" RESTRICT
  `))

  await reverse.changeTable(table, tableCallback)
  expect(trim(sql.next())).toBe(trim(`
    ALTER TABLE "tables"
    ADD COLUMN "a" text,
    ADD COLUMN "b" text
  `))
})

test('schema changeTable add index', async () => {
  const table = 'tables'
  const tableCallback = (t: ChangeTable) => {
    t.index('a')
  }

  await db.changeTable(table, tableCallback)
  expect(trim(sql.next())).toBe(trim(`CREATE INDEX "tablesAIndex" ON "tables" ("a")`))

  await reverse.changeTable(table, tableCallback)
  expect(trim(sql.next())).toBe(trim(`DROP INDEX "tablesAIndex"`))
})

test('schema changeTable remove index', async () => {
  const table = 'table'
  const tableCallback = (t: ChangeTable) => {
    t.removeIndex('a')
  }

  await db.changeTable(table, tableCallback)
  expect(trim(sql.next())).toBe(trim(`DROP INDEX "tablesAIndex"`))

  await reverse.changeTable(table, tableCallback)
  expect(trim(sql.next())).toBe(trim(`CREATE INDEX "tablesAIndex" ON "tables" ("a")`))
})

test('schema changeTable add foreign key', async () => {
  const table = 'table'
  const tableCallback = (t: ChangeTable) => {
    t.foreignKey('otherTable', {index: true})
  }

  await db.changeTable(table, tableCallback)
  expect(trim(sql.next())).toBe(trim(`
    ALTER TABLE "tables"
    ADD CONSTRAINT "tablesOtherTableIdFkey" FOREIGN KEY ("otherTableId") REFERENCES "otherTables" ("id")
  `))
  expect(trim(sql.next())).toBe(trim(
    'CREATE INDEX "tablesOtherTableIdIndex" ON "tables" ("otherTableId")'
  ))

  await reverse.changeTable(table, tableCallback)
  expect(trim(sql.next())).toBe(trim(`
    ALTER TABLE "tables"
    DROP CONSTRAINT "tablesOtherTableIdFkey"
  `))
  expect(trim(sql.next())).toBe(trim('DROP INDEX "tablesOtherTableIdIndex"'))
})

test('schema changeTable remove foreign key', async () => {
  const table = 'table'
  const tableCallback = (t: ChangeTable) => {
    t.removeForeignKey('otherTable', {index: true})
  }

  await db.changeTable(table, tableCallback)
  expect(trim(sql.next())).toBe(trim(`
    ALTER TABLE "tables"
    DROP CONSTRAINT "tablesOtherTableIdFkey"
  `))
  expect(trim(sql.next())).toBe(trim(
    'DROP INDEX "tablesOtherTableIdIndex"'
  ))

  await reverse.changeTable(table, tableCallback)
  expect(trim(sql.next())).toBe(trim(`
    ALTER TABLE "tables"
      ADD CONSTRAINT "tablesOtherTableIdFkey" FOREIGN KEY ("otherTableId") REFERENCES "otherTables" ("id")
  `))
  expect(trim(sql.next())).toBe(trim(
    'CREATE INDEX "tablesOtherTableIdIndex" ON "tables" ("otherTableId")'
  ))
})

test('schema changeTable set comment', async () => {
  const table = 'table'
  const tableCallback = (t: ChangeTable) => {
    t.comment('column', 'column comment')
  }

  await db.changeTable(table, tableCallback)
  expect(sql.next()).toBe(`COMMENT ON COLUMN "tables"."column" IS 'column comment'`)

  await reverse.changeTable(table, tableCallback)
  expect(sql.next()).toBe(undefined)
})

test('schema dropTable', async () => {
  await db.dropTable('table')
  expect(trim(sql.next())).toBe('DROP TABLE "tables" CASCADE')

  await reverse.dropTable('table')
  expect(trim(sql.next())).toBe(trim(`CREATE TABLE "tables" (
    "id" serial PRIMARY KEY
  )`))
})

test('schema renameTable', async () => {
  await db.renameTable('apple', 'banana')
  expect(trim(sql.next())).toBe('ALTER TABLE "apples" RENAME TO "bananas"')

  await reverse.renameTable('apple', 'banana')
  expect(trim(sql.next())).toBe('ALTER TABLE "bananas" RENAME TO "apples"')
})

test('schema change methods', async () => {
  await db.addBelongsTo('banana', 'monkeys')
  expect(toLine(sql.next())).toBe('ALTER TABLE "bananas" ADD COLUMN "monkeyId" integer')
  await reverse.addBelongsTo('banana', 'monkeys')
  expect(toLine(sql.next())).toBe('ALTER TABLE "bananas" DROP COLUMN "monkeyId" CASCADE')

  await db.addColumn('orange', 'cucumber', 'date')
  expect(toLine(sql.next())).toBe('ALTER TABLE "oranges" ADD COLUMN "cucumber" date')
  await reverse.addColumn('orange', 'cucumber', 'date')
  expect(toLine(sql.next())).toBe('ALTER TABLE "oranges" DROP COLUMN "cucumber" CASCADE')

  await db.addForeignKey('lamps', 'gums')
  expect(toLine(sql.next())).toBe('ALTER TABLE "lamps" ADD CONSTRAINT "lampsGumIdFkey" FOREIGN KEY ("gumId") REFERENCES "gums" ("id")')
  await reverse.addForeignKey('lamps', 'gums')
  expect(toLine(sql.next())).toBe('ALTER TABLE "lamps" DROP CONSTRAINT "lampsGumIdFkey"')

  await db.addIndex('sharks', 'teeth')
  expect(toLine(sql.next())).toBe('CREATE INDEX "sharksTeethIndex" ON "sharks" ("teeth")')
  await reverse.addIndex('sharks', 'teeth')
  expect(toLine(sql.next())).toBe('DROP INDEX "sharksTeethIndex"')

  await db.addReference('jellyfishes', 'murmaids')
  expect(toLine(sql.next())).toBe('ALTER TABLE "jellyfishes" ADD COLUMN "murmaidId" integer')
  await reverse.addReference('jellyfishes', 'murmaids')
  expect(toLine(sql.next())).toBe('ALTER TABLE "jellyfishes" DROP COLUMN "murmaidId" CASCADE')

  await db.addTimestamps('clouds', {null: false})
  expect(trim(sql.next())).toBe(trim(`
    ALTER TABLE "clouds"
    ADD COLUMN "createdAt" timestamp NOT NULL DEFAULT now(),
    ADD COLUMN "updatedAt" timestamp NOT NULL DEFAULT now()
  `))
  await reverse.addTimestamps('clouds', {null: false})
  expect(trim(sql.next())).toBe(trim(`
    ALTER TABLE "clouds"
      DROP COLUMN "createdAt" CASCADE,
      DROP COLUMN "updatedAt" CASCADE
  `))

  await db.changeColumn('jungle', 'tiger', {type: 'text'})
  expect(trim(sql.next())).toBe(trim(`
    ALTER TABLE "jungles"
    ALTER COLUMN "tiger" TYPE text
  `))
  await reverse.changeColumn('jungle', 'tiger', {type: 'text'})
  expect(trim(sql.next())).toBe(trim(`
    ALTER TABLE "jungles"
    ALTER COLUMN "tiger" TYPE text
  `))

  await db.changeColumnComment('table', 'column', 'comment')
  expect(sql.next()).toBe(`COMMENT ON COLUMN "tables"."column" IS 'comment'`)
  await reverse.changeColumnComment('table', 'column', 'comment')
  expect(sql.next()).toBe(undefined)
  reset()

  await db.changeColumnDefault('table', 'column', "'default'")
  expect(toLine(sql.next())).toBe(`ALTER TABLE "tables" ALTER COLUMN "column" SET DEFAULT 'default'`)
  await reverse.changeColumnDefault('table', 'column', "'default'")
  expect(toLine(sql.next())).toBe(`ALTER TABLE "tables" ALTER COLUMN "column" SET DEFAULT 'default'`)

  await db.changeColumnNull('table', 'column', false)
  expect(toLine(sql.next())).toBe(`ALTER TABLE "tables" ALTER COLUMN "column" SET NOT NULL`)
  await reverse.changeColumnNull('table', 'column', false)
  expect(toLine(sql.next())).toBe(`ALTER TABLE "tables" ALTER COLUMN "column" SET NOT NULL`)

  await db.changeTableComment('table', 'comment')
  expect(sql.next()).toBe(`COMMENT ON TABLE "tables" IS 'comment'`)
  await reverse.changeTableComment('table', 'comment')
  expect(sql.next()).toBe(undefined)
  reset()

  nextValue = true
  expect(await db.columnExists('table', 'column')).toBe(true)
  expect(sql.next()).toBe(
    `SELECT 1 FROM "information_schema"."columns" WHERE "table_name" = 'table' AND "column_name" = 'column'`
  )
  expect(await reverse.columnExists('table', 'column')).toBe(false)
  expect(sql.next()).toBe(
    `SELECT 1 FROM "information_schema"."columns" WHERE "table_name" = 'table' AND "column_name" = 'column'`
  )

  await db.createJoinTable('one', 'two', {tableName: 'three', columnOptions: {reference: true}, options: {id: true}})
  expect(trim(sql.next())).toBe(trim(`
    CREATE TABLE "threes" (
      "id" serial PRIMARY KEY,
      "oneId" integer NOT NULL,
      "twoId" integer NOT NULL
    )
  `))
  await reverse.createJoinTable('one', 'two', {tableName: 'three', columnOptions: {reference: true}, options: {id: true}})
  expect(trim(sql.next())).toBe(trim(`
    DROP TABLE "threes" CASCADE
  `))

  await db.dropJoinTable('one', 'two', {tableName: 'three'})
  expect(trim(sql.next())).toBe(`DROP TABLE "threes" CASCADE`)
  await reverse.dropJoinTable('one', 'two', {tableName: 'three'})
  expect(trim(sql.next())).toBe(trim(`
    CREATE TABLE "threes" (
      "id" serial PRIMARY KEY,
      "oneId" integer NOT NULL,
      "twoId" integer NOT NULL
    )
  `))

  nextValue = true
  expect(await db.foreignKeyExists('accounts', 'branches')).toBe(true)
  expect(toLine(sql.next())).toBe(toLine(`
    SELECT 1 FROM "information_schema"."table_constraints"
    WHERE "constraint_name" = 'accountsBranchIdFkey'
  `))
  expect(await reverse.foreignKeyExists('accounts', 'branches')).toBe(false)
  expect(toLine(sql.next())).toBe(toLine(`
    SELECT 1 FROM "information_schema"."table_constraints"
    WHERE "constraint_name" = 'accountsBranchIdFkey'
  `))

  nextValue = true
  expect(await db.tableExists('table')).toBe(true)
  expect(toLine(sql.next())).toBe(toLine(`
    SELECT FROM "information_schema"."tables"
    WHERE "table_name" = 'table'
  `))
  expect(await reverse.tableExists('table')).toBe(false)
  expect(toLine(sql.next())).toBe(toLine(`
    SELECT FROM "information_schema"."tables"
    WHERE "table_name" = 'table'
  `))
})
