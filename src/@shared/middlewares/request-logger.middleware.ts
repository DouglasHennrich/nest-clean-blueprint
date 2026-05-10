import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { ILogger } from "@/@shared/classes/custom-logger";

const IGNORED_PATHS = [
  "/",
  "/health",
  "/api/v1/health",
  "/metrics",
  "/favicon.ico",
];
const LOGGED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private logger: ILogger) {
    this.logger.setContextName(RequestLoggerMiddleware.name);
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, path } = req;

    if (IGNORED_PATHS.includes(path) || !LOGGED_METHODS.includes(method)) {
      return next();
    }

    const startTime = Date.now();
    this.logger.debug(`Incoming Request: ${method} ${path}`);

    res.on("finish", () => {
      const duration = Date.now() - startTime;
      this.logger.debug(
        `Response: ${method} ${path} - Status: ${res.statusCode} - Duration: ${duration}ms`,
      );
    });

    next();
  }
}
