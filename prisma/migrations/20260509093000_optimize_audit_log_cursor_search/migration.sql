-- Optimize audit log cursor pagination and prefix search.
CREATE INDEX IF NOT EXISTS "LoginAuditLog_createdAt_id_idx"
  ON "LoginAuditLog" ("createdAt" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "LoginAuditLog_username_prefix_idx"
  ON "LoginAuditLog" ("username" text_pattern_ops);

CREATE INDEX IF NOT EXISTS "LoginAuditLog_reason_prefix_idx"
  ON "LoginAuditLog" ("reason" text_pattern_ops);

CREATE INDEX IF NOT EXISTS "LoginAuditLog_ipAddress_prefix_idx"
  ON "LoginAuditLog" ("ipAddress" text_pattern_ops);

CREATE INDEX IF NOT EXISTS "LoginAuditLog_operatingSystem_prefix_idx"
  ON "LoginAuditLog" ("operatingSystem" text_pattern_ops);
