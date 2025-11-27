# I-Vendor Build Timeline & Execution Plan

## Overview

12-week production launch timeline for I-Vendor. This plan assumes a team of 5-7 engineers: 2 backend, 2 frontend, 1 DevOps/infra, 1 QA, 1 PM.

---

## Week 0: Foundation (Pre-Sprint)

### Goals
- Repository setup, CI/CD pipeline, local dev environment, team onboarding

### Deliverables
- ✅ GitHub repository (public/private) with README + CONTRIBUTING guidelines
- ✅ GitHub Actions CI/CD pipeline (build, test, push to GHCR)
- ✅ Docker Compose local dev environment (Postgres + MinIO + backend + frontend)
- ✅ Kubernetes base manifests (namespace, ConfigMap, Secrets template)
- ✅ Jira/Linear board with all user stories and acceptance criteria
- ✅ Design system Figma (color palette, components, brand guidelines)
- ✅ AWS account provisioning (dev, staging, prod regions)

### Team Tasks
- **Backend**: Init Node/Express project, DB schema v1, basic health check
- **Frontend**: Init React/Vite project, component library setup (Shadcn UI)
- **DevOps**: Set up GitHub Actions, AWS credentials, kubectl access
- **QA**: Create test plan, setup test environments, Selenium/Playwright framework

### Time: ~3 days
### Definition of Done
- All engineers can `git clone` → `docker-compose up` → API runs on :4000, frontend on :5173

---

## Sprint 1: Core Auth & Tenant (Weeks 1-2)

### Goals
- User authentication (JWT), tenant creation, role-based access control

### Deliverables
- **Backend**:
  - User registration endpoint (`POST /auth/register`)
  - Login endpoint with JWT token generation (`POST /auth/login`)
  - Token refresh endpoint (`POST /auth/refresh`)
  - Tenant creation endpoint (`POST /api/v1/tenants`)
  - Middleware for JWT validation on all protected routes
  - Role/permission system (database tables, seed data)
  - Unit tests (60%+ coverage): auth, token validation

- **Frontend**:
  - Login form with email/password validation
  - Signup form with email/password confirmation
  - Dashboard homepage (protected route)
  - Persistent JWT storage (localStorage + memory)
  - Error handling (invalid credentials, network errors)

- **DevOps**:
  - GitHub Actions: run tests on every PR
  - Setup AWS RDS Postgres (dev environment)
  - ArgoCD installation (optional, for GitOps)

### Acceptance Criteria
- User can register, login, receive JWT
- JWT required for protected endpoints (401 if missing)
- User sees tenant dashboard after login
- Tests pass with 60% coverage

### Time: 2 weeks
### Definition of Done
- `docker-compose up` + run `npm test` = all tests pass
- Frontend login flow end-to-end tested in staging

---

## Sprint 2: Vendor Onboarding (Weeks 3-4)

### Goals
- Vendor profile creation, company registration

### Deliverables
- **Backend**:
  - Vendor creation endpoint (`POST /api/v1/tenants/:id/vendors`)
  - Vendor profile update endpoint (`PATCH /api/v1/tenants/:id/vendors/:vendorId`)
  - Vendor list endpoint with filtering (`GET /api/v1/tenants/:id/vendors?status=pending`)
  - Business number validation (mock or real-world integration)
  - Database table: `vendors` with fields (id, tenant_id, company_name, registration_number, owner_name, phone, status)
  - Tests: vendor creation, validation, list filtering

- **Frontend**:
  - Multi-step vendor registration form (step 1: contact info, step 2: company info)
  - Form validation (email, phone, business number format)
  - Vendor list dashboard
  - Cancel/draft save functionality

- **DevOps**:
  - Setup staging environment (separate K8s namespace)
  - Database migrations automated on deploy

### Acceptance Criteria
- Vendor can create account with company details
- Vendor profile fetched and displayed correctly
- Validation errors shown in UI
- Database persists vendor data

### Time: 2 weeks
### Definition of Done
- E2E test: Register tenant → create vendor → view vendor profile

---

## Sprint 3: Document Upload & Verification (Weeks 5-6)

### Goals
- Document upload pipeline, basic verification workflow

