# I-Vendor Scalability Roadmap

## Overview

This roadmap outlines how I-Vendor scales from 1x (MVP) to 10x (1M+ vendors, 100M+ documents) to 100x (10M+ vendors, 10B+ documents).

---

## Phase 1: MVP (1x) — Current

**Characteristics**:
- Single-region deployment
- Monolithic backend (Node/Express)
- Single Postgres primary + 1 read replica
- In-process workers (verification)
- 3-5 backend replicas, 2 frontend replicas

**Capacity**:
- ~100 vendors, ~1,000 documents
- ~50 concurrent API requests
- Worker throughput: ~500 documents/hour

**Bottlenecks**:
- DB write latency (single primary)
- Verification queue latency (in-process)
- Search on OCRed text (no full-text index)

---

## Phase 2: Scale to 10x

**Timeline**: Months 6-12

**Target**:
- 10,000 vendors, 100,000 documents
- 500 concurrent API requests
- Worker throughput: 5,000 documents/hour

### 2.1 Database Scaling

**Problem**: Single Postgres primary becomes write-bottleneck.

**Solution**: Tenant-based sharding

```
Shard 1: Tenants A-G
Shard 2: Tenants H-M
Shard 3: Tenants N-Z
Shard 4: Enterprise/high-volume tenants
```

**Implementation**:
- Deploy 3-4 independent Postgres instances (RDS Multi-AZ recommended).
- Add sharding middleware layer:
  ```javascript
  const shard = hashFunction(tenantId) % 4; // which shard
  const conn = shardConnections[shard];
  await conn.query(...);
  ```
- Use Postgres foreign data wrapper (FDW) for distributed queries if needed (joins across shards).
- Replicate cross-shard metadata (tenants, settings) to a central reference DB (read-only).

**Benefits**: Write scaling (4x throughput), isolation between tenants, easier recovery.

### 2.2 Verification Worker Scaling

**Problem**: In-process workers can't scale beyond 1 node; bottleneck in OCR/AI processing.

**Solution**: Distributed queue-based workers

```
Frontend → Backend API → Kafka (verification.queue)
                        ↓
                    Worker Pool (3-5 nodes)
                        ↓
                   OCR Service (Google Document AI / AWS Textract)
                        ↓
                   Store results → Postgres
```

**Implementation**:
- Replace in-process queue with Kafka or RabbitMQ.
- Deploy 3-5 independent worker containers (auto-scale via Kubernetes HPA).
- Each worker consumes from partition, processes, stores result, commits offset.
- Idempotent processing: include document hash in message; skip if already processed.

**Configuration**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ivendor-worker
spec:
  replicas: 5 # auto-scaled by HPA
  template:
    spec:
      containers:
      - name: worker
        image: ghcr.io/ivendor/ivendor-worker:latest
        env:
        - name: KAFKA_BROKERS
          value: "kafka-1:9092,kafka-2:9092,kafka-3:9092"
        - name: KAFKA_TOPIC
          value: "verification.queue"
        - name: WORKER_THREADS
          value: "4"
```

**Throughput**: 1,000 documents/worker/hour → 5,000 docs/hour with 5 workers.

### 2.3 Search Scaling

**Problem**: Postgres full-text search is limited; OCRed text searches slow.

**Solution**: Dedicated search cluster (OpenSearch/Elasticsearch)

```
Backend → OpenSearch cluster (3-5 nodes)
          ↓
          Indexes: vendors, documents (with OCR text), verification_cases
```

**Implementation**:
- Deploy OpenSearch cluster (managed service or self-hosted).
- Index vendors, documents, audit logs (async via background job).
- Indexing pipeline:
  ```javascript
  // After document approved, index OCR text
  await elasticsearch.index({
    index: 'documents',
    id: documentId,
    body: { vendor_id, tenant_id, type, extracted_text, confidence, created_at }
  });
  ```
- Search queries hit OpenSearch, not Postgres.

**Benefits**: Sub-100ms search latency, fuzzy matching, aggregations, analytics.

### 2.4 Caching Layer

**Problem**: Repeated queries hit DB; high latency for frequently accessed data.

**Solution**: Redis cache

```
Backend → Redis (cache)
          ↓ miss → Postgres
