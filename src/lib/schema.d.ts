import { Adapter, AdapterProps } from 'pg-adapter';
import { ChangeTableCallback } from './schema/changeTable';
import { TableOptions, JoinTableOptions, ColumnOptions, TableCallback, ReferenceOptions, ForeignKeyOptions, IndexOptions } from '../types';
export default class Schema extends Adapter {
    reverse: boolean;
    constructor({ reverse, ...params }: AdapterProps & {
        reverse: boolean;
    });
    createTable(name: string, options?: TableOptions | TableCallback, fn?: TableCallback): void | Promise<unknown>;
    changeTable(name: string, options?: TableOptions | ChangeTableCallback, fn?: ChangeTableCallback): void;
    dropTable(name: string, options?: TableOptions | TableCallback, fn?: TableCallback): void | Promise<unknown>;
    addBelongsTo(table: string, name: string, options?: ReferenceOptions): void;
    addColumn(table: string, name: string, type: string, options?: ColumnOptions): void;
    addForeignKey(table: string, name: string, options?: ForeignKeyOptions): void;
    addIndex(table: string, name: string, options?: IndexOptions): void;
    addReference(table: string, name: string, options?: ReferenceOptions): void;
    addTimestamps(table: string, options?: ColumnOptions): void;
    changeColumn(table: string, name: string, options: ColumnOptions): void;
    changeColumnComment(table: string, column: string, comment: string): void;
    changeColumnDefault(table: string, column: string, value: any): void;
    changeColumnNull(table: string, column: string, value: boolean): void;
    changeTableComment(table: string, comment: string): void;
    columnExists(table: string, column: string): false | Promise<unknown>;
    createJoinTable(tableOne: string, tableTwo: string, options?: JoinTableOptions | TableCallback, cb?: TableCallback): void;
    dropJoinTable(tableOne: string, tableTwo: string, options?: JoinTableOptions | TableCallback, cb?: TableCallback): void;
    foreignKeyExists(fromTable: string, options: string | {
        name?: string;
        column: string;
    }): false | Promise<unknown>;
    tableExists(table: string): false | Promise<unknown>;
}
