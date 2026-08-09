import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { constants, existsSync } from 'fs';
import { access } from 'fs/promises';
import { mkdir, readFile, readdir, stat, unlink, writeFile } from 'fs/promises';
import { basename, dirname, join, relative, resolve, sep } from 'path';
import type { StorageDriver } from './storage.driver';

export function resolveDefaultUploadDirectory(
  workingDirectory = process.cwd(),
): string {
  const resolvedWorkingDirectory = resolve(workingDirectory);
  const projectRoot = ['backend', 'frontend'].includes(
    basename(resolvedWorkingDirectory).toLowerCase(),
  )
    ? resolve(resolvedWorkingDirectory, '..')
    : resolvedWorkingDirectory;

  return join(projectRoot, '.runtime', 'uploads');
}

@Injectable()
export class LocalStorageDriver implements StorageDriver {
  private readonly rootDirectory: string;

  constructor(configService: ConfigService) {
    this.rootDirectory = resolve(
      configService.get<string>('UPLOAD_DIR') ||
        resolveDefaultUploadDirectory(),
    );
  }

  async checkHealth(): Promise<void> {
    await mkdir(this.rootDirectory, { recursive: true });
    await access(this.rootDirectory, constants.R_OK | constants.W_OK);
  }

  async write(key: string, content: Buffer): Promise<void> {
    const filePath = this.resolveKey(key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, content);
  }

  async read(key: string): Promise<Buffer | null> {
    const filePath = this.resolveKey(key);
    if (!existsSync(filePath)) return null;
    return readFile(filePath);
  }

  async delete(key: string): Promise<boolean> {
    const filePath = this.resolveKey(key);
    if (!existsSync(filePath)) return false;
    await unlink(filePath);
    return true;
  }

  async list(): Promise<Array<{ key: string; size: number }>> {
    if (!existsSync(this.rootDirectory)) return [];
    const assets: Array<{ key: string; size: number }> = [];
    const walk = async (directory: string): Promise<void> => {
      const entries = await readdir(directory, { withFileTypes: true });
      for (const entry of entries) {
        const filePath = join(directory, entry.name);
        if (entry.isDirectory()) await walk(filePath);
        else if (entry.isFile()) {
          const details = await stat(filePath);
          assets.push({
            key: relative(this.rootDirectory, filePath).split(sep).join('/'),
            size: details.size,
          });
        }
      }
    };
    await walk(this.rootDirectory);
    return assets;
  }

  private resolveKey(key: string): string {
    const filePath = resolve(this.rootDirectory, key);
    if (
      filePath !== this.rootDirectory &&
      !filePath.startsWith(`${this.rootDirectory}${sep}`)
    ) {
      throw new Error('Invalid storage key: path traversal detected');
    }
    return filePath;
  }
}
