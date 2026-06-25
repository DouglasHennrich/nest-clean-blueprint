/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { AxiosInstance } from 'axios';
import { ConsoleLogger, Injectable, LogLevel, Scope } from '@nestjs/common';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { S3Client } from '@aws-sdk/client-s3';

import { TEnvService } from '@/modules/env/services/env.service';
import { GenerateRandom } from '../utils/generateRandom';
import { AsyncContext } from './async-context';
import { BackofficeConfigsSingleton } from '@/modules/backoffice/singletons/backoffice-configs.singleton';

export abstract class ILogger {
  abstract setContextName(contextName: string): void;
  abstract log(message: any, context?: any): void;
  abstract error(message: any, context?: any): void;
  abstract warn(message: any, context?: any): void;
  abstract debug(message: any, context?: any): void;
  abstract verbose(message: any, context?: any): void;
}

@Injectable({ scope: Scope.TRANSIENT })
export class CustomLogger extends ConsoleLogger implements ILogger {
  private contextName?: string;
  private httpService?: AxiosInstance;
  private winstonLogger?: winston.Logger;
  private isProduction: boolean;
  private s3LogsClient?: S3Client;
  private s3LogsBucket?: string;
  private s3LogsPrefix = 'logs/backend';
  private static startupCleanupDone = false;

  constructor(envService: TEnvService, contextName?: string) {
    super();

    if (contextName) {
      this.setContext(contextName);
    }

    // For discord notifications, we want to use a separate Axios instance with its own error handling
    // this.httpService = axios.create({
    //   baseURL: envService.get("EXTERNAL_DISCORD_WEBHOOK_URL"),
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   timeout: 5000, // 5 seconds timeout
    //   validateStatus: () => true, // Accept any status to prevent errors
    // });

    // // Interceptor to silently handle errors
    // this.httpService.interceptors.response.use(
    //   (response) => response,
    //   () => {
    //     // Silently ignore all errors - no logging
    //     return Promise.resolve(null);
    //   },
    // );

    this.isProduction = envService.get('INFRA_ENVIRONMENT') === 'production';

    // Initialize S3 client in production for log uploads, using separate credentials from main app if needed
    // if (this.isProduction) {
    //   this.s3LogsBucket = envService.get("EXTERNAL_AWS_S3_BUCKET");
    //   this.s3LogsPrefix = "logs/backoffice";
    //   this.s3LogsClient = new S3Client({
    //     region: envService.get("EXTERNAL_AWS_S3_REGION"),
    //     credentials: {
    //       accessKeyId: envService.get("EXTERNAL_AWS_ACCESS_KEY_ID"),
    //       secretAccessKey: envService.get("EXTERNAL_AWS_SECRET_ACCESS_KEY"),
    //     },
    //   });
    // }

    // Initialize Winston in production and development
    const shouldInitializeWinston = this.isProduction;

    if (shouldInitializeWinston) {
      // Use absolute path in production, relative in dev
      const dirname = this.isProduction ? '/app/logs' : './app/logs';

      // Custom format to match NestJS console output
      const nestLikeFormat = winston.format.printf(
        ({ timestamp, level, contextName, requestId, message, context }) => {
          const pid = process.pid;
          const date = new Date(timestamp as string)
            .toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            })
            .replace(',', ' -');

          const levelUpper = level.toUpperCase().padEnd(5);
          const contextWithId = `[${contextName}][${requestId}]`;

          let logLine = `[Nest] ${pid}  - ${date} ${levelUpper} ${contextWithId} ${message}`;

          // Add context data if present
          if (context && Object.keys(context).length > 0) {
            logLine += `\n${JSON.stringify(context, null, 2)}`;
          }

          return logLine;
        },
      );

      const combinedTransport = new DailyRotateFile({
        dirname,
        filename: 'combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '50m',
        zippedArchive: true,
        // Safety net: auto-delete files older than 30 days even if S3 upload fails
        maxFiles: '30d',
      });

      // Upload rotated/archived log files to S3
      // combinedTransport.on("archive", (zipFilename: string) => {
      //   void this.uploadLogFileToS3(zipFilename);
      // });

      // Upload and delete accumulated log files from previous runs (backlog cleanup)
      // this.startupLogCleanup(dirname);

