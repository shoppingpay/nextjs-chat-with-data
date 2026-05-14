import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import { getBackendInternalApiKey } from "@/lib/env";

export class InternalApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const expectedKey = getBackendInternalApiKey();

    if (!expectedKey) {
      throw new UnauthorizedException("Backend internal API key is required.");
    }

    const actualKey = request.headers["x-internal-api-key"];
    const normalizedKey = Array.isArray(actualKey) ? actualKey[0] : actualKey;

    if (normalizedKey !== expectedKey) {
      throw new UnauthorizedException("Invalid internal API key.");
    }

    return true;
  }
}

Reflect.defineMetadata("design:paramtypes", [], InternalApiKeyGuard);
Injectable()(InternalApiKeyGuard);
