# I-Vendor Security Deep Dive

## Executive Summary

I-Vendor handles sensitive vendor data (identity documents, tax info, payments). Security is foundational. This document outlines OWASP Top 10 mitigations, encryption, audit logging, privacy, and operational security.

---

## 1. OWASP Top 10 Mitigations

### A01:2021 – Broken Access Control

**Risk**: Unauthorized users access other vendors' data or admin functions.

**Mitigations**:
- Implement RBAC via OPA policies (all requests authorized before processing).
- Tenant-scoped queries: all DB queries filter by `tenant_id`.
- Object-level ACL checks: verify user has permission to specific resource (e.g., vendor, document).
- Audit log all authorization failures.
- Example policy (OPA Rego):
```rego
allow {
  input.user.tenant_id == input.resource.tenant_id
  input.user.roles[_] == "TenantAdmin"
}
```

**Testing**: Unit test every policy rule; fuzz combinations of roles + resources.

---

### A02:2021 – Cryptographic Failures

**Risk**: PII and payment data exposed due to weak encryption.

**Mitigations**:
- **Transport**: TLS 1.2+ everywhere (enforced via ingress, API gateway).
- **At-rest**:
  - Postgres: Enable `pgcrypto` extension; encrypt sensitive columns (SSN, bank account) with per-row keys stored in Vault.
  - S3: Enable server-side encryption (AWS S3 default or MinIO encryption).
  - Secrets: Stored in Kubernetes Secrets (encrypted via etcd encryption + sealed-secrets for production).
- **Key Rotation**:
  - Rotate DB keys quarterly via Vault.
  - Rotate API signing keys monthly.
  - Store old keys for decryption of historical data.
- **Payment Data**: Never store raw card data; use tokenized storage via Stripe or Adyen (PCI compliance outsourced).

**Implementation**:
```sql
-- Example encrypted column (pgcrypto)
ALTER TABLE documents ADD COLUMN ssn_encrypted bytea;
-- Insert encrypted SSN
INSERT INTO documents (ssn_encrypted) 
  VALUES (pgp_sym_encrypt('123-45-6789', 'vault-key-id-123'));
-- Decrypt (key from Vault)
SELECT pgp_sym_decrypt(ssn_encrypted, vault_key) FROM documents WHERE id = ...;
```

---

### A03:2021 – Injection

**Risk**: SQL injection, command injection, XSS.

**Mitigations**:
- **SQL Injection**: Use parameterized queries (prepared statements). All DB interactions via `pg` library with `$1, $2` placeholders.
  ```javascript
  // ✓ SAFE
  db.query('SELECT * FROM documents WHERE id = $1', [documentId]);
  // ✗ UNSAFE
  db.query(`SELECT * FROM documents WHERE id = ${documentId}`);
  ```
- **Command Injection**: Avoid shell execution; use child_process with array args.
- **XSS**: React escapes JSX by default; sanitize user input for rich text (use DOMPurify).

**Testing**: Use OWASP ZAP or Burp for dynamic scanning in CI.

---

### A04:2021 – Insecure Design

**Risk**: Business logic flaws enable fraud (e.g., bypass verification, duplicate payments).

**Mitigations**:
- **Verification Workflow**: Documents require auto-approval OR manual review before vendor is marked verified; no shortcuts.
- **Payment Idempotency**: All payment requests include idempotency key; duplicate requests return cached result.
- **State Machine Enforcement**: Vendor status transitions (draft → pending → verified → rejected) enforced; no jumps.
- **Rate Limiting**: Prevent brute force (login, API calls):
  - 5 failed logins per 15 min per IP.
  - 100 API requests per min per tenant.
  - Exponential backoff for verification attempts.

**Implementation**:
```javascript
// Idempotency key for payments
const idempotencyKey = req.headers['idempotency-key'];
const cached = await redis.get(`idempotency:${idempotencyKey}`);
if (cached) return res.json(JSON.parse(cached)); // return cached
// ... process payment ...
await redis.set(`idempotency:${idempotencyKey}`, result, 'EX', 86400); // cache 24h
```

---

### A05:2021 – Broken Authentication

**Risk**: Weak auth allows unauthorized access.

**Mitigations**:
- **JWT**: 15-minute expiration; refresh tokens stored securely in DB with rotation.
- **MFA**: TOTP + SMS for Admin, TenantAdmin, Verifier roles (configurable per tenant).
- **Password Policy**:
  - Minimum 12 characters.
  - Complexity: uppercase, lowercase, digit, symbol.
  - No reuse of last 5 passwords.
  - Expire every 90 days for high-privilege roles.
- **Session Management**:
  - Invalidate old sessions on new login.
  - Bind session to device (store device ID hash).
  - Logout clears tokens from DB immediately.
- **SSO**: SAML/OIDC for enterprise; validate signatures, enforce encryption.

