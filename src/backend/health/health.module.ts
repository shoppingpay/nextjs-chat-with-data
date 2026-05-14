import { Module } from "@nestjs/common";

import { HealthController } from "@/backend/health/health.controller";

export class HealthModule {}

Module({
  controllers: [HealthController],
})(HealthModule);
