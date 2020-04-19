import Table from './table';
import { Schema, ColumnOptions, ForeignKeyOptions, IndexOptions } from '../../types';
export declare type ChangeTableCallback = (t: ChangeTable) => any;
export declare class ChangeTable extends Table {
    addColumnSql: (sql: string) => void;
    constraint: (name: string, sql?: string | undefined) => void;
    removeConstraint: (name: string, sql?: string | undefined) => void;
    alterColumn: (name: string, sql: string) => void;
    change: (name: string, options: ColumnOptions) => void;
    comment: (column: string, message: string) => number;
    default: (column: string, value: any) => void;
    null: (column: string, value: boolean) => void;
    remove: (name: string, type: string, options?: ColumnOptions | undefined) => void;
    removeIndex: (name: string, options?: true | IndexOptions) => number;
    removeForeignKey: (name: string, options: ForeignKeyOptions) => void;
    __commit: (db: Schema, fn?: ChangeTableCallback | undefined) => void;
}
