import { OrderStatusEnum } from "../enums/order-status.enum";

export interface IOrderModel {
  id: string;
  code: string;
  customerName: string;
  amount: number;
  status: OrderStatusEnum;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
