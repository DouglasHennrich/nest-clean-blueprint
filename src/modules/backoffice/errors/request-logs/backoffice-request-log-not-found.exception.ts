import { AbstractApplicationException } from '@/@shared/errors/abstract-application-exception';
import { HttpStatus } from '@nestjs/common';

export class BackofficeRequestLogNotFoundException extends AbstractApplicationException {
  constructor(id: string) {
    super(
      `Request log not found with id: ${id}`,
      'BackofficeRequestLogNotFoundException',
      HttpStatus.NOT_FOUND,
    );
  }
}
