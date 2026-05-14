import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { getDatabaseUrl } from "@/lib/env";

export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    const connectionString = getDatabaseUrl();

    super({
      adapter: new PrismaPg({ connectionString }),
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

Reflect.defineMetadata("design:paramtypes", [], PrismaService);
Injectable()(PrismaService);
