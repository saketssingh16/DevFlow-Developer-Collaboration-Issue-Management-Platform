import { createReadStream } from 'node:fs';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { StorageProvider, StoredFile } from './storage.interface.js';

export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly rootPath: string) {}

  private resolveKey(storageKey: string) {
    const root = path.resolve(this.rootPath);
    const target = path.resolve(root, storageKey);
    if (!target.startsWith(`${root}${path.sep}`)) throw new Error('Invalid storage key');
    return target;
  }

  async store(input: { storageKey: string; content: Buffer; contentType: string }): Promise<StoredFile> {
    const target = this.resolveKey(input.storageKey);
    await mkdir(path.dirname(target), { recursive: true });
    const temporary = `${target}.${randomUUID()}.uploading`;
    await writeFile(temporary, input.content, { flag: 'wx' });
    await rename(temporary, target);
    return { storageKey: input.storageKey, url: `/api/v1/attachments/${encodeURIComponent(input.storageKey)}` };
  }

  async read(storageKey: string) {
    return createReadStream(this.resolveKey(storageKey));
  }

  async delete(storageKey: string) {
    try { await unlink(this.resolveKey(storageKey)); } catch (error) { if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) throw error; }
  }
}
