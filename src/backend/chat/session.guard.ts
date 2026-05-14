import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";

import { RedisUnavailableError } from "@/lib/redis";
import {
  getSessionByToken,
  readSessionTokenFromCookieHeader,
  type AppSession,
} from "@/lib/session-store";

type RequestWithSession = {
  headers: Record<string, string | string[] | undefined>;
  appSession?: AppSession;
};

function readCookieHeader(headers: RequestWithSession["headers"]) {
  const raw = headers["cookie"];
  return typeof raw === "string" ? raw : null;
}

export class SessionGuard implements CanActivate {
  private readonly logger = new Logger(SessionGuard.name);

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithSession>();
    const token = readSessionTokenFromCookieHeader(
      readCookieHeader(request.headers),
    );

    let session: AppSession | null;

    try {
      session = await getSessionByToken(token);
    } catch (error) {
      if (error instanceof RedisUnavailableError) {
        this.logger.error(`Session lookup failed: ${error.message}`);
        throw new ServiceUnavailableException(
          "Session service is temporarily unavailable.",
        );
      }
      throw error;
    }

    if (!session) {
      throw new UnauthorizedException("Active session is required.");
    }

    request.appSession = session;
    return true;
  }
}

Reflect.defineMetadata("design:paramtypes", [], SessionGuard);
Injectable()(SessionGuard);