### Deliverables
- **Backend**:
  - Document upload endpoint: presigned URL generation (`POST /api/v1/tenants/:id/vendors/:vendorId/documents`)
  - Document list endpoint (`GET /api/v1/tenants/:id/vendors/:vendorId/documents`)
  - MinIO webhook receiver for upload events (`POST /webhooks/minio`)
  - Automatic verification case creation on document upload
  - Verification case list endpoint (`GET /api/v1/tenants/:id/verification-queue`)
  - Mock OCR worker (simulated processing, auto-approve/reject logic)
  - Tests: presigned URL generation, webhook parsing, worker logic

- **Frontend**:
  - Document uploader component (drag-and-drop, file validation)
  - Document list view (status, upload date, download link)
  - Real-time status updates (polling or WebSocket)
  - Error handling (upload timeout, network failure)

- **DevOps**:
  - MinIO local setup with webhook configuration
  - K8s deployment with MinIO integration
  - Load test script (k6) for upload performance

### Acceptance Criteria
- Vendor uploads document (PDF/image)
- Presigned URL returned within 1 second
- Document appears in list within 5 seconds
- Verification case auto-created and routable to queue

### Time: 2 weeks
### Definition of Done
- E2E test: Upload document → webhook triggered → verification case created → status updated

---

## Sprint 4: Verification & Admin Portal (Weeks 7-8)

### Goals
- Manual verification interface, admin approvals, document status lifecycle

### Deliverables
- **Backend**:
  - Verification case detail endpoint (`GET /api/v1/verification-cases/:id`)
  - Approve/reject endpoint (`POST /api/v1/verification-cases/:id/approve` / `reject`)
  - Admin user role (can view all verification cases across tenants)
  - Audit logs for all approvals/rejections
  - Status transitions: uploaded → processing → approved/rejected → archived
  - SLA tracking (target: 24-hour verification time)
  - Tests: case transitions, audit logging, authorization

- **Frontend**:
  - Verification queue dashboard (admin view)
  - Case detail page with document preview
  - Approve/reject buttons with reason comments
  - Bulk actions (approve multiple cases)
  - Filter/sort by status, date, vendor

- **DevOps**:
  - Setup staging database (RDS MySQL/Postgres)
  - Monitoring dashboard (Grafana) for verification queue depth
  - Alert if average SLA > 24 hours

### Acceptance Criteria
- Admin can view pending verification cases
- Admin can approve/reject with comments
- Audit log records all actions
- Vendor notified of approval/rejection
- SLA met for 95% of cases

### Time: 2 weeks
### Definition of Done
- E2E test: Upload → verify by admin → vendor sees status → audit log confirms

---

## Sprint 5: Payments & Invoicing (Weeks 9)

### Goals
- Payment processing, invoice generation

### Deliverables
- **Backend**:
  - Invoice creation endpoint (`POST /api/v1/tenants/:id/invoices`)
  - Invoice list/detail endpoints
  - Payment integration: Stripe or PayPal API client (process_payment())
  - Payment webhook receiver (payment.success, payment.failed)
  - Invoice status lifecycle: draft → sent → paid → archived
  - Automated reminders (48h, 7d, 14d overdue emails)
  - Tests: invoice creation, payment processing, webhook validation

- **Frontend**:
  - Invoice list view (status, amount, due date)
  - Invoice detail page (line items, payment status)
  - Payment form (card details or redirect to Stripe checkout)
  - Download invoice as PDF

- **DevOps**:
  - Stripe/PayPal sandbox credentials in secrets
  - Production payment gateway credentials in Vault

### Acceptance Criteria
- Vendor creates invoice for commission/service fee
- Vendor pays via Stripe (test mode)
- Invoice status updates to "paid"
- Receipt PDF generated and emailed

### Time: 1 week
### Definition of Done
- E2E test: Create invoice → pay via Stripe → status marked paid

---

## Sprint 6: Notifications & Email (Weeks 10)

### Goals
- Email notifications, SMS alerts, in-app notifications

### Deliverables
- **Backend**:
  - Email service client (SendGrid or AWS SES)
  - Notification types: welcome, document uploaded, approval, rejection, payment received, overdue invoice
  - SMS service client (Twilio)
  - In-app notification persistence (database table)
  - Notification preferences (user can opt-in/out per channel)
  - Batch email sending (background job)
  - Tests: email generation, SMS queueing

