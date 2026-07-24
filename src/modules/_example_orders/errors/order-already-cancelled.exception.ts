import { HttpStatus } from '@nestjs/common';
import { AbstractApplicationException } from '@/@shared/errors/abstract-application-exception';

export class OrderAlreadyCancelledException extends AbstractApplicationException {
  constructor(id: string) {
    super(
      `Order ${id} is already cancelled`,
      'OrderAlreadyCancelledException',
      HttpStatus.CONFLICT,
    );
  }
}