      this.winstonLogger = winston.createLogger({
        level: 'debug', // Changed from 'info' to capture debug logs
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.errors({ stack: true }),
          nestLikeFormat, // Use custom format instead of JSON
        ),
        transports: [combinedTransport],
      });
    }
  }

  /**
   * Set the context name for this logger instance
   * Usage: this.logger.setContextName(ServiceName.name);
   */
  setContextName(contextName: string): void {
    this.contextName = contextName;
    this.setContext(contextName);
  }

  log(message: any, context?: any): void {
    const logData = this.createFormattedLog('log', message, context);
    this.writeToWinston('info', message, context, logData);
  }

  error(message: any, context?: any): void {
    const logData = this.createFormattedLog('error', message, context);
    this.writeToWinston('error', message, context, logData);
  }

  warn(message: any, context?: any): void {
    const logData = this.createFormattedLog('warn', message, context);
    this.writeToWinston('warn', message, context, logData);
  }

  debug(message: any, context?: any): void {
    if (BackofficeConfigsSingleton.debugLogging) {
      const logData = this.createFormattedLog('debug', message, context);
      this.writeToWinston('debug', message, context, logData);
    }
  }

  verbose(message: any, context?: any): void {
    const logData = this.createFormattedLog('verbose', message, context);
    this.writeToWinston('verbose', message, context, logData);
  }

  private writeToWinston(
    level: string,
    message: any,
    context: any,
    extractedData: {
      requestId: string;
      contextName: string;
      errorMessage: string;
    },
  ): void {
    if (!this.winstonLogger) return;

    const winstonData: any = {
      level,
      contextName: extractedData.contextName,
      requestId: extractedData.requestId,
      message:
        extractedData.errorMessage ||
        (typeof message === 'string' ? message : JSON.stringify(message)),
    };

    if (
      context &&
      typeof context === 'object' &&
      Object.keys(context).length > 0
    ) {
      winstonData.context = context;
    }

    this.winstonLogger.log(level, winstonData);
  }

  private createFormattedLog(
    level: LogLevel,
    message: any,
    context?: any,
  ): { requestId: string; contextName: string; errorMessage: string } {
    // Get request ID from AsyncContext
    const requestId = AsyncContext.getRequestId() || GenerateRandom.id();

    // Determina o contexto a ser usado
    let contextName: string;
    let logId: string | undefined;
    let logData: any;

    let errorMessage: string = '';
    let isSimpleLog = false;

    if (typeof context === 'string') {
      contextName = context;
      logData = typeof message === 'object' ? message : { message };
      errorMessage = typeof message === 'string' ? message : '';
      // Use requestId from AsyncContext
      logId = requestId;

      //
    } else if (context && typeof context === 'object') {
      // Se for um objeto IRequestContext, usa o logId (ou requestId do AsyncContext)
      logId = context.logId || requestId;

      // Extract error message first
      if (typeof message === 'string') {
        errorMessage = message;
      } else if (context.message) {
        errorMessage = context.message;
      }

      // Try to extract context name from error message if it follows pattern like "[Context] Error"
      if (errorMessage) {
        const messageContextMatch = errorMessage.match(/\[([^\]]+)\]:\s*/);

        if (messageContextMatch) {
          contextName = messageContextMatch[1];
          // Remove the context part from the error message to avoid duplication
          errorMessage = errorMessage.replace(/\[([^\]]+)\]:\s*/, '').trim();
        } else {
          // Fallback to errorName or default
          contextName =
            context.errorName ||
            this.contextName ||
            this.context ||
            'Application';
        }
      } else {
        contextName =
          context.errorName ||
          this.contextName ||
          this.context ||
          'Application';
      }

      // Append logId as suffix if available
      contextName = `${contextName}][${logId}`;

      // Prepare log data with limited stack trace, excluding message
      const authentication = {
        accountId: context.user?.accountId,
        accountUsername: context.user?.username,
        userId: context.user?.id,
        userName: context.user?.name,
      };

      delete context.user; // Remove user info for privacy
      delete context.account; // Remove account info for privacy
      delete context.authentication; // Remove authentication info for privacy
      logData = sanitizeForLogging({
        ...context,
        ...(Object.values(authentication).some((value) => value !== undefined)
          ? { authentication }
          : {}),
      });

      if (logData.stack) {
        // Limit stack trace to first 3 lines
        const stackLines = logData.stack.split('\n');
        logData.stack = stackLines.slice(0, 4).join('\n'); // First line + 3 stack lines
      }

      // Remove message from JSON data to avoid duplication
      delete logData.message;
    } else {
      // Simple log case - no context object provided
      contextName = this.contextName || this.context || 'Application';
      errorMessage = typeof message === 'string' ? message : String(message);
      logData = null; // No additional data to log
      logId = requestId; // Use requestId from AsyncContext
      isSimpleLog = true;
    }

    // Format the final message
    let formattedMessage: string;

    if (isSimpleLog) {
      // For simple logs, include requestId in context name
      const contextWithId = `${contextName}][${logId}`;
      formattedMessage = errorMessage;
      // Call parent logger with context for simple logs
      super[level](formattedMessage, contextWithId);

      // if (level === "error") {
      //   delete logData?.stack;

      //   this.sendErrorToDiscord({
      //     requestId: logId ?? "",
      //     contextName: contextWithId,
      //     formattedMessage,
      //     logData: safeStringify(logData),
      //     stack: logData?.stack,
      //   });
      // }

      const separator = '='.repeat(80);
      console.log(separator);

      // Return extracted data for Winston
      return { requestId: logId ?? '', contextName, errorMessage };

      //
    } else {
      const jsonData = safeStringify(logData);
      formattedMessage = `${errorMessage} ${jsonData}`;
    }

    // Call the parent logger with the formatted message and undefined context
    // to avoid NestJS adding its own context like [AllExceptionsFilter]
    const tracedContextName = `${contextName}][${logId}`;
    super[level](formattedMessage, tracedContextName);

    // if (level === "error") {
    //   const stack = logData?.stack;
    //   delete logData?.stack;
    //   delete logData?.errorName;

    //   this.sendErrorToDiscord({
    //     requestId: logId ?? "",
    //     contextName: tracedContextName,
    //     formattedMessage: errorMessage,
    //     logData: safeStringify(logData),
    //     stack,
    //   });
    // }

    // Print separator on a new line only for complex logs
    const separator = '='.repeat(80);
    console.log(separator);

    // Return extracted data for Winston
    return {
      requestId: logId!,
      contextName: contextName.split('][')[0],
      errorMessage,
    };
  }

  // private async uploadLogFileToS3(filePath: string): Promise<void> {
  //   if (!this.s3LogsClient || !this.s3LogsBucket) return;

  //   try {
  //     const fileBuffer = readFileSync(filePath);
  //     const key = `${this.s3LogsPrefix}/${basename(filePath)}`;

  //     await this.s3LogsClient.send(
  //       new PutObjectCommand({
  //         Bucket: this.s3LogsBucket,
  //         Key: key,
  //         Body: fileBuffer,
  //         ContentType: filePath.endsWith(".gz")
  //           ? "application/gzip"
  //           : "text/plain",
  //       }),
  //     );

  //     unlinkSync(filePath);
  //   } catch (err) {
  //     // Log the error so we know when S3 upload is failing — previously silent
  //     console.error(
  //       `[CustomLogger] Failed to upload log file to S3: ${filePath} — ${
  //         err instanceof Error ? err.message : String(err)
  //       }`,
  //     );
  //   }
  // }

  /**
   * On startup, upload and delete all accumulated log files that were left behind
   * by previous runs (e.g. after crashes, S3 failures, or transport removal).
   * Runs once per process via static flag.
   */
  // private startupLogCleanup(dirname: string): void {
  //   if (CustomLogger.startupCleanupDone) return;
  //   CustomLogger.startupCleanupDone = true;

  //   try {
  //     const files = readdirSync(dirname);

  //     for (const file of files) {
  //       // Only upload and delete compressed/rotated archives (.gz)
  //       // Plain .log files are kept on the volume as-is
  //       if (file.endsWith(".gz")) {
  //         void this.uploadLogFileToS3(join(dirname, file));
  //       }
  //     }
  //   } catch {
  //     // Directory may not exist yet on first run
  //   }
  // }

  // private sendErrorToDiscord({
  //   requestId,
  //   contextName,
  //   formattedMessage,
  //   logData,
  //   stack,
  // }: {
  //   requestId: string;
  //   contextName: string;
  //   formattedMessage: string;
  //   logData: string;
  //   stack?: string;
  // }) {
  //   let discordMessage = "";
  //   discordMessage += `\`requestId\`: ${requestId}\n`;
  //   discordMessage += `\`contextName\`: ${contextName}\n`;
  //   discordMessage += `\`message\`: ${formattedMessage}`;

  //   if (logData) {
  //     discordMessage += `\n\`logData\`: ${logData}`;
  //   }

  //   if (stack) {
  //     discordMessage += `\n\`stack\`: ${stack}`;
  //   }

  //   // Limitar a mensagem a no máximo 1900 caracteres, adicionando "..." se necessário
  //   if (discordMessage.length > 1900) {
  //     discordMessage = `${discordMessage.slice(0, 1900)}...`;
  //   }

  //   discordMessage += "\n";
  //   discordMessage += "=".repeat(80);
  //   discordMessage += "\n";

  //   try {
  //     void this.httpService?.post("", {
  //       content: discordMessage,
  //     });
  //   } catch {
  //     // Ignorar erros ao enviar para o webhook para não impactar o fluxo principal
  //   }
  // }
}

/// //////////////////////////
//  Helpers
/// //////////////////////////
/**
 * Safe JSON.stringify that handles circular references and non-serializable
 * objects (e.g. Axios errors containing ClientRequest sockets).
 */
function safeStringify(value: unknown): string {
  const seen = new WeakSet();
  return (
    JSON.stringify(value, (_key, val) => {
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) return '[Circular]';
        seen.add(val);
      }
      /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
      return val;
    }) ?? 'undefined'
  );
}

/**
 * Strip properties from an object that are known to carry circular
 * references or are simply too large/unserializable to log (Axios request /
 * response internals, Node.js socket objects, etc.).
 */
const UNSAFE_KEYS = new Set([
  'request', // Axios: ClientRequest (circular)
  'socket',
  'agent',
  'httpAgent',
  'httpsAgent',
  '_httpMessage',
]);

function sanitizeForLogging(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (UNSAFE_KEYS.has(key)) continue;
    // Recursively sanitize nested plain objects (e.g. axios config)
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Error)
    ) {
      result[key] = sanitizeForLogging(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}
