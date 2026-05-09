import { HttpStatus } from "@nestjs/common";
import { AbstractApplicationException } from "@/@shared/errors/abstract-application-exception";
import { IRequestContext } from "@/@shared/protocols/request-context.struct";

export class OrderNotFoundException extends AbstractApplicationException {
  constructor(id: string, context?: IRequestContext) {
    super(
      `Order with id ${id} not found`,
      "OrderNotFoundException",
      HttpStatus.NOT_FOUND,
      context,
    );
  }
}

export class OrderAlreadyCancelledException extends AbstractApplicationException {
  constructor(id: string, context?: IRequestContext) {
    super(
      `Order ${id} is already cancelled`,
      "OrderAlreadyCancelledException",
      HttpStatus.CONFLICT,
      context,
    );
  }
}
