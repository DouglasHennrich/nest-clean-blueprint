import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { TEnvService } from "./modules/env/services/env.service";
import { AllExceptionsFilter } from "./@shared/filters/exceptions.filter";
import { ILogger } from "./@shared/classes/custom-logger";

async function bootstrap() {
  // All timestamps run in UTC by convention.
  process.env.TZ = "UTC";

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const logger = app.get(ILogger);
  app.useGlobalFilters(new AllExceptionsFilter(logger));
  app.set("trust proxy", "loopback");

  app.use(helmet());
  app.enableCors();
  app.setGlobalPrefix("api");
  app.enableVersioning({ type: 1 as any, defaultVersion: "1" });

  const env = app.get(TEnvService);
  const port = env.get("INFRA_PORT");

  await app.listen(port);
}

void bootstrap();
