// All timestamps run in UTC by convention.
process.env.TZ = 'UTC';

import 'reflect-metadata';
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { TEnvService } from './modules/env/services/env.service';
import { AllExceptionsFilter } from './@shared/filters/exceptions.filter';
import { VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { CustomLogger } from './@shared/classes/custom-logger';
import { RequestIdMiddleware } from './@shared/middlewares/request-id.middleware';
import express, { NextFunction, Request, Response } from 'express';
import { RequestLoggerMiddleware } from './@shared/middlewares/request-logger.middleware';
import { CreateRequestLogEntityMiddleware } from './@shared/middlewares/create-request-log-entity.middleware';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      origin: '*', // Allow all origins, adjust as necessary for production
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      allowedHeaders: 'Content-Type, Accept, Authorization, x-user-timezone',
      credentials: true, // Allow credentials if needed
    },
  });

  const envService = app.get(TEnvService);
  const isDev = envService.get('INFRA_ENVIRONMENT') === 'development';
  const logger = new CustomLogger(envService, 'Bootstrap');

  app.set('trust proxy', 'loopback');
  app.set('query parser', 'extended');
  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  /// //////////////////////////
  //  Request ID middleware (must be first)
  /// //////////////////////////
  const requestIdMiddleware = app.get(RequestIdMiddleware);
  app.use((req: Request, res: Response, next: NextFunction) =>
    requestIdMiddleware.use(req, res, next),
  );

  /// //////////////////////////
  //  Configure payload size limits
  /// //////////////////////////
  app.use(express.json({ limit: '1gb' }));
  app.use(express.urlencoded({ limit: '1gb', extended: true }));

  /// //////////////////////////
  //  Request Logger middleware
  //  MUST be after body parser middlewares
  /// //////////////////////////
  const requestLoggerMiddleware = app.get(RequestLoggerMiddleware);
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return requestLoggerMiddleware.use(req, res, next);
    }

    next();
  });

  /// //////////////////////////
  //  Request Log Entity middleware (only for non-GET methods)
  //  MUST be after body parser middlewares
  /// //////////////////////////
  const createRequestLogEntityMiddleware = app.get(
    CreateRequestLogEntityMiddleware,
  );
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return createRequestLogEntityMiddleware.use(req, res, next);
    }

    next();
  });

  /// //////////////////////////
  //  Add prefix to all routes
  /// //////////////////////////
  app.setGlobalPrefix('api');

  /// //////////////////////////
  //  Global exceptions handler
  /// //////////////////////////
  app.useGlobalFilters(new AllExceptionsFilter(new CustomLogger(envService)));

  /// //////////////////////////
  //  Add version to all routes
  /// //////////////////////////
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  /// //////////////////////////
  //  Swagger
  /// //////////////////////////
  if (isDev) {
    const config = new DocumentBuilder()
      .setTitle('PitangaPRO')
      .setDescription('PitangaPro API description')
      .setVersion('1.0')
      .addTag('pitanga')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controller!
      )
      .build();

    const documentFactory = () => SwaggerModule.createDocument(app, config);

    SwaggerModule.setup('api/swagger', app, documentFactory);
  }

  /// //////////////////////////
  //  Start server
  /// //////////////////////////
  await app.listen(envService.get('INFRA_PORT'));

  logger.log(`Backend is running on port ${envService.get('INFRA_PORT')}`);

  if (isDev) {
    logger.log(
      `Swagger is running on ${envService.get('INFRA_URL')}:${envService.get('INFRA_PORT')}/api/swagger`,
    );
  }
}

void bootstrap();
