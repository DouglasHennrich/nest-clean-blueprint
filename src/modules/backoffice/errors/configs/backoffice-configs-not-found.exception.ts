import { AbstractApplicationException } from '@/@shared/errors/abstract-application-exception';
import { IRequestContext } from '@/@shared/protocols/request-context.struct';
import { HttpStatus } from '@nestjs/common';

export class BackofficeConfigsNotFoundException extends AbstractApplicationException {
  constructor(id: string, context?: IRequestContext) {
    super(
      `Backoffice configs not found with id: ${id}`,
      'BackofficeConfigsNotFoundException',
      HttpStatus.NOT_FOUND,
      context,
    );
  }
}
