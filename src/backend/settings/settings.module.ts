import { Module } from "@nestjs/common";

import { SettingsController } from "@/backend/settings/settings.controller";
import { SettingsService } from "@/backend/settings/settings.service";

export class SettingsModule {}

Module({
  controllers: [SettingsController],
  providers: [SettingsService],
})(SettingsModule);