**Implementation** (Node/Express):
```javascript
// MFA check
if (user.mfaEnabled) {
  const verified = speakeasy.totp.verify({ secret: user.totpSecret, encoding: 'base32', token: req.body.totpToken });
  if (!verified) return res.status(401).json({ error: 'invalid TOTP' });
}
```

---

### A06:2021 – Sensitive Data Exposure

**Risk**: PII logged or exposed in error messages.

**Mitigations**:
- **Logging**: Never log PII (SSN, card numbers, passwords). Use structured logging with field whitelisting.
  ```javascript
  // ✓ SAFE
  logger.info({ action: 'document_uploaded', documentId, userId, vendor_id });
  // ✗ UNSAFE
  logger.info({ action: 'document_uploaded', userId, document: { ssn: '123-45-6789' } });
  ```
- **Error Messages**: Return generic errors to clients; log details server-side.
  ```javascript
  // ✓ SAFE
  res.status(400).json({ error: 'invalid request' });
  // ✗ UNSAFE
  res.status(400).json({ error: `SSN format invalid: ${req.body.ssn}` });
  ```
- **API Responses**: Redact sensitive fields based on user permissions (ObligationProcessor).
- **Backups**: Encrypt backups; store off-site with access controls.

---

### A07:2021 – Identification & Authentication Failures

**Risk**: Weak session management or broken auth flow.

**Mitigations**:
- Enforce HTTPS only (HSTS header: `Strict-Transport-Security: max-age=31536000`).
- Secure cookies: `HttpOnly`, `Secure`, `SameSite=Strict`.
- Session timeout: 30 min inactivity for high-privilege users.
- Account lockout: 5 failed attempts → 15 min lockout.

---

### A08:2021 – Software & Data Integrity Failures

**Risk**: Compromised dependencies or unsigned updates.

**Mitigations**:
- **Dependency Management**:
  - Use `npm audit` in CI; block builds on high/critical vulnerabilities.
  - Use Dependabot for automated PRs.
  - Pin versions; regularly update.
- **Code Signing**: Sign commits with GPG; require signed commits for main branch.
- **Artifact Integrity**: Sign Docker images; verify signature on deploy.
  ```bash
  docker trust inspect ghcr.io/ivendor/ivendor-backend:latest
  ```

---

### A09:2021 – Logging & Monitoring Failures

**Risk**: Attacks go undetected; no incident response trail.

**Mitigations**:
- **Centralized Logging**: All services log to ELK/Datadog with immutable storage.
- **Log Contents**:
  - All API calls (method, endpoint, status, latency, user, IP).
  - All data mutations (before/after state).
  - All authorization decisions (allow/deny, reason).
  - All errors (stack trace, context).
- **Retention**: 90 days hot, 1 year warm (S3), 7 years cold (Glacier) for compliance.
- **Monitoring & Alerts**:
  - Alert on repeated failed logins (possible brute force).
  - Alert on unusual data access patterns.
  - Alert on failed authorizations (possible privilege escalation).
  - Alert on database anomalies (large exports, bulk deletes).
  - SLA: critical alerts acknowledged within 15 min.

**Example Prometheus alert**:
```yaml
- alert: HighFailedAuthAttempts
  expr: rate(auth_failed_total[5m]) > 10
  for: 5m
  annotations:
    summary: "High failed auth attempts detected"
```

---

### A10:2021 – Server-Side Request Forgery (SSRF)

**Risk**: Backend makes requests to attacker-controlled URLs.

**Mitigations**:
- Whitelist allowed domains for webhook calls and external integrations.
- Validate and sanitize all URLs (reject private IPs like 127.0.0.1, 10.0.0.0/8).
- Use network egress controls (K8s NetworkPolicy, firewall rules).

---

## 2. Data Encryption & Key Management

### Encryption Strategy

| Layer | Method | Key Storage |
|-------|--------|-------------|
| Transit (TLS) | TLS 1.2+ ECDHE | Certificate Authority |
| At-Rest (DB) | AES-256-GCM (per-row encryption) | HashiCorp Vault |
| At-Rest (S3) | S3 SSE-KMS | AWS KMS |
| Application Secrets | AES-256 (sealed-secrets) | K8s etcd + key |
| Payment Data | Tokenization | Stripe/Adyen |

### Key Rotation Procedure

```
1. Generate new master key in Vault.
2. Decrypt all data with old key.
3. Re-encrypt with new key.
4. Verify integrity (checksums match).
5. Archive old key for 7 years (compliance).
6. Update active key reference.
```

Automation via Vault Agent or Lambda scheduled task (monthly).

---

## 3. Audit Logging

All sensitive operations logged immutably. Log structure:

```json
{
  "timestamp": "2025-11-27T10:30:00Z",
  "actor_id": "user-123",
  "actor_role": "Verifier",
  "action": "verification:approve",
  "resource_type": "document",
  "resource_id": "doc-456",
  "tenant_id": "tenant-789",
  "before_state": { "status": "manual_review" },
  "after_state": { "status": "approved" },
  "ip": "203.0.113.42",
  "user_agent": "Mozilla/5.0...",
  "request_id": "req-abc123"
}
```

