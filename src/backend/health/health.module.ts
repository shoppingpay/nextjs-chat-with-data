import { Module } from "@nestjs/common";

import { HealthController } from "@/backend/health/health.controller";
import { HealthService } from "@/backend/health/health.service";

export class HealthModule {}

Module({
  controllers: [HealthController],
  providers: [HealthService],
})(HealthModule);
