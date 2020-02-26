const schema = require('../src/lib/schema')

let sql = []
sql.current = 0
sql.next = () =>
  sql[sql.current++]

let originalExec
let originalValue
let nextValue
const db = new schema({reverse: false, pool: 0})
const reverse = new schema({reverse: true, pool: 0})

beforeAll(() => {
  const mock = (s) => sql.push(s) && Promise.resolve(nextValue)
  originalExec = schema.prototype.exec
  originalValue = schema.prototype.value
  schema.prototype.exec = mock
  schema.prototype.value = mock
})

afterAll(() => {
  schema.prototype.exec = originalExec
  schema.prototype.value = originalValue
})

const reset = () => {
  sql.current = 0
  sql.length = 0
}

beforeEach(reset)

const trim = (s) => s.trim().replace(/\n\s+/g, '\n')
const toLine = (s) => s.trim().replace(/\n\s*/g, ' ')

test('schema createTable', async () => {
  await db.createTable('table')
  expect(trim(sql.next())).toBe(trim(`
    CREATE TABLE tables (
      id serial PRIMARY KEY
    )
  `))

  await reverse.createTable('table')
  expect(trim(sql.next())).toBe(trim(`
    DROP TABLE tables CASCADE
  `))
})

test('schema createTable without id', async () => {
  await db.createTable('table', {id: false})
  expect(trim(sql.next())).toBe(trim(`
    CREATE TABLE tables (
    )
  `))
})

test('schema createTable different columns', async () => {
  await db.createTable('table', {comment: 'this is table comment'}, (t) => {
    t.bigint('bigint', {index: true})
    t.bigserial('bigserial', {unique: true})
    t.boolean('boolean', {index: {unique: true, name: 'named_index'}})
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
    t.reference('polymorphic', {polymorphic: true, index: true})
    t.reference('some_table', {type: 'bigint', foreignKey: true})
    t.reference('whatever_table', {foreignKey: {toTable: 'in_fact_other_table', onDelete: 'nullify'}})
    t.reference('any_table', {foreignKey: {primaryKey: 'some_key', onDelete: 'noAction'}})
    t.reference('other_table', {foreignKey: {onDelete: 'restrict', onUpdate: 'cascade'}})
    t.belongsTo('another_table', {foreignKey: {onDelete: 'setNull', onUpdate: 'setDefault'}})
  })
  expect(trim(sql.next())).toBe(trim(`
    CREATE TABLE tables (
      id serial PRIMARY KEY,
      bigint bigint,
      bigserial bigserial,
      boolean boolean,
      date date,
      decimal decimal,
      float float8,
      integer integer,
      text text,
      string text,
      time time,
      timestamp timestamp,
      timestamptz timestamptz,
      binary bytea,
      serial serial,
      custom custom type with some expressions,
      polymorphic_id integer,
      polymorphic_type text,
      some_table_id bigint REFERENCES some_tables (id),
      whatever_table_id integer REFERENCES in_fact_other_table (id) ON DELETE SET NULL,
      any_table_id integer REFERENCES any_tables (some_key) ON DELETE NO ACTION,
      other_table_id integer REFERENCES other_tables (id) ON DELETE RESTRICT ON UPDATE CASCADE,
      another_table_id integer REFERENCES another_tables (id) ON DELETE SET NULL ON UPDATE SET DEFAULT
    )
  `))
  expect(sql.next()).toBe('CREATE INDEX tables_bigint_index ON tables (bigint)')
  expect(sql.next()).toBe('CREATE UNIQUE INDEX tables_bigserial_index ON tables (bigserial)')
  expect(sql.next()).toBe('CREATE UNIQUE INDEX named_index ON tables (boolean)')
  expect(sql.next()).toBe('CREATE INDEX tables_date_index ON tables (date(10))')
  expect(sql.next()).toBe('CREATE INDEX tables_decimal_index ON tables (decimal asc)')
  expect(sql.next()).toBe('CREATE INDEX tables_float_index ON tables (float) INCLUDING (date)')
  expect(sql.next()).toBe('CREATE INDEX tables_integer_index ON tables (integer) INCLUDING (decimal, float)')
  expect(sql.next()).toBe('CREATE INDEX tables_text_index ON tables (text) WITH (fillfactor = 70)')
  expect(sql.next()).toBe('CREATE INDEX tables_string_index ON tables (string) WHERE active')
  expect(sql.next()).toBe('CREATE INDEX tables_time_index ON tables USING GIN (time)')
  expect(sql.next()).toBe('CREATE INDEX tables_polymorphic_index ON tables (polymorphic_id, polymorphic_type)')
  expect(sql.next()).toBe("COMMENT ON TABLE tables IS 'this is table comment'")
  expect(sql.next()).toBe("COMMENT ON COLUMN tables.timestamptz IS 'this is column comment'")
})

