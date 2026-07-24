import { HttpStatus } from '@nestjs/common';
import { AbstractApplicationException } from '@/@shared/errors/abstract-application-exception';

export class OrderNotFoundException extends AbstractApplicationException {
  constructor(id: string) {
    super(`Order with id ${id} not found`, 'OrderNotFoundException', HttpStatus.NOT_FOUND);
  }
}