**Immutability**: Logs written to append-only table; checksums stored separately.

---

## 4. Data Privacy & GDPR Compliance

### Data Subject Rights

Implement endpoints for:
- **Right to Access**: `/api/v1/tenants/:id/data-export` exports all personal data.
- **Right to Erasure**: `/api/v1/users/:id/deletion-request` initiates secure deletion (anonymize or pseudonymize after 30-day hold).
- **Right to Portability**: Data exported in machine-readable format (JSON/CSV).
- **Right to Rectification**: User can update own profile; admin approves vendor corrections.

### Data Retention

Configurable per tenant:
```json
{
  "vendor_profile_retention": "7 years",
  "document_retention": "5 years",
  "audit_logs_retention": "7 years",
  "payment_records_retention": "7 years",
  "session_logs_retention": "90 days"
}
```

Automated deletion job runs monthly; logs deletion events; notifies user.

### Data Processing Agreement (DPA)

Provide template DPA for customers; customers sign before onboarding.

---

## 5. Network Security

### Ingress / Egress Controls

```yaml
# Kubernetes NetworkPolicy: deny all by default, allow only needed
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ivendor-deny-all
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ivendor-allow-backend
spec:
  podSelector:
    matchLabels:
      app: ivendor-backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ivendor
    ports:
    - protocol: TCP
      port: 4000
```

### WAF Rules

At CDN or ingress:
- Block common attack patterns (SQLi, XSS, path traversal).
- Rate limit by IP and user.
- Require valid User-Agent.
- Block known botnet IPs.

---

## 6. Dependency & Vulnerability Management

### CI Security Checks

```yaml
# GitHub Actions
- name: Dependency scanning
  run: npm audit --audit-level=high
  
- name: SAST scanning
  uses: github/super-linter@v4
  
- name: Container scanning
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ghcr.io/ivendor/ivendor-backend:${{ github.sha }}
```

### Policies

- No transitive dependency with known CVE.
- Upgrade policy: patch within 7 days, minor within 30 days.
- Deprecation warning: remove deprecated libs within 2 major versions.

---

## 7. Incident Response & Runbooks

### Compromise Response

1. **Detect**: Alert on suspicious activity (e.g., bulk data export, unauthorized role elevation).
2. **Contain**: Revoke affected user tokens; rotate service account keys; enable audit mode (log everything).
3. **Investigate**: Query audit logs; identify affected data.
4. **Remediate**: Patch vulnerability; redeploy from clean image; verify integrity.
5. **Communicate**: Notify affected users; file incident report; update runbook.

### Runbook: Suspected DB Breach

```
1. Stop application (pause all writes)
2. Take DB snapshot
3. Query audit_logs for unauthorized access (timestamp range)
4. Identify affected users/data
5. Hash passwords for affected users; compare to known breach databases (pwned passwords)
6. If passwords compromised, force password reset + MFA re-enrollment for all affected users
7. Restore from clean snapshot if necessary
8. Re-enable application
9. File incident report with timeline, impact, remediation
```

---

## 8. Third-Party & Vendor Security

### Assessment Checklist

Before integrating third parties (payment processors, email, SMS, OCR providers):
- SOC 2 Type II compliance
- Data processing agreement signed
- Encryption in transit & at rest
- OWASP Top 10 score (80+)
- Incident response SLA (critical < 4h)
- Security audit frequency (annual minimum)

---

## 9. Compliance Certifications Roadmap

| Certification | Target Date | Owner |
|---|---|---|
| OWASP ASVS Level 2 | Month 6 | Security |
| SOC 2 Type II | Month 9 | DevOps + Audit |
| PCI-DSS (payments) | Month 12 | Finance + Security |
| GDPR Compliance | Month 6 | Legal + Ops |
| CCPA Compliance | Month 12 | Legal + Ops |

---

## 10. Operational Security Checklist

- [ ] Secrets rotated monthly
- [ ] Backups tested quarterly (restore to staging)
- [ ] Penetration test annually + after major changes
- [ ] Security training for all staff (annual)
- [ ] On-call security escalation documented
- [ ] Incident response drills quarterly
- [ ] Vulnerability scanning (Dependabot, Trivy) automated in CI
- [ ] Access reviews quarterly (who has what access)
- [ ] Firewall rules reviewed monthly
- [ ] SSL certificates renewed before expiration (monitored)

---

## Summary

I-Vendor prioritizes defense-in-depth:
- Multiple layers of encryption (transport, storage, secrets).
- Granular access control (RBAC + ABAC via OPA).
- Comprehensive audit logging (immutable, searchable).
- Privacy by design (data minimization, retention policies, right to erasure).
- Rapid incident response (playbooks, alerting, RTO < 4h).

Regular audits, penetration testing, and compliance checks ensure ongoing security posture improvement.