- **Frontend**:
  - Notification bell icon (unread count)
  - Notification inbox (list, mark as read)
  - Email notification preview

- **DevOps**:
  - SendGrid/Twilio API keys in Vault
  - Monitor email delivery rates (Prometheus metric)

### Acceptance Criteria
- Vendor receives welcome email on registration
- Admin receives SMS alert when verification case SLA breached
- In-app notification appears on status change
- User can disable email notifications from settings

### Time: 1 week
### Definition of Done
- E2E test: Register vendor → email received

---

## Sprint 7: Admin Portal & Reporting (Weeks 11)

### Goals
- Admin dashboard, system reporting, data export

### Deliverables
- **Backend**:
  - Admin dashboard data endpoints (vendor count, document count, verification rate, revenue)
  - Reporting query builder (`GET /api/v1/reports?metric=vendor_count&group_by=status&date_range=30d`)
  - Data export endpoint: CSV, JSON, Excel for vendors, documents, verification cases
  - System health checks (database, storage, worker queue)
  - Tests: reporting queries, export formats

- **Frontend**:
  - Admin dashboard (charts: vendor growth, verification timeline, revenue)
  - Reports builder (select metric, filters, date range, export)
  - System health page (status indicators)

- **DevOps**:
  - Setup analytics database (ClickHouse or similar for reporting)
  - Prometheus scrape admin health endpoint

### Acceptance Criteria
- Admin views dashboard with key metrics
- Admin exports vendor list as CSV
- Health checks confirm all systems operational

### Time: 1 week
### Definition of Done
- E2E test: Admin login → view dashboard → export report

---

## Sprint 8: Security Hardening & Audit (Weeks 12)

### Goals
- Security review, penetration testing, compliance validation, production preparation

### Deliverables
- **Backend**:
  - OWASP Top 10 vulnerability scan (SAST: Snyk, npm audit)
  - Dependency updates (security patches)
  - Rate limiting on all endpoints (prevent brute force, DDoS)
  - CORS configuration review
  - SQL injection tests (parameterized queries confirmed)
  - Encryption review (JWT secrets, DB passwords in Vault)
  - Security headers (CSP, HSTS, X-Frame-Options)

- **Frontend**:
  - XSS prevention review (sanitized inputs, no innerHTML)
  - CSRF token on all state-changing requests
  - Dependency scan (npm audit)
  - Performance optimization (code splitting, lazy loading)

- **DevOps**:
  - Network policies in K8s (zero-trust networking)
  - Backup strategy (daily DB backups, 30-day retention)
  - Disaster recovery plan (RTO: 1 hour, RPO: 15 min)
  - SSL/TLS certificates valid (cert-manager auto-renew)
  - Load testing (k6) confirms performance targets met

- **QA**:
  - Full E2E test suite (Playwright/Cypress)
  - Regression testing on all 7 previous sprints
  - UAT with stakeholders

### Acceptance Criteria
- Zero critical/high security vulnerabilities
- All OWASP Top 10 controls implemented
- Performance: p95 latency < 300ms, error rate < 0.1%
- Database backups automated and tested
- Disaster recovery tested (can restore from backup in 1 hour)

### Time: 1 week
### Definition of Done
- Security audit passed ✓
- Performance test targets met ✓
- All tests passing ✓
- Deployment checklist signed off ✓

---

## Production Deployment (Week 12, Day 5+)

### Pre-Deployment Checklist
- [ ] All 8 sprints completed and UAT passed
- [ ] Security audit completed with zero critical/high issues
- [ ] Kubernetes manifests tested in staging
- [ ] Database migrations tested on production-like data volume
- [ ] Backup/restore plan tested
- [ ] Runbooks written (incident response, scaling, rollback)
- [ ] Team trained on production monitoring/on-call

### Deployment Plan

**Phase 1: Canary Deployment (Day 1, 5% traffic)**
```bash
kubectl set image deployment/ivendor-backend backend=ghcr.io/ivendor/ivendor-backend:1.0.0 --record
# Monitor metrics for 2 hours
# If OK → proceed
```

**Phase 2: Progressive Rollout (Day 2-3, 50% → 100% traffic)**
```bash
# Increase replicas gradually
kubectl patch deployment ivendor-backend -p '{"spec":{"replicas":10}}'
```

