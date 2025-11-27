-- seed roles and permissions (starter)

INSERT INTO permissions (id, name, description) VALUES
  (gen_random_uuid(), 'vendor:create', 'Create vendor profiles'),
  (gen_random_uuid(), 'vendor:read', 'Read vendor profiles'),
  (gen_random_uuid(), 'document:upload', 'Upload documents'),
  (gen_random_uuid(), 'document:read', 'Read documents'),
  (gen_random_uuid(), 'verification:approve', 'Approve verifications');

-- create global roles
INSERT INTO roles (id, tenant_id, name, description, scope) VALUES
  (gen_random_uuid(), NULL, 'SuperAdmin', 'Platform owner', 'global'),
  (gen_random_uuid(), NULL, 'TenantAdmin', 'Tenant administrator', 'tenant'),
  (gen_random_uuid(), NULL, 'Verifier', 'Verification officer', 'tenant');

-- map sample permissions to roles (simple inserts)
-- look up role ids and permission ids if extending further
