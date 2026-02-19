-- Demo org
INSERT INTO organizations (id, name, slug, currency_name, currency_symbol, setup_complete, plan, trial_ends_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Acme Corp',
  'acme',
  'AcmeBucks',
  'A',
  true,
  'pro',
  NOW() + INTERVAL '14 days'
);

-- Demo user (password: "password123")
INSERT INTO users (id, email, password_hash, display_name)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'admin@acme.com',
  '$2a$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu9mu',
  'Acme Admin'
);

-- Make demo user the owner
INSERT INTO organization_members (tenant_id, user_id, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'owner'
);

-- Give demo user some balance
INSERT INTO balances (tenant_id, user_id, balance)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  500
);

-- Demo member user (password: "password123")
INSERT INTO users (id, email, password_hash, display_name)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'member@acme.com',
  '$2a$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu9mu',
  'Acme Member'
);

INSERT INTO organization_members (tenant_id, user_id, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000003',
  'member'
);

INSERT INTO balances (tenant_id, user_id, balance)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000003',
  100
);
