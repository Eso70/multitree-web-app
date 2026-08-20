import * as crypto from 'crypto';
import type { FastifyRequest } from 'fastify';
import { StorageService } from '../storage/storage.service';
import { validateImageUpload } from '../storage/image-upload';

type MultipartFile = NonNullable<Awaited<ReturnType<FastifyRequest['file']>>>;

/** Stores a validated mini-website image under its owner's namespace. */
export async function uploadMiniWebsiteImage(
  data: MultipartFile,
  storage: StorageService,
  ownerId: string,
  namespace: 'businesses' | 'multitree',
): Promise<string> {
  const buffer = await data.toBuffer();
  const extension = validateImageUpload(buffer, data.mimetype);
  const base = (data.filename.split('.').slice(0, -1).join('.') || 'image')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 80);
  const filename = `${base || 'image'}-${Date.now()}-${crypto
    .randomBytes(6)
    .toString('hex')}.${extension}`;
  const url = await storage.uploadImage(
    buffer,
    `${namespace}/${ownerId}/mini-websites/_drafts/${filename}`,
  );
  await storage.claimBusinessAssets(ownerId, url);
  return url;
}