```

**Implementation**:
```javascript
// Cache vendor profile (5 min TTL)
const cacheKey = `vendor:${vendorId}`;
let vendor = await redis.get(cacheKey);
if (!vendor) {
  vendor = await db.query('SELECT * FROM vendors WHERE id = $1', [vendorId]);
  await redis.set(cacheKey, JSON.stringify(vendor), 'EX', 300);
}
```

**Cache patterns**:
- Vendor profiles (5 min)
- User permissions (5 min)
- Tenant settings (10 min)
- Event invite counts (1 min)

**Benefits**: 90%+ cache hit rate for read-heavy workloads; 10x latency reduction.

### 2.5 Multi-Region

**Problem**: Single region has latency for distant users.

**Solution**: Read replicas in other regions; write through primary

```
Primary (US-East-1) ← API writes
            ↓
Read Replicas (EU-West-1, AP-Northeast-1)
            ↓
Regional API → regional reads
```

**Implementation**:
- Postgres logical replication to standby regions.
- Regional API instances read from local replicas, write to primary (over WAN).
- Acceptable write latency: 50-100ms (cross-region).

**Cost/Benefit**: +$5k/month, 100-200ms latency reduction for distant regions.

---

## Phase 3: Scale to 100x

**Timeline**: Months 18-24

**Target**:
- 1,000,000 vendors, 10,000,000 documents
- 5,000 concurrent API requests
- Worker throughput: 50,000 documents/hour

### 3.1 Database Sharding at Scale

**Problem**: 3-4 shards still has single-shard bottleneck.

**Solution**: Dynamic sharding + consistent hashing

```
Hash(tenantId) → bucket [0-4095]
Each bucket maps to shard dynamically (allow re-sharding)
```

**Implementation**:
- Use consistent hashing library (e.g., ketama).
- Deploy 8-16 Postgres shards.
- Gradual re-sharding without downtime via double-write during migration.

### 3.2 Kafka Partitioning

**Problem**: Single Kafka partition for verification queue becomes bottleneck.

**Solution**: Partition by document type (or tenant hash)

```
Topic: verification.queue
Partition 0: ID documents (hash(doc_id) % 16 = 0)
Partition 1: ID documents (hash(doc_id) % 16 = 1)
...
Partition 15: Tax documents (hash(doc_id) % 16 = 15)

Worker 1 → consumes partitions 0, 1, 2
Worker 2 → consumes partitions 3, 4, 5
...
```

**Throughput**: 16 partitions × 3,000 msgs/partition/sec = 48k msgs/sec.

### 3.3 CQRS for Analytics

**Problem**: Reporting queries hurt transactional DB performance.

**Solution**: Command Query Responsibility Segregation (CQRS)

```
Transactional DB (write optimized)
            ↓ (event stream via Kafka)
Analytics DB (ClickHouse or Snowflake) (read optimized)
```

**Implementation**:
- Emit events on every vendor/document change (Kafka topic: `events.all`).
- ClickHouse consumer subscribes, builds materialized views for dashboards.
- Dashboards query ClickHouse, not Postgres.

**Benefits**: 1000x query speedup for aggregations, no impact on transactional system.

### 3.4 Document Storage at Scale

**Problem**: Millions of documents in single S3 bucket → performance degrades.

**Solution**: Partition by tenant + lifecycle policies

```
s3://ivendor/tenants/tenant-1/2025/01/doc-1.pdf
s3://ivendor/tenants/tenant-2/2025/02/doc-2.pdf
...

Lifecycle: 90 days → Glacier, 7 years → deep archive, then delete
```

**Benefits**: Faster list operations, cost savings (Glacier ~$4/TB/month vs S3 ~$23/TB/month).

### 3.5 Verification ML at Scale

**Problem**: OCR inference latency becomes bottleneck; manual review queue overwhelmed.

**Solution**: Distributed ML pipeline

```
Verification Queue (Kafka)
            ↓
Batch Processor (GPU cluster)
  - Batch 1,000 docs every 30s
  - Run inference on GPU (100x faster than CPU)
  - Write results back to DB
            ↓
