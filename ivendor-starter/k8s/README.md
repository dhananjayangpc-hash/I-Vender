# I-Vendor Kubernetes Deployment Guide

## Overview

This directory contains Kubernetes manifests for deploying I-Vendor to a production cluster.

### Structure

- `k8s/base/`: Base manifests (Deployments, Services, Ingress, ConfigMaps, Secrets, HPA)
- `k8s/overlays/prod/`: Production customization (increased replicas, resources, prod-specific config)

## Prerequisites

- Kubernetes cluster (EKS, GKE, AKS, or on-prem)
- `kubectl` configured
- Ingress controller (nginx recommended)
- cert-manager for TLS (optional but recommended)
- `kustomize` CLI

## Quick Start

### 1. Deploy base (dev/staging)

```powershell
# Apply base manifests
kubectl apply -k k8s/base/
```

### 2. Deploy production overlay

```powershell
# Set environment variables for secrets (use a secrets manager in production)
$env:DB_PASSWORD = "your-db-password"
$env:WEBHOOK_SECRET = "your-webhook-secret"

# Apply production overlay
kubectl apply -k k8s/overlays/prod/
```

### 3. Verify deployment

```powershell
# Check pods
kubectl -n ivendor get pods

# Check services
kubectl -n ivendor get svc

# Check ingress
kubectl -n ivendor get ingress

# View logs
kubectl -n ivendor logs -f deployment/ivendor-backend

# Forward port for local testing
kubectl -n ivendor port-forward svc/ivendor-backend-service 4000:80
```

## Configuration

### Updating image

Update the image in `k8s/base/ivendor.yaml` under both Deployments:

```yaml
image: ghcr.io/yourname/ivendor-backend:v1.0.0
```

Or use kustomize image patching:

```bash
kustomize edit set image ghcr.io/yourname/ivendor-backend=ghcr.io/yourname/ivendor-backend:v1.0.0
```

### Secrets Management (Production)

For production, use sealed-secrets or external-secrets instead of plaintext in `ivendor-secrets`:

```bash
# Using sealed-secrets
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.18.0/controller.yaml

# Seal a secret
echo -n "your-secret" | kubectl create secret generic ivendor-secrets --dry-run=client --from-file=key=/dev/stdin -o yaml | kubeseal -f -
```

### Database (Postgres)

Provide an external managed Postgres (RDS, CloudSQL, etc.) or deploy Postgres in-cluster:

```bash
# Example: Deploy Postgres with bitnami helm chart
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install postgres bitnami/postgresql -n ivendor --set auth.password=mypassword
```

### Object Storage (S3/MinIO)

Use AWS S3 in production or deploy MinIO. Update `S3_ENDPOINT` in secrets.

### Ingress & TLS

Update `ivendor.example.com` to your domain in `k8s/base/ivendor.yaml`.

Install cert-manager for auto-TLS:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.12.0/cert-manager.yaml

# Add ClusterIssuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
EOF
```

## Monitoring & Observability

### Add Prometheus for metrics

```bash
helm install prometheus prometheus-community/kube-prometheus-stack -n ivendor
```

### Add Grafana dashboards

Dashboards available at `http://localhost:3000` (port-forward required).

### Logs with ELK / Loki

Configure centralized logging via Loki or ELK stack.

## Scaling

HPA (HorizontalPodAutoscaler) is configured:

- Backend: 2-10 replicas based on CPU/memory
- Frontend: 1-5 replicas based on CPU

Monitor scaling:

```bash
kubectl -n ivendor get hpa --watch
```

## Troubleshooting

### Pod stuck in Pending

```bash
kubectl -n ivendor describe pod <pod-name>
# Check resource availability, node selectors, PVC bindings
```

### Service unreachable

```bash
kubectl -n ivendor get svc
kubectl -n ivendor get endpoints
# Verify Ingress is correctly routing
kubectl -n ivendor describe ingress ivendor-ingress
```

### Image pull errors

```bash
# Ensure imagePullSecrets is configured if using private registry
kubectl -n ivendor create secret docker-registry regcred --docker-server=ghcr.io --docker-username=user --docker-password=token
```

## GitOps (ArgoCD)

Deploy I-Vendor via ArgoCD:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ivendor
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/yourname/ivendor
    targetRevision: main
    path: k8s/overlays/prod
  destination:
    server: https://kubernetes.default.svc
    namespace: ivendor-prod
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Production Checklist

- [ ] Postgres database provisioned and backed up
- [ ] S3/object storage provisioned and configured
- [ ] Secrets stored in sealed-secrets or vault
- [ ] Ingress and TLS configured
- [ ] Monitoring and logging set up
- [ ] Resource limits and requests configured
- [ ] HPA configured and tested
- [ ] Network policies applied for RBAC
- [ ] Disaster recovery and backup plans tested
