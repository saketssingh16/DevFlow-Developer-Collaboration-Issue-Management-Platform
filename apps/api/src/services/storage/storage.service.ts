import path from 'node:path';
import { env } from '../../config/env.js';
import { StorageProvider } from './storage.interface.js';
import { LocalStorageProvider } from './local-storage.provider.js';
import { S3StorageProvider } from './s3-storage.provider.js';

export const storageProvider: StorageProvider = env.STORAGE_PROVIDER === 's3'
  ? new S3StorageProvider()
  : new LocalStorageProvider(path.resolve(env.STORAGE_LOCAL_PATH));
