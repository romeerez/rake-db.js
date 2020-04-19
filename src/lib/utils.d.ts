/// <reference types="node" />
import { Adapter } from 'pg-adapter';
import { DbConfig } from '../types';
export declare const DbConfigsPath: () => string | undefined;
export declare const dbDirPath: () => string;
export declare const dbMigratePath: () => string;
export declare const readFile: (path: string) => Promise<Buffer>;
export declare const getConfig: () => Promise<any>;
export declare const adapter: (config: DbConfig, Class?: typeof Adapter, params?: {}) => Adapter;
export declare const join: (...args: string[]) => string;
export declare const noop: () => void;
