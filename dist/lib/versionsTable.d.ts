import { DbConfig } from '../types';
import Migration from './migration';
export declare const createSchemaMigrations: (db: Migration) => Promise<unknown>;
export declare const createForConfig: (config: DbConfig) => Promise<void>;
export declare const create: () => Promise<void>;
