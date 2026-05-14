import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";

import { AuditLogModule } from "@/backend/audit-log/audit-log.module";
import { ChatModule } from "@/backend/chat/chat.module";
import { HealthModule } from "@/backend/health/health.module";
import { PrismaModule } from "@/backend/prisma/prisma.module";
import { SettingsModule } from "@/backend/settings/settings.module";
import { UsersModule } from "@/backend/users/users.module";

export class AppModule {}

Module({
  imports: [
    PrismaModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    HealthModule,
    SettingsModule,
    AuditLogModule,
    UsersModule,
    ChatModule,
  ],
})(AppModule);
