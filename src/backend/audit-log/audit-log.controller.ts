import { Controller, Get, Query, UseGuards } from "@nestjs/common";

import { AuditLogService } from "@/backend/audit-log/audit-log.service";
import { InternalApiKeyGuard } from "@/backend/common/guards/internal-api-key.guard";

type AuditLogQuery = {
  after?: string;
  before?: string;
  limit?: string;
  q?: string;
};

export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  async getAuditLogs(query: AuditLogQuery) {
    return this.auditLogService.getAuditLogs({
      after: query.after,
      before: query.before,
      limit: query.limit,
      search: query.q,
    });
  }
}

Reflect.defineMetadata("design:paramtypes", [AuditLogService], AuditLogController);
Controller("admin/audit-log")(AuditLogController);
UseGuards(InternalApiKeyGuard)(AuditLogController);
Get()(
  AuditLogController.prototype,
  "getAuditLogs",
  Object.getOwnPropertyDescriptor(
    AuditLogController.prototype,
    "getAuditLogs",
  )!,
);
Query()(AuditLogController.prototype, "getAuditLogs", 0);
