import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { AsyncContext } from "../classes/async-context";

/**
 * RequestIdMiddleware
 *
 * MUST be the FIRST middleware in the chain. Generates a UUID Correlation ID
 * (or reuses x-request-id header if present), exposes it as X-Request-ID on
 * the response, and seeds AsyncContext so every downstream log/service can
 * read it via AsyncContext.getRequestId().
 *
 * Also captures x-user-timezone header for date/time formatting per user.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = (req.headers["x-request-id"] as string) || uuidv4();
    const userTimezone = req.headers["x-user-timezone"] as string | undefined;

    res.setHeader("X-Request-ID", requestId);

    AsyncContext.run({ requestId, userTimezone }, () => {
      next();
    });
  }
}
