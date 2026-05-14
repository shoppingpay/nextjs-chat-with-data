-- CreateTable
CREATE TABLE "LoginAuditLog" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "userId" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginAuditLog_createdAt_idx" ON "LoginAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "LoginAuditLog_username_idx" ON "LoginAuditLog"("username");

-- CreateIndex
CREATE INDEX "LoginAuditLog_success_createdAt_idx" ON "LoginAuditLog"("success", "createdAt");

-- CreateIndex
CREATE INDEX "LoginAuditLog_ipAddress_idx" ON "LoginAuditLog"("ipAddress");
