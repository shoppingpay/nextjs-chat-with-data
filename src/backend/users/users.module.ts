import { Module } from "@nestjs/common";

import { UsersController } from "@/backend/users/users.controller";
import { UsersService } from "@/backend/users/users.service";

export class UsersModule {}

Module({
  controllers: [UsersController],
  providers: [UsersService],
})(UsersModule);
