import { Controller, Get } from "@nestjs/common";

export class HealthController {
  getHealth() {
    return {
      ok: true,
      service: "nest-backend",
      timestamp: new Date().toISOString(),
    };
  }
}

Controller("health")(HealthController);
Get()(
  HealthController.prototype,
  "getHealth",
  Object.getOwnPropertyDescriptor(HealthController.prototype, "getHealth")!,
);
