import { AddIndexFunction, ConstraintFunction, ForeignKeyOptions, ReferenceOptions, ColumnFunction } from '../../types';
export declare const references: ({ toTable, primaryKey, onDelete, onUpdate }: ForeignKeyOptions) => string;
export declare const reference: (table: string, column: ColumnFunction, addIndex: AddIndexFunction, name: string, { type, ...options }?: ReferenceOptions) => void;
export declare const addForeignKey: (table: string, constraint: ConstraintFunction, addIndex: AddIndexFunction, name: string, options?: ForeignKeyOptions) => void;
