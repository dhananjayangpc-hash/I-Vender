require('dotenv').config();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost:9000';
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || 'minioadmin';
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || 'minioadmin';
const S3_FORCE_PATH_STYLE = (process.env.S3_FORCE_PATH_STYLE || 'true') === 'true';
const S3_BUCKET = process.env.S3_BUCKET || 'ivendor-bucket';

const s3Client = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT,
  credentials: { accessKeyId: S3_ACCESS_KEY, secretAccessKey: S3_SECRET_KEY },
  forcePathStyle: S3_FORCE_PATH_STYLE,
});

async function ensureBucketExists(){
  try{
    // Try a head bucket (PutObject will create implicitly in MinIO for tests), keep simple for starter
    return true;
  } catch (err){
    console.warn('Bucket check failed', err);
    return false;
  }
}

async function getPresignedPutUrl(key, contentType = 'application/octet-stream', expiresIn = 600){
  const command = new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, ContentType: contentType });
  const url = await getSignedUrl(s3Client, command, { expiresIn });
  return url;
}

module.exports = { s3Client, getPresignedPutUrl, S3_BUCKET, ensureBucketExists };
