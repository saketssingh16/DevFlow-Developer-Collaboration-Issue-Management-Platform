import { Readable } from 'node:stream';
import { StorageProvider, StoredFile } from './storage.interface.js';

/** S3-compatible provider boundary. Configure an SDK-backed implementation before enabling STORAGE_PROVIDER=s3. */
export class S3StorageProvider implements StorageProvider {
  async store(_input: { storageKey: string; content: Buffer; contentType: string }): Promise<StoredFile> { throw new Error('S3 storage is not configured'); }
  async read(_storageKey: string): Promise<Readable> { throw new Error('S3 storage is not configured'); }
  async delete(_storageKey: string): Promise<void> { throw new Error('S3 storage is not configured'); }
}
