import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AbstractRepository } from "@/@shared/classes/repository";
import { ILogger, CustomLogger } from "@/@shared/classes/custom-logger";
import { TEnvService } from "@/modules/env/services/env.service";
import { OrderEntity } from "../entities/order.entity";
import { IOrderModel } from "../models/order.model";

/**
 * IOrdersRepository — DI token (extends AbstractRepository so it doubles as the type).
 */
export abstract class IOrdersRepository extends AbstractRepository<
  OrderEntity,
  IOrderModel
> {}

@Injectable()
export class OrdersRepository extends IOrdersRepository {
  constructor(
    @InjectRepository(OrderEntity)
    repository: Repository<OrderEntity>,
    envService: TEnvService,
  ) {
    const logger: ILogger = new CustomLogger(OrdersRepository.name);
    super(repository, envService, logger);
  }
}
