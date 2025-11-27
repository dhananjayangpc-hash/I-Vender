import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const API_PREFIX = BASE_URL + '/api/v1';

export const options = {
  vus: 10, // virtual users
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<500'],
    http_req_failed: ['rate<0.1'], // < 10% failures
  },
};

export default function () {
  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/health`);
    check(res, {
      'health status is 200': (r) => r.status === 200,
      'health response time < 100ms': (r) => r.timings.duration < 100,
    });
  });

  sleep(1);

  group('Tenant & Vendor Creation', () => {
    const tenantPayload = {
      name: `tenant-${Date.now()}-${Math.random()}`,
      plan: 'starter',
    };
    const tenantRes = http.post(`${API_PREFIX}/tenants`, JSON.stringify(tenantPayload), {
      headers: { 'Content-Type': 'application/json' },
    });
    check(tenantRes, {
      'tenant creation status 201': (r) => r.status === 201,
      'tenant creation time < 500ms': (r) => r.timings.duration < 500,
    });

    if (tenantRes.status === 201) {
      const tenantId = JSON.parse(tenantRes.body).id;
      sleep(0.5);

      const vendorPayload = {
        name: `vendor-${Date.now()}-${Math.random()}`,
        primary_contact: { email: `vendor-${Date.now()}@test.local` },
      };
      const vendorRes = http.post(`${API_PREFIX}/tenants/${tenantId}/vendors`, JSON.stringify(vendorPayload), {
        headers: { 'Content-Type': 'application/json' },
      });
      check(vendorRes, {
        'vendor creation status 201': (r) => r.status === 201,
        'vendor creation time < 500ms': (r) => r.timings.duration < 500,
      });

      if (vendorRes.status === 201) {
        const vendorId = JSON.parse(vendorRes.body).id;
        sleep(0.5);

        group('Document Upload', () => {
          const docPayload = {
            filename: 'sample_doc.pdf',
            type: 'business_license',
          };
          const docRes = http.post(`${API_PREFIX}/tenants/${tenantId}/vendors/${vendorId}/documents`, JSON.stringify(docPayload), {
            headers: { 'Content-Type': 'application/json' },
          });
          check(docRes, {
            'document creation status 201': (r) => r.status === 201,
            'document creation time < 800ms': (r) => r.timings.duration < 800,
            'presigned URL returned': (r) => JSON.parse(r.body).uploadUrl !== undefined,
          });
        });
      }
    }
  });

  sleep(2);

  group('Verification Queue', () => {
    // Create a tenant and vendor first to ensure there's data
    const tenantPayload = {
      name: `tenant-queue-${Date.now()}-${Math.random()}`,
      plan: 'starter',
    };
    const tenantRes = http.post(`${API_PREFIX}/tenants`, JSON.stringify(tenantPayload), {
      headers: { 'Content-Type': 'application/json' },
    });

    if (tenantRes.status === 201) {
      const tenantId = JSON.parse(tenantRes.body).id;
      const queueRes = http.get(`${API_PREFIX}/tenants/${tenantId}/verification/queue`);
      check(queueRes, {
        'queue fetch status 200': (r) => r.status === 200,
        'queue fetch time < 300ms': (r) => r.timings.duration < 300,
      });
    }
  });
}