test('schema changeTable', async () => {
  await db.changeTable('table')
  expect(sql.next()).toBe(undefined)

  await reverse.changeTable('table')
  expect(sql.next()).toBe(undefined)
})

test('schema changeTable add columns', async () => {
  const args = ['table', {comment: 'table comment'}, (t) => {
    t.column('custom', 'custom type', {comment: 'column comment'})
    t.integer('integer', {default: 10, null: false})
    t.belongsTo('something', {index: true, foreignKey: true})
  }]

  await db.changeTable(...args)
  expect(trim(sql.next())).toBe(trim(`
    ALTER TABLE tables
    ADD COLUMN custom custom type,
    ADD COLUMN integer integer NOT NULL DEFAULT 10,
    ADD COLUMN something_id integer REFERENCES somethings (id)
  `))
  expect(sql.next()).toBe('CREATE INDEX tables_something_id_index ON tables (something_id)')
  expect(sql.next()).toBe("COMMENT ON TABLE tables IS 'table comment'")
  expect(sql.next()).toBe("COMMENT ON COLUMN tables.custom IS 'column comment'")

  await reverse.changeTable(...args)
  expect(trim(sql.next())).toBe(trim(`
    ALTER TABLE tables
    DROP COLUMN custom CASCADE,
    DROP COLUMN integer CASCADE,
    DROP COLUMN something_id CASCADE
  `))
})

test('schema changeTable change columns', async () => {
  const args = ['table', (t) => {
    t.change('a', {type: 'integer', collate: 'collate', using: 'using'})
    t.change('b', {default: "'new default'"})
    t.change('c', {type: 'text', default: "'new default'"})
    t.change('d', {null: false})
    t.change('e', {null: true})
    t.change('f', {index: true})
    t.change('g', {index: false, mode: 'cascade'})
    t.change('h', {type: 'decimal', precision: 5, scale: 10 })
  }]

  await db.changeTable(...args)
  expect(trim(sql.next())).toBe(trim(`
    ALTER TABLE tables
    ALTER COLUMN a TYPE integer COLLATE collate USING using,
    ALTER COLUMN b SET DEFAULT 'new default',
    ALTER COLUMN c DROP DEFAULT,
    ALTER COLUMN c TYPE text,
    ALTER COLUMN c SET DEFAULT 'new default',
    ALTER COLUMN d SET NOT NULL,
    ALTER COLUMN e DROP NOT NULL,
    ALTER COLUMN h TYPE decimal (5, 10)
  `))
  expect(trim(sql.next())).toBe(trim(`CREATE INDEX tables_f_index ON tables (f)`))
  expect(trim(sql.next())).toBe(trim(`DROP INDEX tables_g_index CASCADE`))


  await reverse.changeTable(...args)
  expect(trim(sql.next())).toBe(trim(`
    ALTER TABLE tables
    ALTER COLUMN a TYPE integer COLLATE collate USING using,
    ALTER COLUMN b SET DEFAULT 'new default',
    ALTER COLUMN c DROP DEFAULT,
    ALTER COLUMN c TYPE text,
    ALTER COLUMN c SET DEFAULT 'new default',
    ALTER COLUMN d SET NOT NULL,
    ALTER COLUMN e DROP NOT NULL,
    ALTER COLUMN h TYPE decimal (5, 10)
  `))
  expect(trim(sql.next())).toBe(trim(`CREATE INDEX tables_f_index ON tables (f)`))
  expect(trim(sql.next())).toBe(trim(`DROP INDEX tables_g_index CASCADE`))
})

