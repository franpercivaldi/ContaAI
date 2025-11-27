import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from './db.js';

const region = process.env.S3_REGION!;
export const bucket = process.env.S3_BUCKET!;
const accessKeyId = process.env.S3_ACCESS_KEY!;
const secretAccessKey = process.env.S3_SECRET_KEY!;
const useSSL = process.env.S3_USE_SSL === 'true';

export const s3 = new S3Client({
  region,
  credentials: { accessKeyId, secretAccessKey },
  // Para AWS real NO hace falta endpoint ni forcePathStyle.
  // TLS/SSL lo maneja automáticamente; useSSL lo podríamos ignorar, pero lo mantenemos por si se reusa
});

/**
 * Devuelve URL presignada para un archivo de factura
 */
export async function getPresignedUrlForFile(fileId: string) {
  const file = await prisma.invoiceFile.findUnique({
    where: { id: fileId }
  });

  if (!file) return null;

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: file.s3Key
  });

  const expiresIn = 60 * 5; // 5 minutos
  const url = await getSignedUrl(s3, command, { expiresIn });

  return { url, expiresIn };
}
