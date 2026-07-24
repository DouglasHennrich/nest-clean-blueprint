import { AbstractApplicationException } from '@/@shared/errors/abstract-application-exception';
import { HttpStatus } from '@nestjs/common';

export class BackofficeConfigsNotFoundException extends AbstractApplicationException {
  constructor(id: string) {
    super(
      `Backoffice configs not found with id: ${id}`,
      'BackofficeConfigsNotFoundException',
      HttpStatus.NOT_FOUND,
    );
  }
}
