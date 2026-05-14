import { Module } from "@nestjs/common";

import { AuditLogController } from "@/backend/audit-log/audit-log.controller";
import { AuditLogService } from "@/backend/audit-log/audit-log.service";

export class AuditLogModule {}

Module({
  controllers: [AuditLogController],
  providers: [AuditLogService],
})(AuditLogModule);
