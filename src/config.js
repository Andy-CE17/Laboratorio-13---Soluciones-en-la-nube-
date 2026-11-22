import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 8080),
  mode: (process.env.DATA_MODE || 'local').toLowerCase(),
  region: process.env.AWS_REGION || 'us-east-1',
  tableName: process.env.DYNAMODB_TABLE || 'dsn5c-lab13-acampos-ddb-employees',
  bucketName: process.env.S3_BUCKET || '',
  signedUrlTtl: Number(process.env.SIGNED_URL_TTL || 900),
};

export function assertAwsConfig() {
  const missing = [];
  if (!config.tableName) missing.push('DYNAMODB_TABLE');
  if (!config.bucketName) missing.push('S3_BUCKET');
  if (missing.length) {
    throw new Error(`Faltan variables AWS: ${missing.join(', ')}`);
  }
}
