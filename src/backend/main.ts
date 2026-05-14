import "reflect-metadata";

import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";

import { AppModule } from "@/backend/app.module";
import { getBackendPort, getFrontendOrigin } from "@/lib/env";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: false,
  });
  const logger = new Logger("Backend");
  const port = getBackendPort();
  const httpServer = app.getHttpAdapter().getInstance();

  httpServer.disable("x-powered-by");
  app.enableShutdownHooks();
  app.use(helmet());

  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );

  const frontendOrigin = getFrontendOrigin();

  if (frontendOrigin) {
    app.enableCors({
      credentials: true,
      origin: frontendOrigin,
    });
  }

  await app.listen(port);
  logger.log(`NestJS backend ready on http://localhost:${port}`);
}

bootstrap();