test('schema changeTable remove columns', async () => {
  const args = ['table', (t) => {
    t.remove('a', 'text')
    t.remove('b', 'text', {mode: 'restrict'})
  }]
  await db.changeTable(...args)
  expect(trim(sql.next())).toBe(trim(`
    ALTER TABLE tables
    DROP COLUMN a CASCADE,
    DROP COLUMN b RESTRICT
  `))

  await reverse.changeTable(...args)
  expect(trim(sql.next())).toBe(trim(`
    ALTER TABLE tables
    ADD COLUMN a text,
    ADD COLUMN b text
  `))
})

test('schema changeTable add index', async () => {
  const args = ['tables', (t) => {
    t.index('a')
    t.index('b', {polymorphic: true})
  }]

  await db.changeTable(...args)
  expect(trim(sql.next())).toBe(trim(`CREATE INDEX tables_a_index ON tables (a)`))
  expect(trim(sql.next())).toBe(trim(`CREATE INDEX tables_b_index ON tables (b_id, b_type)`))

  await reverse.changeTable(...args)
  expect(trim(sql.next())).toBe(trim(`DROP INDEX tables_a_index`))
  expect(trim(sql.next())).toBe(trim(`DROP INDEX tables_b_index`))
})

test('schema changeTable remove index', async () => {
  const args = ['table', (t) => {
    t.removeIndex('a')
  }]

  await db.changeTable(...args)
  expect(trim(sql.next())).toBe(trim(`DROP INDEX tables_a_index`))

  await reverse.changeTable(...args)
  expect(trim(sql.next())).toBe(trim(`CREATE INDEX tables_a_index ON tables (a)`))
})

test('schema changeTable add foreign key', async () => {
  const args = ['table', (t) => {
    t.foreignKey('other_table', {index: true})
    t.foreignKey('other_table', {polymorphic: true, index: true})
  }]

  await db.changeTable(...args)
  expect(trim(sql.next())).toBe(trim(`
    ALTER TABLE tables
    ADD CONSTRAINT tables_other_table_id_fkey FOREIGN KEY (other_table_id) REFERENCES other_tables (id),
    ADD CONSTRAINT tables_other_table_id_fkey FOREIGN KEY (other_table_id) REFERENCES other_tables (id),
    ADD CONSTRAINT tables_other_table_type_fkey FOREIGN KEY (other_table_type) REFERENCES other_tables (type)
  `))
  expect(trim(sql.next())).toBe(trim(
    'CREATE INDEX tables_other_table_id_index ON tables (other_table_id)'
  ))
  expect(trim(sql.next())).toBe(trim(
    'CREATE INDEX tables_other_table_index ON tables (other_table_id, other_table_type)'
  ))

  await reverse.changeTable(...args)
  expect(trim(sql.next())).toBe(trim(`
    ALTER TABLE tables
    DROP CONSTRAINT tables_other_table_id_fkey,
    DROP CONSTRAINT tables_other_table_id_fkey,
    DROP CONSTRAINT tables_other_table_type_fkey
  `))
  expect(trim(sql.next())).toBe(trim('DROP INDEX tables_other_table_id_index'))
  expect(trim(sql.next())).toBe(trim('DROP INDEX tables_other_table_index'))
})

