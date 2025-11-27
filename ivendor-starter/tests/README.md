# I-Vendor Load Testing Guide

## Overview

Load tests validate I-Vendor performance under realistic load. Uses k6 for fast, scalable load testing.

## Installation

### Install k6

**macOS/Linux:**
```bash
brew install k6
```

**Windows (via Chocolatey):**
```powershell
choco install k6
```

**Or Docker:**
```bash
docker run -v $(pwd):/scripts grafana/k6 run /scripts/tests/load.k6.js
```

## Running Tests

### Local (dev environment)

Start backend first:
```powershell
cd backend
npm install && npm start
```

Run load test:
```powershell
# In another terminal, from the ivendor-starter directory
k6 run tests/load.k6.js
```

### Against staging/production

```powershell
k6 run -e BASE_URL=https://staging.ivendor.example.com tests/load.k6.js
```

### With custom load profile

```powershell
# 50 VUs for 2 minutes
k6 run --vus 50 --duration 2m tests/load.k6.js
```

### Output results to file

```powershell
# JSON output for post-analysis
k6 run --out json=results.json tests/load.k6.js

# View results
cat results.json | ConvertFrom-Json | Select -ExpandProperty metrics
```

## Test Scenarios

The default test (`load.k6.js`) includes:

1. **Health Check**: Basic connectivity validation
2. **Tenant & Vendor Creation**: Simulates vendor onboarding
3. **Document Upload**: Validates presigned URL generation
4. **Verification Queue**: Queries queue for verification cases

## Performance Targets

From manifest thresholds (update as needed):

- 95th percentile response time: < 300ms (read), < 800ms (document creation)
- 99th percentile response time: < 500ms
- Error rate: < 10%

## Advanced: Custom Scenarios

Extend `load.k6.js` with custom groups:

```javascript
group('Payment Processing', () => {
  const paymentRes = http.post(`${API_PREFIX}/payments/charge`, payload);
  check(paymentRes, {
    'payment status 200': (r) => r.status === 200,
  });
});
```

## Stress Testing

Gradually increase load to find breaking point:

```javascript
export const options = {
  stages: [
    { duration: '2m', target: 10 },  // 10 VUs over 2 min
    { duration: '5m', target: 50 },  // scale to 50 over 5 min
    { duration: '5m', target: 100 }, // scale to 100 over 5 min
    { duration: '3m', target: 0 },   // scale down
  ],
};
```

## Integration with CI/CD

Add to GitHub Actions CI:

```yaml
- name: Run load test
  run: |
    docker run -v $(pwd):/scripts grafana/k6 run /scripts/tests/load.k6.js
```

## Viewing Results

k6 output shows:

- Request counts, response times (min/avg/max/p95/p99)
- Threshold pass/fail
- Error details

Example output:
```
checks.........................: 100.00% ✓ 1200 ✗ 0
http_reqs......................: 120 avg=250ms min=10ms max=450ms p(95)=400ms p(99)=440ms
http_req_failed................: 0.00%
http_req_duration..............: avg=250ms min=10ms max=450ms p(95)=400ms p(99)=440ms ✓
```

## Cloud k6 (Grafana Cloud)

For enterprise load testing:

1. Create account at grafana.com
2. Link project: `k6 cloud tests/load.k6.js`
3. View real-time results and trends in Grafana Cloud

## Troubleshooting

### Connection refused

```powershell
# Ensure backend is running
curl http://localhost:4000/health
```

### High error rate

```powershell
# Lower VU count and check logs
k6 run --vus 5 tests/load.k6.js
```

### Out of memory

Reduce VUs or duration:
```powershell
k6 run --vus 5 --duration 10s tests/load.k6.js
```

## Next Steps

- Integrate load tests into CI/CD pipeline
- Set up Grafana Cloud for continuous monitoring
- Create scenario-specific test files (payment, verification, etc.)
- Add spike and soak testing scenarios
