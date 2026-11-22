import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const uploadDirectory = path.join(root, 'storage', 'uploads');
const s3 = new S3Client({ region: config.region });

function safeExtension(mimetype) {
  return ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' })[mimetype] || '.bin';
}

export class PhotoStorage {
  async save(file) {
    if (!file) return '';
    const key = `employees/${randomUUID()}${safeExtension(file.mimetype)}`;
    if (config.mode === 'aws') {
      await s3.send(new PutObjectCommand({
        Bucket: config.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ServerSideEncryption: 'AES256',
      }));
    } else {
      await mkdir(uploadDirectory, { recursive: true });
      await writeFile(path.join(uploadDirectory, path.basename(key)), file.buffer);
    }
    return key;
  }

  async url(key) {
    if (!key) return '';
    if (config.mode !== 'aws') return `/uploads/${path.basename(key)}`;
    return getSignedUrl(s3, new GetObjectCommand({ Bucket: config.bucketName, Key: key }), {
      expiresIn: config.signedUrlTtl,
    });
  }

  async remove(key) {
    if (!key) return;
    if (config.mode === 'aws') {
      await s3.send(new DeleteObjectCommand({ Bucket: config.bucketName, Key: key }));
      return;
    }
    await unlink(path.join(uploadDirectory, path.basename(key))).catch(() => {});
  }
}
