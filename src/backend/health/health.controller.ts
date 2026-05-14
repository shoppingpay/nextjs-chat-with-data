import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";

import { HealthService } from "@/backend/health/health.service";

export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  async getHealth() {
    const detail = await this.healthService.check();
    return detail;
  }
}

Reflect.defineMetadata(
  "design:paramtypes",
  [HealthService],
  HealthController,
);
Controller("health")(HealthController);

Get()(
  HealthController.prototype,
  "getHealth",
  Object.getOwnPropertyDescriptor(HealthController.prototype, "getHealth")!,
);
HttpCode(HttpStatus.OK)(
  HealthController.prototype,
  "getHealth",
  Object.getOwnPropertyDescriptor(HealthController.prototype, "getHealth")!,
);
