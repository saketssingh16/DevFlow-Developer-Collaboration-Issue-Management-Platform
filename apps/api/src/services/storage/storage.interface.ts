import { Readable } from 'node:stream';

export interface StoredFile {
  storageKey: string;
  url: string;
}

export interface StorageProvider {
  store(input: { storageKey: string; content: Buffer; contentType: string }): Promise<StoredFile>;
  read(storageKey: string): Promise<Readable>;
  delete(storageKey: string): Promise<void>;
}
