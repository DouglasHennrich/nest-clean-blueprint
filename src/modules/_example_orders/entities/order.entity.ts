import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { IOrderModel } from "../models/order.model";
import { OrderStatusEnum } from "../enums/order-status.enum";

@Entity({ name: "orders" })
export class OrderEntity implements IOrderModel {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 32 })
  code: string;

  @Column({ type: "varchar", length: 255, name: "customer_name" })
  customerName: string;

  @Column({ type: "numeric", precision: 12, scale: 2 })
  amount: number;

  // Enums are stored as VARCHAR by convention.
  @Index()
  @Column({ type: "varchar", length: 32, default: OrderStatusEnum.PENDING })
  status: OrderStatusEnum;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @DeleteDateColumn({ name: "deleted_at" })
  deletedAt?: Date | null;
}
