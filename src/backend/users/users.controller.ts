import { Controller, Get, Query, UseGuards } from "@nestjs/common";

import { InternalApiKeyGuard } from "@/backend/common/guards/internal-api-key.guard";
import { UsersService } from "@/backend/users/users.service";

type UsersQuery = {
  after?: string;
  before?: string;
  limit?: string;
  q?: string;
};

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  async getUsers(query: UsersQuery) {
    return this.usersService.getUsers({
      after: query.after,
      before: query.before,
      limit: query.limit,
      search: query.q,
    });
  }
}

Reflect.defineMetadata("design:paramtypes", [UsersService], UsersController);
Controller("admin/users")(UsersController);
UseGuards(InternalApiKeyGuard)(UsersController);
Get()(
  UsersController.prototype,
  "getUsers",
  Object.getOwnPropertyDescriptor(UsersController.prototype, "getUsers")!,
);
Query()(UsersController.prototype, "getUsers", 0);