Manual Review Queue (only low-confidence cases, <5%)
```

**Implementation**:
- Deploy GPU-accelerated worker nodes in K8s.
- Use NVIDIA Triton for model serving.
- Batch processing: collect docs, run inference on GPU, commit results.
- Reduces manual review queue by 95%.

**Cost**: +$50k/month GPU, saves $100k/month in manual review labor.

### 3.6 Global CDN for Frontend

**Problem**: Frontend assets served from single region; slow for distant users.

**Solution**: CloudFront/Cloudflare + cache invalidation

```
CloudFront (global)
    ↓
  Edge locations (300+ worldwide)
    ↓
  S3 origin (us-east-1)
```

**Configuration**:
```yaml
# Cache frontend assets
Cache-Control: public, max-age=604800 # 7 days for JS/CSS

# API calls always fresh
Cache-Control: no-cache, no-store
```

**Benefits**: Sub-100ms frontend load time globally.

---

## 4. Observability at Scale

### Metrics & Alerting

Deploy Prometheus + Grafana + PagerDuty:
- API latency (p50, p95, p99)
- Error rate per endpoint
- Kafka consumer lag
- DB connection pool usage
- Worker queue depth
- Cache hit rate

### Tracing

Use Jaeger to trace requests across services:
```
API request → DB → Cache → S3 (trace tree)
```

### Logs

Aggregate logs to ELK with 7-year retention:
- Audit logs (searchable by actor, resource, action)
- Error logs (errors grouped by signature)
- Application logs (debug traces for troubleshooting)

---

## 5. Cost Optimization

### Current (1x)
- Postgres RDS: $500/month
- Kubernetes: $1,000/month (EKS)
- S3: $100/month
- **Total**: ~$2,000/month

### 10x
- Postgres (4 shards): $2,000/month
- Kubernetes: $3,000/month (20 nodes)
- OpenSearch: $1,500/month
- Redis: $500/month
- Kafka: $1,000/month
- S3 + bandwidth: $500/month
- **Total**: ~$9,000/month

### 100x (with optimizations)
- Postgres (16 shards): $5,000/month
- Kubernetes: $8,000/month (50 nodes)
- OpenSearch: $2,000/month
- ClickHouse: $1,500/month
- Redis (cluster): $1,000/month
- Kafka: $2,000/month
- GPU workers: $2,000/month
- S3 + Glacier: $2,000/month
- CDN: $1,000/month
- Monitoring: $1,000/month
- **Total**: ~$26,000/month
- **Per-vendor cost**: $26,000 / 1,000,000 = $0.026/month (~$0.31/year)

---

## 6. Performance Targets

| Phase | Vendors | Docs | Concurrent API | p95 API Latency | Docs/hour | DB Connections |
|-------|---------|------|---|---|---|---|
| 1x | 100 | 1K | 50 | 150ms | 500 | 10 |
| 10x | 10K | 100K | 500 | 200ms | 5K | 50 |
| 100x | 1M | 10M | 5K | 250ms | 50K | 200 |

---

## 7. Execution Priority

1. **Month 6**: Shard database, add Redis cache.
2. **Month 9**: Deploy Kafka workers, OpenSearch, multi-region read replicas.
3. **Month 12**: CQRS analytics, GPU ML pipeline.
4. **Month 18**: Dynamic sharding, ClickHouse, global CDN.

---

## 8. Monitoring Scaling

Track these metrics to detect scaling issues early:

- **DB CPU**: Alert if > 70% (add shard/replicas)
- **API p95 latency**: Alert if > 300ms (add replicas or cache)
- **Kafka consumer lag**: Alert if > 10s (add partitions/workers)
- **Cache hit rate**: Alert if < 80% (tune TTL)
- **Queue depth**: Alert if > 10k (scale workers)

Implement auto-scaling thresholds in HPA and RDS Auto Scaling.

---

## Summary

I-Vendor scales horizontally:
- **Database**: Sharded by tenant for write-scaling + read replicas for geographic distribution.
- **Workers**: Distributed queue-based system with GPU acceleration.
- **Search**: Dedicated search cluster (OpenSearch).
- **Caching**: Redis for hot data.
- **Analytics**: CQRS with ClickHouse.
- **Frontend**: Global CDN.

Each phase is backward-compatible; no breaking changes required to migrate from 1x to 100x.
