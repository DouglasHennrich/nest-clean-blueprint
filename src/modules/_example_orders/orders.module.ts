import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EnvModule } from "@/modules/env/env.module";

import { OrderEntity } from "./entities/order.entity";
import {
  IOrdersRepository,
  OrdersRepository,
} from "./repositories/orders.repository";
import { IOrderPresenter, OrderPresenter } from "./presenters/order.presenter";

import {
  CreateOrderService,
  TCreateOrderService,
} from "./services/create-order.service";
import {
  GetOrderService,
  TGetOrderService,
} from "./services/get-order.service";
import {
  ListOrdersService,
  TListOrdersService,
} from "./services/list-orders.service";
import {
  UpdateOrderService,
  TUpdateOrderService,
} from "./services/update-order.service";
import {
  DeleteOrderService,
  TDeleteOrderService,
} from "./services/delete-order.service";

import { CreateOrderController } from "./controllers/create-order.controller";
import { GetOrderController } from "./controllers/get-order.controller";
import { ListOrdersController } from "./controllers/list-orders.controller";
import { UpdateOrderController } from "./controllers/update-order.controller";
import { DeleteOrderController } from "./controllers/delete-order.controller";

@Module({
  imports: [TypeOrmModule.forFeature([OrderEntity]), EnvModule],
  controllers: [
    CreateOrderController,
    GetOrderController,
    ListOrdersController,
    UpdateOrderController,
    DeleteOrderController,
  ],
  providers: [
    { provide: IOrdersRepository, useClass: OrdersRepository },
    { provide: IOrderPresenter, useClass: OrderPresenter },
    { provide: TCreateOrderService, useClass: CreateOrderService },
    { provide: TGetOrderService, useClass: GetOrderService },
    { provide: TListOrdersService, useClass: ListOrdersService },
    { provide: TUpdateOrderService, useClass: UpdateOrderService },
    { provide: TDeleteOrderService, useClass: DeleteOrderService },
  ],
})
export class OrdersModule {}
