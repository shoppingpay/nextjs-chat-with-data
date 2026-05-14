import { Global, Module } from "@nestjs/common";

import { PrismaService } from "@/backend/prisma/prisma.service";

export class PrismaModule {}

Global()(PrismaModule);
Module({
  exports: [PrismaService],
  providers: [PrismaService],
})(PrismaModule);
