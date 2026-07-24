/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AUDIT_METADATA_KEY, IAuditMetadataModel } from '../decorators/audit.decorator';
import { Request } from 'express';
import { TCurrentUser } from '@/modules/authenticate/models/current-user.struct';
import { IRequestContextModel, RequestContext } from '@/@shared/context/request.context';
import { Normalize } from '@/@shared/utils/normalize';
import { TBackofficeCreateBackofficeAuditLogService } from '../services/audit-logs/backoffice-create-audit-log.service';

@Injectable()
export class BackofficeAuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly createAuditLogService: TBackofficeCreateBackofficeAuditLogService,
  ) {}

  private readonly SKIP_PATHS = ['/health', '/metrics', '/swagger', '/favicon'];

  private deriveActionFromMethod(method: string): string {
    const map: Record<string, string> = {
      GET: 'READ',
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
    };
    return map[method.toUpperCase()] ?? method.toUpperCase();
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const auditMetadata = this.reflector.get<IAuditMetadataModel>(
      AUDIT_METADATA_KEY,
      context.getHandler(),
    );

    const request: Request = context.switchToHttp().getRequest();

    if (this.SKIP_PATHS.some((p) => request.url.includes(p))) {
      return next.handle();
    }

    if (request.method === 'GET' && !auditMetadata) {
      return next.handle();
    }

    const { method, url, body, params, query, headers } = request;
    const currentUser: TCurrentUser | undefined = request.currentUser;
    const startTime = Date.now();

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const toUuid = (value: any): string | undefined => {
      if (typeof value === 'string' && UUID_REGEX.test(value)) return value;
      return undefined;
    };

    const extractEntityId = (response: any, params: any, body: any): string | undefined => {
      return toUuid(response?.id) || toUuid(params?.id) || toUuid(body?.id);
    };

    const extractBusinessContext = (
      response: any,
      params: any,
      body: any,
    ): { careAssignmentId?: string; patientId?: string } => {
      return {
        careAssignmentId:
          toUuid(params?.careAssignmentId) ||
          toUuid(body?.careAssignmentId) ||
          toUuid(response?.careAssignmentId),
        patientId:
          toUuid(params?.patientId) || toUuid(body?.patientId) || toUuid(response?.patientId),
      };
    };

    const requestContext: IRequestContextModel = {
      requestId: RequestContext.getRequestId() ?? '',
      user: currentUser,
      ip: Normalize.realIp(request),
      body,
      params,
      query,
      timestamp: new Date(),
      startedAt: new Date(),
      userAgent: headers['user-agent'],
    };

    // requestContext is kept for potential future use (e.g. tracing correlation).
    void requestContext;

    return next.handle().pipe(
      tap(async (response) => {
        const responseTime = Date.now() - startTime;
        const entityId = extractEntityId(response, params, body);
        const businessContext = extractBusinessContext(response, params, body);

        void this.createAuditLogService.execute({
          method,
          path: url,
          endpoint: auditMetadata?.endpoint ?? url,
          userId: currentUser?.id,
          userEmail: currentUser?.email as string | undefined,
          userName: currentUser?.name as string | undefined,
          body,
          params,
          query,
          headers: {
            'user-agent': headers['user-agent'],
            'content-type': headers['content-type'],
          },
          action: auditMetadata?.action ?? this.deriveActionFromMethod(method),
          entityType: auditMetadata?.entityType,
          entityId,
          ip: Normalize.realIp(request),
          userAgent: headers['user-agent'],
          responseTime,
          statusCode: context.switchToHttp().getResponse().statusCode,
          careAssignmentId: businessContext.careAssignmentId,
          patientId: businessContext.patientId,
        });
      }),
      catchError((error) => {
        const responseTime = Date.now() - startTime;

        void this.createAuditLogService.execute({
          method,
          path: url,
          endpoint: auditMetadata?.endpoint ?? url,
          userId: currentUser?.id,
          userEmail: currentUser?.email as string | undefined,
          userName: currentUser?.name as string | undefined,
          body,
          params,
          query,
          headers: {
            'user-agent': headers['user-agent'],
            'content-type': headers['content-type'],
          },
          action: auditMetadata?.action ?? this.deriveActionFromMethod(method),
          entityType: auditMetadata?.entityType,
          ip: Normalize.realIp(request),
          userAgent: headers['user-agent'],
          responseTime,
          statusCode: error.status || 500,
          errorMessage: error.message,
          stackTrace: error.stack,
        });

        return throwError(() => error);
      }),
    );
  }
}
