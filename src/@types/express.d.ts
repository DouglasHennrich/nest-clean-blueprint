import { TCurrentUser } from "@/modules/authenticate/models/current-user.struct";

declare global {
  namespace Express {
    interface Request {
      currentUser?: TCurrentUser;
      requestId?: string;
      userTimezone?: string;
      /** Set by AllExceptionsFilter — error message for the current request. */
      __errorMessage?: string;
      /** Set by AllExceptionsFilter — full stack trace for the current request. */
      __stackTrace?: string;
    }
  }
}

export {};
