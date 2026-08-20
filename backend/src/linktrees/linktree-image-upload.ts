import * as crypto from 'crypto';
import type { FastifyRequest } from 'fastify';
import { StorageService } from '../storage/storage.service';
import { validateImageUpload } from '../storage/image-upload';

type MultipartFile = NonNullable<Awaited<ReturnType<FastifyRequest['file']>>>;

function multipartField(data: MultipartFile, name: string): string | undefined {
  const field = data.fields?.[name] as { value?: unknown } | undefined;
  return typeof field?.value === 'string' ? field.value : undefined;
}

function pathSegment(value: string | undefined, fallback: string): string {
  const cleaned = (value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return (cleaned || fallback).slice(0, 80);
}

/** Stores a validated Linktree image under a caller-owned namespace. */
export async function uploadLinktreeImage(
  data: MultipartFile,
  storage: StorageService,
  ownerId: string,
  namespace: 'businesses' | 'multitree',
): Promise<string> {
  const fileBuffer = await data.toBuffer();
  const extension = validateImageUpload(fileBuffer, data.mimetype);
  const linktreeKey = pathSegment(
    multipartField(data, 'linktreeKey'),
    '_drafts',
  );
  const submittedAssetType = pathSegment(
    multipartField(data, 'assetType'),
    'profile-image',
  );
  const assetType = ['profile-image', 'background-image'].includes(
    submittedAssetType,
  )
    ? submittedAssetType
    : 'profile-image';
  const baseName = data.filename.split('.').slice(0, -1).join('.') || 'image';
  const sanitizedBaseName = (
    baseName.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'image'
  ).slice(0, 80);
  const filename = `${sanitizedBaseName}-${Date.now()}-${crypto
    .randomBytes(6)
    .toString('hex')}.${extension}`;
  const storagePath = `${namespace}/${ownerId}/linktrees/${linktreeKey}/${assetType}/${filename}`;
  const url = await storage.uploadImage(fileBuffer, storagePath);
  await storage.claimBusinessAssets(ownerId, url);
  return url;
}
