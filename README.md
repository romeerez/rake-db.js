# This is the old repo

This repo is remaining for history, `rake-db` was merged to monorepo into [orchid-orm](https://github.com/romeerez/orchid-orm/tree/main/packages/rake-db).

# rake-db

This is a migration tool for Postgres which is highly inspired by Ruby on Rails migrations, main features are:
- Nice syntax similar to RoR migrations
- It can automatically rollback migrations in common cases

Restrictions:
- Currently it supports only Typescript migrations
- Only Postgres is supported

Can create, drop, migrate and rollback database, and can generate migrations.

Has an option to generate names of columns, indices and foreign keys in camelCase.

## Table of Contents
* [Get started](#get-started)
* [Commands](#commands)
* [Versioning](#versioning)
* [Up and down and change](#migration-directions)
* [All methods and options](#all-methods-and-options)
  - [Create table](#create-table)
  - [Create join table](#create-join-table)
  - [Change table](#change-table)
  - [Drop table](#drop-table)
  - [Drop join table](#drop-join-table)
  - [Rename table](#rename-table)
  - [Change table comment](#change-table-comment)
  - [Add column](#add-column)
  - [Change column](#change-column)
  - [Change column default](#change-column-default)
  - [Change column null](#change-column-null)
  - [Change column comment](#change-column-comment)
  - [Rename column](#rename-column)
  - [Column exists](#column-exists)
  - [Add timestamps](#add-timestamps)
  - [Drop timestamps](#drop-timestamps)
  - [Add foreign key](#add-foreign-key)
  - [Drop foreign key](#drop-foreign-key)
  - [Add index](#add-index)
  - [Drop index](#drop-index)

## Get started

Install:

```sh
npm i rake-db
```

`rake-db` has peer dependencies on `ts-node` and `typescript`, if you don't have them already in your project need to install:

```sh
npm i ts-node typescript
```

Add a script into `package.json`:
```json
{
  "scripts": {
    "db": "rake-db"
  }
}
```

And now commands become available (`npm run` command can be replaced with `yarn`):

```sh
npm run db init
npm run db g create_users name:text password:text
npm run db migrate
```

For quick start run:
```sh
npm run db init
```

It will ask you for configs and credentials, then it will create directory for migrations, will create or modify existing `.env` file, will create databases.

After completing you'll have such `.env` file, or put values manually:
```.env
# Required unless `DATABASES` set
DATABASE_URL=postgres://username:password@localhost:5432/db-name

# Optional: you can define any variables for multiple databases
DATABASE_URL_TEST=postgres://username:password@localhost:5432/db-name-test

# Optional: by default camel case is set to `false`
DATABASE_CAMEL_CASE=true

# Optional: by default is set to `migrations`
MIGRATIONS_PATH=migrations

# Optional unless `DATABASE_URL` is set, this defines a list of databases to migrate at once
DATABASES=DATABASE_URL,DATABASE_URL_TEST
```

If you specified multiple databases this command will migrate them all at once:
```sh
npm run db migrate
```

## Commands

Command | Description
--- | ---
init | creates migrations directory, sets up env config, creates databases
create | creates databases
drop | drops databases
g, generate | generates migration file, see below
migrate | migrate all pending migrations in all databases
rollback | rollback the last migrated in all databases
no or unknown | prints help

Generate arguments:
- (required) first argument is migration name
  * create_*      template for create table
  * change_*      template for change table
  * add_*         template for add columns
  * remove_*      template for remove columns
  * drop_*        template for drop table

- other arguments considered as columns with types:
```sh
npm run db g create_table name:text createdAt:date
```

## Versioning

`rake-db` is using special table `schemaMigrations` to store info about which migrations where applied, table will be created unless exists before running migration.

Migrations files are generated into `db/migrate` directory:

```
db/
  migrate/
    20200216005003_create_table.ts
    20200223142823_change_table.ts
```

## Writing migration

Let's create table:

```bash
npm run db g create_entities name:text
```

It will create such migration file:
```typescript
import { Migration } from 'rake-db'

export const change = (db: Migration, up: boolean) => {
  db.createTable('entities', (t) => {
    t.text('name')
    t.timestamps()
  })
}
```

`db` argument inherited from [pg-adapter](https://www.npmjs.com/package/pg-adapter) instance,
so it has all methods which `pg-adapter` library has, can perform queries.

Second argument `up` is boolean which is true for migrate and `false` for rollback.

```typescript
import { Migration } from 'rake-db'

export const change = (db: Migration, up: boolean) => {
  db.createTable('entities', (t) => {
    t.text('name')
    t.timestamps()
  })
  
  if (up) {
    const data = [{ name: 'one' }, { name: 'two' }]
    db.exec(`INSERT INTO entities(name) VALUES ${
      data.map(row => `(${
        [row.name].map(db.quote).join(', ')
      })`).join(', ')
    }`)
  }
}
```

This will fill table with data only when migrating up.

All migrations are running in transaction so if query contains error - not too bad,
table won't be created, you can fix error and run again.

## Migration directions

You can define `export const up` for migrate, `export const down` for rollback or `export const change` for both.

## All methods and options

In all further examples `db` is a first argument of `change` or `up` or `down`:
```js
import { Migration } from 'rake-db'

export const change = (db: Migration, up: boolean) => {
}
// or
export const up = (db: Migration) => {
}
// or
export const down = (db: Migration) => {
}
```

### Create table

```js
db.createTable(
  'table_name',
  { // optional parameters
    id: false, // skip id column which is created by default
    comment: 'table comment', // add comment to table
  },
  (t) => {
    // See "Add column" for available options
    t.column('column_name', 'column_type', { ...columnOptions })
    t.string('text_column', { ...columnOptions })

    // column is chainable with methods:
    t.column('name')
      .required() // NOT NULL
      .default('raw sql') // set default value - RAW SQL!
      .default("'string default'") // quote strings manually in default
      .type('integer') // can set type
      .index() // add default index
      .index({ ...indexOptions }) // see addIndex section for options
      .unique() // add unique index
      .unique({ ...indexOptions }) // can accept options
      .comment('this is awesome column') // add comment to column
      .length(42) // can set length, for varchar for example
      .precision(10).scale(5) // precision and scale for numeric types
      .collate('value'), // see COLLATE in postgres docs
      .using('value'), // see USING in postgres docs
      .references('table', 'column') // add REFERENCES statement
      .onUpdate('cascade') // ON UPDATE for REFERENCES
      .onDelete('cascade') // ON DELETE for REFERENCES

    // See "Add index"
    t.index('column_name', { unique: true })

    // See "Add timestamps"
    t.timestamps()

    // set composite primary key
    f.primaryKey(['column1', 'column2'])

    // See "Add foreign key"
    t.foreignKey({
      table: 'some',
      column: 'some_id',
      references: 'id'
    })

    t.execute('custom sql inside of CREATE TABLE ()')

    // type helpers, the same as t.column(name, *type*, options)
    t.bigint('column_name', ColumnOptions)
    t.bigserial('column_name', ColumnOptions)
    t.boolean('column_name', ColumnOptions)
    t.date('column_name', ColumnOptions)
    t.decimal('column_name', ColumnOptions)
    t.float('column_name', ColumnOptions)
    t.integer('column_name', ColumnOptions)
    t.text('column_name', ColumnOptions)
    t.smallint('column_name', ColumnOptions)
    t.string('column_name', ColumnOptions)
    t.time('column_name', ColumnOptions)
    t.timestamp('column_name', ColumnOptions)
    t.timestamptz('column_name', ColumnOptions)
    t.binary('column_name', ColumnOptions)
    t.serial('column_name', ColumnOptions)
    t.json('column_name', ColumnOptions)
    t.jsonb('column_name', ColumnOptions)
  },
)
```

### Create join table

If you prefer plural table names skip this section, as this method not supports it for now.

```js
db.createJoinTable(
  'orange',
  'apple',
  { // optional parameters
    // by default table name will be sorted join of two table names, i.e "apples_oranges"
    tableName: string,
    // by default true, will add index to ensure unique id pairs
    unique: boolean,
    // by default is true, will set REFERENCES for both columns
    references: boolean,
    columnOptions: {
      // by default id columns are NOT NULL
      null: boolean,
      // if set to true will create index for each column
      index: boolean
      // you can provide and other column options too
    },
  },
  (t) => { // optional callback with same methods as in createTable
  }
)
```

Example:
```js
db.createJoinTable('orange', 'apple')
```
Will result in such sql:
```sql
CREATE TABLE "apple_orange" (
  "apple_id" integer NOT NULL REFERENCES "apple" ("id"),
  "orange_id" integer NOT NULL REFERENCES "orange" ("id")
);
CREATE UNIQUE INDEX "apple_orange_unique_index" ON "apple_orange" ("apple_id", "orange_id");
```

### Change table

```js
db.changeTable('table_name', (t) => {
  // adding new column, index, foreign key - all the same as in createTable
  t.column('name', 'type', { ...options })

  // column is chainable just as in createTable
  t.string('text_column').required().primaryKey().references('other_table', 'column')

  t.change('column_name', {
    type: 'integer', // change column type
    default: 42, // set new default
    default: null, // remove default
    null: false, // set NOT NULL
    index: true | IndexOptions, // add index for column, for options see "Add index"
    comment: 'column comment', // add comment
  })

  t.rename('old_column_name', 'new_column_name') // rename column

  t.comment('column_name', 'comment') // add comment to the column

  t.default('column_name', 'new default value') // change default value
  t.default('column_name', null) // remove default value

  // Drop primary key
  f.dropPrimaryKey(['column1', 'column2'])

  // Add composite primary key
  f.primaryKey(['column1', 'column2'])

  t.drop('column_name', 'type', ColumnOptions) // drop column, type and options are for rolling back

  t.dropIndex('index_name', IndexOptions) // drop index, see "Add index" for options

  t.dropForeignKey(ForeignKeyOptions) // drop foreign key, see "Add foreign key" for options
})
```

### Drop table

```js
db.dropTable('table_name')

// to make migration reversible provide the same callback as for createTable:
db.dropTable('table_name', (t) => {
  t.string('column')
})
```

### Drop join table

```js
// the same parameters as in addJoinTable
db.dropJoinTable('apple', 'orange')
```

### Rename table

```js
db.renameTable('old_name', 'new_name')
```

### Change table comment

Looks like this method is irreversible, but who use comments at all? :)
```js
db.changeTableComment('table_name', 'new table comment')
```

### Table exists

```js
if (await !db.tableExists('table')) {
  await db.createTable('table')
}
```

### Add column

```js
db.addColumn('table', 'column_name', 'type', {
  // all fields are optional
  primaryKey: boolean, // if column should be a primary key
  default: 'default value', // set default
  null: false, // add NOT NULL statement
  index: boolean | IndexOptions // add index for the column, for options see "Add index"
  comment: string, // add comment on the column
  mode: string, // RESTRICT or CASCADE to use in rollback
  unique: boolean, // add unique index
  length: number | string, // specify type size, for varchar for example
  precision: number | string, // for numeric
  scale: number | string, // for numeric
  collate: string, // for completeness, see COLLATE in postgres docs
  using: string, // for completeness as well
})
```

### Change column

```js
db.changeColumn('table_name', 'column_name', {
  type: 'integer', // change column type
  default: 42, // set new default
  default: null, // remove default
  null: false, // set NOT NULL
  index: true | IndexOptions, // add index for column, for options see "Add index"
  comment: 'column comment', // add comment
})
```

### Change column default

```js
db.changeColumnDefault('table', 'column', 'new default value')
db.changeColumnDefault('table', 'column', null) // to remove default
```

### Change column null

```js
db.changeColumnNull('table', 'column', boolean) // true for NOT NULL
```

### Change column comment

```js
db.changeColumnComment('table', 'column', 'comment')
```

### Rename column

```js
db.renameColumn('table', 'old_column_name', 'new_column_name')
```

### Column exists

```js
if (!db.columnExists('table', 'column'))
  db.addColumn('table', 'column', 'type')
```

### Add timestamps

This will add `updated_at` and `created_at`, both with default 'now()'

```js
db.addTimestamps('table', options) // See "Add column" for options
```

### Drop timestamps

```js
db.dropTimestamps('table', options)
```

### Add primary key

Add composite primary key, will create constraint with name `table_pkey`

Optionally can take second argument for custom constraint name

```js
db.addPrimaryKey('table', ['column1', 'column2'])
db.addPrimaryKey('table', ['column1', 'column2'], 'customConstraintName')
```

### Drop primary key

The same arguments as when adding primary key so migration is reversible

```js
db.dropPrimaryKey(['column1', 'column2'])
db.dropPrimaryKey(['column1', 'column2'], 'customConstraintName')
```

### Add foreign key

```js
db.addForeignKey('table', {
  // required
  column: 'some_id', // a foreign key column
  table: 'other_table', // table to connect this column to
  references: 'column_in_other_table', // column in other table to connect

  // optional
  name: 'custom_fkey_name', // custom name of constraint
  onUpdate: 'CASCADE', // action to perform on update
  onDelete: 'CASCADE', // action to perform on delete
  index: true | IndexOptions // add index on the column
})
```

### Drop foreign key

```js
db.dropForeignKey('table', ForeignKeyOptions)
```

### Add index

```js
db.addIndex('table', 'column', {
  name: string, // index name
  unique: boolean, // whether the index should be unique
  expression: number | string, // for this syntax: CREATE INDEX name ON table ( column( expression ) )
  order: string, // index order: ASC, DESC, NULLS FIRST/LAST
  using: string, // index method
  including: string, // for INCLUDING statement
  with: string, // for WITH statement
  tablespace: string, // for TABLESPACE
  where: string, // filter rows for the index with query
  mode: string, // RESTRICT | CASCADE for rollback
})
```

### Drop index

```js
db.dropIndex('table', 'column', options)
```
