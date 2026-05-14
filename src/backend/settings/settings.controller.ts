import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
} from "@nestjs/common";

import { InternalApiKeyGuard } from "@/backend/common/guards/internal-api-key.guard";
import { SettingsService } from "@/backend/settings/settings.service";
import {
  MAX_IDLE_TIMEOUT_MINUTES,
  MIN_IDLE_TIMEOUT_MINUTES,
  normalizeIdleTimeoutMinutes,
} from "@/lib/session-policy";

export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  async getSessionSettings() {
    return {
      idleTimeoutMinutes: await this.settingsService.getIdleTimeoutMinutes(),
      min: MIN_IDLE_TIMEOUT_MINUTES,
      max: MAX_IDLE_TIMEOUT_MINUTES,
    };
  }

  async updateSessionSettings(body: { idleTimeoutMinutes?: unknown }) {
    const idleTimeoutMinutes = normalizeIdleTimeoutMinutes(
      body?.idleTimeoutMinutes,
    );

    if (!idleTimeoutMinutes) {
      throw new BadRequestException("Invalid session setting");
    }

    await this.settingsService.setIdleTimeoutMinutes(idleTimeoutMinutes);

    return {
      idleTimeoutMinutes,
    };
  }
}

Reflect.defineMetadata("design:paramtypes", [SettingsService], SettingsController);
Controller("admin/settings/session")(SettingsController);
UseGuards(InternalApiKeyGuard)(SettingsController);
Get()(
  SettingsController.prototype,
  "getSessionSettings",
  Object.getOwnPropertyDescriptor(
    SettingsController.prototype,
    "getSessionSettings",
  )!,
);
Patch()(
  SettingsController.prototype,
  "updateSessionSettings",
  Object.getOwnPropertyDescriptor(
    SettingsController.prototype,
    "updateSessionSettings",
  )!,
);
Body()(SettingsController.prototype, "updateSessionSettings", 0);
