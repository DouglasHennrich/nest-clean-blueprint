import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { TEnvService } from "./modules/env/services/env.service";

async function bootstrap() {
  // All timestamps run in UTC by convention.
  process.env.TZ = "UTC";

  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors();
  app.setGlobalPrefix("api");
  app.enableVersioning({ type: 1 as any, defaultVersion: "1" });

  const env = app.get(TEnvService);
  const port = env.get("INFRA_PORT");

  await app.listen(port);
}

void bootstrap();