**Phase 3: Validation (Day 4-7, full production load)**
- Monitor error rates, latency, CPU, memory
- Validate business metrics (vendor signups, document uploads)
- Alert team on any anomalies

### Post-Deployment
- [ ] Announce launch to stakeholders
- [ ] Send welcome email to registered beta users
- [ ] Monitor for issues (on-call rotation)
- [ ] Gather user feedback and plan improvements

---

## Timeline Summary

| Week | Sprint | Feature | Deploy |
|------|--------|---------|--------|
| 0 | - | Foundation setup | - |
| 1-2 | 1 | Auth & Tenant | Staging |
| 3-4 | 2 | Vendor onboarding | Staging |
| 5-6 | 3 | Document upload | Staging |
| 7-8 | 4 | Verification admin | Staging |
| 9 | 5 | Payments | Staging |
| 10 | 6 | Notifications | Staging |
| 11 | 7 | Admin & reporting | Staging |
| 12 | 8 | Security hardening | Staging |
| 12+ | - | Production rollout | **Production** |

---

## Team Allocation

| Sprint | Backend | Frontend | DevOps | QA | PM |
|--------|---------|----------|--------|-----|-----|
| 1 | 40h | 30h | 20h | 15h | 10h |
| 2 | 35h | 35h | 15h | 15h | 10h |
| 3 | 40h | 30h | 30h | 20h | 10h |
| 4 | 35h | 35h | 10h | 25h | 10h |
| 5 | 30h | 30h | 10h | 10h | 10h |
| 6 | 30h | 25h | 10h | 15h | 10h |
| 7 | 30h | 30h | 15h | 20h | 10h |
| 8 | 20h | 20h | 30h | 40h | 20h |

**Total per role**: Backend 260h, Frontend 235h, DevOps 140h, QA 160h, PM 80h

---

## Risk Mitigation

### Risk: DB performance degrades as data grows
- **Mitigation**: Index key columns (vendor_id, tenant_id, status) from Sprint 1. Monitor query performance weekly.

### Risk: Verification SLA missed (24-hour target)
- **Mitigation**: Auto-approve low-risk docs (>99% confidence). Ensure 3+ manual reviewers on-call.

### Risk: Payment gateway integration bugs
- **Mitigation**: Use Stripe test mode in staging. Comprehensive payment testing before production.

### Risk: Security vulnerabilities discovered late
- **Mitigation**: Weekly SAST scans from Sprint 1. Penetration testing in Sprint 8 (not Week 11).

### Risk: Team burnout (12 weeks is aggressive)
- **Mitigation**: Break into 2-week sprints with 1 day retrospective. Pair programming on critical features. Hire contractors for non-core work (UI design, documentation).

---

## Success Metrics (Go/No-Go Criteria)

**Must Have**:
- ✅ All 8 sprints completed on time
- ✅ Zero security vulnerabilities (OWASP A01-A10 verified)
- ✅ Performance: p95 latency < 300ms, uptime 99.5%
- ✅ All 50+ acceptance criteria met and tested

**Should Have**:
- ✅ 75%+ code coverage (unit + integration tests)
- ✅ Documentation complete (README, API docs, runbooks)
- ✅ Disaster recovery tested

**Nice to Have**:
- ✅ Advanced features (bulk verification, multi-currency, vendor analytics)
- ✅ Mobile app (can defer to post-launch)

---

## Post-Launch Roadmap (Months 4-12)

**Month 4**: Mobile app (React Native or Flutter)  
**Month 6**: Multi-language support (i18n)  
**Month 8**: Advanced verification (real ML model, not mock)  
**Month 10**: Multi-region deployment  
**Month 12**: Enterprise features (SSO, advanced reporting, audit compliance)

---

## Conclusion

With disciplined execution of this 12-week plan, I-Vendor can launch a production-grade vendor management platform with:
- Complete vendor lifecycle (registration → documents → verification → payments)
- Secure, scalable architecture
- Admin controls and reporting
- SMS/email notifications
- 99.5% uptime SLA

Key success factors:
1. **Strict scope adherence** (no mid-sprint feature creep)
2. **Daily standups** (catch blockers early)
3. **Automated testing** (CI/CD passes before code review)
4. **Cross-functional collaboration** (backend + frontend unblock each other)
5. **Clear acceptance criteria** (done definition signed off by team)