test('schema changeTable remove foreign key', async () => {
  const args = ['table', (t) => {
    t.removeForeignKey('other_table', {index: true})
    t.removeForeignKey('other_table', {polymorphic: true, index: true})
  }]

  await db.changeTable(...args)
  expect(trim(sql.next())).toBe(trim(`
    ALTER TABLE tables
    DROP CONSTRAINT tables_other_table_id_fkey,
    DROP CONSTRAINT tables_other_table_id_fkey,
    DROP CONSTRAINT tables_other_table_type_fkey
  `))
  expect(trim(sql.next())).toBe(trim(
    'DROP INDEX tables_other_table_id_index'
  ))
  expect(trim(sql.next())).toBe(trim(
    'DROP INDEX tables_other_table_index'
  ))

  await reverse.changeTable(...args)
  expect(trim(sql.next())).toBe(trim(`
    ALTER TABLE tables
      ADD CONSTRAINT tables_other_table_id_fkey FOREIGN KEY (other_table_id) REFERENCES other_tables (id),
      ADD CONSTRAINT tables_other_table_id_fkey FOREIGN KEY (other_table_id) REFERENCES other_tables (id),
      ADD CONSTRAINT tables_other_table_type_fkey FOREIGN KEY (other_table_type) REFERENCES other_tables (type)
  `))
  expect(trim(sql.next())).toBe(trim(
    'CREATE INDEX tables_other_table_id_index ON tables (other_table_id)'
  ))
  expect(trim(sql.next())).toBe(trim(
    'CREATE INDEX tables_other_table_index ON tables (other_table_id, other_table_type)'
  ))
})

test('schema changeTable set comment', async () => {
  const args = ['table', (t) => {
    t.comment('column', 'column comment')
  }]

  await db.changeTable(...args)
  expect(sql.next()).toBe("COMMENT ON COLUMN tables.column IS 'column comment'")

  await reverse.changeTable(...args)
  expect(sql.next()).toBe(undefined)
})

test('schema dropTable', async () => {
  await db.dropTable('table')
  expect(trim(sql.next())).toBe('DROP TABLE tables CASCADE')

  await reverse.dropTable('table')
  expect(trim(sql.next())).toBe(trim(`CREATE TABLE tables (
    id serial PRIMARY KEY
  )`))
})

