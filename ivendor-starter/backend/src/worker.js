require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://ivendor:ivendor@localhost:5432/ivendor' });

function sleep(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }

async function processOne(){
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // pick one open verification case and lock it
    const selectSql = `SELECT vc.id as vc_id, vc.document_id, d.s3_key FROM verification_cases vc JOIN documents d ON d.id = vc.document_id WHERE vc.status = 'open' FOR UPDATE SKIP LOCKED LIMIT 1`;
    const { rows } = await client.query(selectSql);
    if (rows.length === 0){
      await client.query('COMMIT');
      return false;
    }
    const row = rows[0];
    console.log('Picked verification case', row.vc_id, 'for document', row.document_id);

    // set case status to in_progress and document to processing
    await client.query('UPDATE verification_cases SET status=$1, updated_at=now() WHERE id=$2', ['in_progress', row.vc_id]);
    await client.query('UPDATE documents SET status=$1, updated_at=now() WHERE id=$2', ['processing', row.document_id]);

    // simulate OCR / AI processing (sleep)
    await client.query('COMMIT');
    // Simulate time-consuming work
    await sleep(2000 + Math.floor(Math.random()*2000));

    // Start new transaction to write results
    await client.query('BEGIN');
    // Simple mock: random confidence
    const confidence = Math.random();
    const extracted = { mock: true, text: 'Sample OCR text', confidence };
    const decision = confidence > 0.6 ? 'approved' : 'rejected';

    await client.query('UPDATE documents SET extracted=$1, confidence=$2, status=$3, updated_at=now() WHERE id=$4', [extracted, confidence, decision === 'approved' ? 'approved' : 'rejected', row.document_id]);
    await client.query('UPDATE verification_cases SET status=$1, decision=$2, notes=$3, updated_at=now() WHERE id=$4', ['resolved', decision, `auto-${decision}`, row.vc_id]);

    // Insert audit log
    await client.query('INSERT INTO audit_logs(tenant_id, actor_id, actor_role, action, resource_type, resource_id, after_state, created_at) VALUES($1,$2,$3,$4,$5,$6,$7,now())', [null, null, 'system', `verification.${decision}`, 'document', row.document_id, JSON.stringify({ confidence, decision })]);
    await client.query('COMMIT');

    console.log(`Processed document ${row.document_id} -> ${decision} (confidence=${confidence.toFixed(2)})`);
    return true;
  } catch (err) {
    console.error('Worker error, rolling back', err);
    try { await client.query('ROLLBACK'); } catch(e){}
    return false;
  } finally {
    client.release();
  }
}

async function run(){
  console.log('Mock verification worker started');
  while(true){
    try{
      const didWork = await processOne();
      if(!didWork){
        // nothing to do, sleep a bit
        await sleep(2000);
      }
    } catch(err){
      console.error('Unexpected worker error', err);
      await sleep(3000);
    }
  }
}

run().catch(err => { console.error('Worker crashed', err); process.exit(1); });
