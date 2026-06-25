import { AbstractApplicationException } from '@/@shared/errors/abstract-application-exception';
import { IRequestContext } from '@/@shared/protocols/request-context.struct';
import { HttpStatus } from '@nestjs/common';

export class BackofficeRequestLogNotFoundException extends AbstractApplicationException {
  constructor(id: string, context?: IRequestContext) {
    super(
      `Request log not found with id: ${id}`,
      'BackofficeRequestLogNotFoundException',
      HttpStatus.NOT_FOUND,
      context,
    );
  }
}