test('schema change methods', async () => {
  await db.addBelongsTo('banana', 'monkeys')
  expect(toLine(sql.next())).toBe('ALTER TABLE bananas ADD COLUMN monkey_id integer')
  await reverse.addBelongsTo('banana', 'monkeys')
  expect(toLine(sql.next())).toBe('ALTER TABLE bananas DROP COLUMN monkey_id CASCADE')

  await db.addColumn('orange', 'cucumber', 'date')
  expect(toLine(sql.next())).toBe('ALTER TABLE oranges ADD COLUMN cucumber date')
  await reverse.addColumn('orange', 'cucumber', 'date')
  expect(toLine(sql.next())).toBe('ALTER TABLE oranges DROP COLUMN cucumber CASCADE')

  await db.addForeignKey('lamps', 'gums')
  expect(toLine(sql.next())).toBe('ALTER TABLE lamps ADD CONSTRAINT lamps_gum_id_fkey FOREIGN KEY (gum_id) REFERENCES gums (id)')
  await reverse.addForeignKey('lamps', 'gums')
  expect(toLine(sql.next())).toBe('ALTER TABLE lamps DROP CONSTRAINT lamps_gum_id_fkey')

  await db.addIndex('sharks', 'teeth')
  expect(toLine(sql.next())).toBe('CREATE INDEX sharks_teeth_index ON sharks (teeth)')
  await reverse.addIndex('sharks', 'teeth')
  expect(toLine(sql.next())).toBe('DROP INDEX sharks_teeth_index')

  await db.addReference('jellyfishes', 'murmaids')
  expect(toLine(sql.next())).toBe('ALTER TABLE jellyfishes ADD COLUMN murmaid_id integer')
  await reverse.addReference('jellyfishes', 'murmaids')
  expect(toLine(sql.next())).toBe('ALTER TABLE jellyfishes DROP COLUMN murmaid_id CASCADE')

  await db.addTimestamps('clouds', {null: false})
  expect(trim(sql.next())).toBe(trim(`
    ALTER TABLE clouds
    ADD COLUMN created_at timestamp NOT NULL DEFAULT now(),
    ADD COLUMN updated_at timestamp NOT NULL DEFAULT now()
  `))
  await reverse.addTimestamps('clouds', {null: false})
  expect(trim(sql.next())).toBe(trim(`
    ALTER TABLE clouds
      DROP COLUMN created_at CASCADE,
      DROP COLUMN updated_at CASCADE
  `))

  await db.changeColumn('jungle', 'tiger', {type: 'text'})
  expect(trim(sql.next())).toBe(trim(`
    ALTER TABLE jungles
    ALTER COLUMN tiger TYPE text
  `))
  await reverse.changeColumn('jungle', 'tiger', {type: 'text'})
  expect(trim(sql.next())).toBe(trim(`
    ALTER TABLE jungles
    ALTER COLUMN tiger TYPE text
  `))

  await db.changeColumnComment('table', 'column', 'comment')
  expect(sql.next()).toBe("COMMENT ON COLUMN tables.column IS 'comment'")
  await reverse.changeColumnComment('table', 'column', 'comment')
  expect(sql.next()).toBe(undefined)
  reset()

  await db.changeColumnDefault('table', 'column', "'default'")
  expect(toLine(sql.next())).toBe("ALTER TABLE tables ALTER COLUMN column SET DEFAULT 'default'")
  await reverse.changeColumnDefault('table', 'column', "'default'")
  expect(toLine(sql.next())).toBe("ALTER TABLE tables ALTER COLUMN column SET DEFAULT 'default'")

  await db.changeColumnNull('table', 'column', false)
  expect(toLine(sql.next())).toBe("ALTER TABLE tables ALTER COLUMN column SET NOT NULL")
  await reverse.changeColumnNull('table', 'column', false)
  expect(toLine(sql.next())).toBe("ALTER TABLE tables ALTER COLUMN column SET NOT NULL")

  await db.changeTableComment('table', 'comment')
  expect(sql.next()).toBe("COMMENT ON TABLE tables IS 'comment'")
  await reverse.changeTableComment('table', 'comment')
  expect(sql.next()).toBe(undefined)
  reset()

  nextValue = true
  expect(await db.columnExists('table', 'column')).toBe(true)
  expect(sql.next()).toBe(
    "SELECT 1 FROM information_schema.columns WHERE table_name = 'table' AND column_name = 'column'"
  )
  expect(await reverse.columnExists('table', 'column')).toBe(false)
  expect(sql.next()).toBe(
    "SELECT 1 FROM information_schema.columns WHERE table_name = 'table' AND column_name = 'column'"
  )

  await db.createJoinTable('one', 'two', {tableName: 'three', columnOptions: {reference: true}, options: {id: true}})
  expect(trim(sql.next())).toBe(trim(`
    CREATE TABLE threes (
      id serial PRIMARY KEY,
      one_id integer NOT NULL,
      two_id integer NOT NULL
    )
  `))
  await reverse.createJoinTable('one', 'two', {tableName: 'three', columnOptions: {reference: true}, options: {id: true}})
  expect(trim(sql.next())).toBe(trim(`
    DROP TABLE threes CASCADE
  `))

  await db.dropJoinTable('one', 'two', {tableName: 'three'})
  expect(trim(sql.next())).toBe(`DROP TABLE threes CASCADE`)
  await reverse.dropJoinTable('one', 'two', {tableName: 'three'})
  expect(trim(sql.next())).toBe(trim(`
    CREATE TABLE threes (
      id serial PRIMARY KEY,
      one_id integer NOT NULL,
      two_id integer NOT NULL
    )
  `))

  nextValue = true
  expect(await db.foreignKeyExists('accounts', 'branches')).toBe(true)
  expect(toLine(sql.next())).toBe(toLine(`
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'accounts_branch_id_fkey'
  `))
  expect(await reverse.foreignKeyExists('accounts', 'branches')).toBe(false)
  expect(toLine(sql.next())).toBe(toLine(`
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'accounts_branch_id_fkey'
  `))

  nextValue = true
  expect(await db.tableExists('table')).toBe(true)
  expect(toLine(sql.next())).toBe(toLine(`
    SELECT FROM information_schema.tables
    WHERE table_name = 'table'
  `))
  expect(await reverse.tableExists('table')).toBe(false)
  expect(toLine(sql.next())).toBe(toLine(`
    SELECT FROM information_schema.tables
    WHERE table_name = 'table'
  `))
})
