require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { initDb, query } = require('./db');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(bodyParser.json());

const API_PREFIX = '/api/v1';

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post(`${API_PREFIX}/tenants`, async (req, res) => {
  const { name, plan } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uuidv4();
  await query('INSERT INTO tenants(id, name, plan) VALUES($1,$2,$3)', [id, name, plan || 'starter']);
  res.status(201).json({ id, name, plan: plan || 'starter' });
});

app.post(`${API_PREFIX}/tenants/:tenantId/vendors`, async (req, res) => {
  const { tenantId } = req.params;
  const { name, primary_contact } = req.body;
  if (!name) return res.status(400).json({ error: 'vendor name required' });
  const id = uuidv4();
  await query('INSERT INTO vendors(id, tenant_id, name, primary_contact, status) VALUES($1,$2,$3,$4,$5)', [id, tenantId, name, JSON.stringify(primary_contact || {}), 'draft']);
  res.status(201).json({ id, tenant_id: tenantId, name, status: 'draft' });
});

// Document upload: create document row and return a presigned PUT URL (S3/MinIO compatible)
const { getPresignedPutUrl, S3_BUCKET } = require('./s3');

app.post(`${API_PREFIX}/tenants/:tenantId/vendors/:vendorId/documents`, async (req, res) => {
  const { tenantId, vendorId } = req.params;
  const { filename, type, contentType } = req.body;
  if (!filename || !type) return res.status(400).json({ error: 'filename and type required' });
  const id = uuidv4();
  const s3Key = `tenants/${tenantId}/vendors/${vendorId}/documents/${id}/${filename}`;
  // Insert document record with uploaded status; actual file will be PUT to presigned URL
  await query('INSERT INTO documents(id, vendor_id, tenant_id, type, s3_key, status, sha256) VALUES($1,$2,$3,$4,$5,$6,$7)', [id, vendorId, tenantId, type, s3Key, 'uploaded', 'pending']);
  try {
    const uploadUrl = await getPresignedPutUrl(s3Key, contentType || 'application/octet-stream');
    res.status(201).json({ documentId: id, uploadUrl, bucket: S3_BUCKET, key: s3Key });
  } catch (err) {
    console.error('Failed to generate presigned URL', err);
    res.status(500).json({ error: 'failed to generate upload url' });
  }
});

// Mark upload complete: create a verification case and set document to processing
app.post(`${API_PREFIX}/tenants/:tenantId/vendors/:vendorId/documents/:documentId/complete`, async (req, res) => {
  const { tenantId, vendorId, documentId } = req.params;
  try {
    // update document status to processing
    await query('UPDATE documents SET status=$1, updated_at=now() WHERE id=$2 AND tenant_id=$3', ['processing', documentId, tenantId]);
    // create verification case
    const vcId = uuidv4();
    await query('INSERT INTO verification_cases(id, document_id, tenant_id, status) VALUES($1,$2,$3,$4)', [vcId, documentId, tenantId, 'open']);
    // audit log
    await query('INSERT INTO audit_logs(tenant_id, actor_id, actor_role, action, resource_type, resource_id, after_state, created_at) VALUES($1,$2,$3,$4,$5,$6,$7,now())', [tenantId, null, 'system', 'document.upload_complete', 'document', documentId, JSON.stringify({ status: 'processing' })]);
    res.status(202).json({ verificationCaseId: vcId, status: 'queued' });
  } catch (err) {
    console.error('Error creating verification case', err);
    res.status(500).json({ error: 'failed to create verification case' });
  }
});

// MinIO / S3-style webhook receiver
app.post('/webhooks/minio', async (req, res) => {
  try {
    // Basic shared-secret verification (header or query param)
    const expected = process.env.MINIO_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET || null;
    if (expected) {
      const headerSecret = req.headers['x-ivendor-webhook-secret'];
      const querySecret = (req.query && req.query.secret) || null;
      if (headerSecret !== expected && querySecret !== expected) {
        console.warn('Webhook secret mismatch', { headerSecret: !!headerSecret, querySecret: !!querySecret });
        return res.status(401).json({ error: 'invalid webhook secret' });
      }
    }
    const body = req.body;
    // MinIO uses S3-style events; records may be in `Records` array
    const records = body.Records || body.records || [];
    if (!Array.isArray(records) || records.length === 0) return res.status(200).json({ received: 0 });
    let created = 0;
    for (const r of records) {
      // event record shape: r.s3.bucket.name, r.s3.object.key
      const s3 = r.s3 || r.S3 || {};
      const bucket = (s3.bucket && s3.bucket.name) || (r.bucket && r.bucket.name) || null;
      const key = (s3.object && s3.object.key) || r.key || r.object || null;
      if (!key) continue;
      const decodedKey = decodeURIComponent(key.replace(/\+/g, ' '));
      // Find document by s3_key
      const docRes = await query('SELECT id, tenant_id FROM documents WHERE s3_key = $1 LIMIT 1', [decodedKey]);
      if (docRes.rowCount === 0) continue;
      const doc = docRes.rows[0];
      // ensure no open/in_progress case exists
      const existing = await query('SELECT id FROM verification_cases WHERE document_id = $1 AND status IN ($2,$3) LIMIT 1', [doc.id, 'open', 'in_progress']);
      if (existing.rowCount > 0) continue;
      // update document status to processing
      await query('UPDATE documents SET status=$1, updated_at=now() WHERE id=$2', ['processing', doc.id]);
      // create verification case
      const vcId = uuidv4();
      await query('INSERT INTO verification_cases(id, document_id, tenant_id, status) VALUES($1,$2,$3,$4)', [vcId, doc.id, doc.tenant_id, 'open']);
      // audit
      await query('INSERT INTO audit_logs(tenant_id, actor_id, actor_role, action, resource_type, resource_id, after_state, created_at) VALUES($1,$2,$3,$4,$5,$6,$7,now())', [doc.tenant_id, null, 'system', 'document.upload_event', 'document', doc.id, JSON.stringify({ s3_key: decodedKey, status: 'processing' })]);
      created += 1;
    }
    return res.status(200).json({ received: records.length, created });
  } catch (err) {
    console.error('Error handling minio webhook', err);
    return res.status(500).json({ error: 'webhook processing failed' });
  }
});

app.get(`${API_PREFIX}/tenants/:tenantId/verification/queue`, async (req, res) => {
  const { tenantId } = req.params;
  const rows = await query('SELECT vc.id, vc.document_id, vc.status, d.type, d.s3_key, d.confidence FROM verification_cases vc JOIN documents d ON vc.document_id = d.id WHERE vc.status = $1 AND vc.tenant_id = $2 LIMIT 50', ['open', tenantId]);
  res.json({ items: rows.rows });
});

const PORT = process.env.PORT || 4000;
initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`I-Vendor starter backend listening on ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to initialize DB', err);
    process.exit(1);
  });
