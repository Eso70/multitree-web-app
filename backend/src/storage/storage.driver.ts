export const STORAGE_DRIVER = Symbol('STORAGE_DRIVER');

export interface StorageDriver {
  checkHealth(): Promise<void>;
  write(key: string, content: Buffer): Promise<void>;
  read(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<boolean>;
  list?(): Promise<Array<{ key: string; size: number }>>;
}
