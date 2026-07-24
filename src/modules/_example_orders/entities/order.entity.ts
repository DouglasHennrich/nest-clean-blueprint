import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/@shared/entities/base.entity';
import { IOrderModel } from '../models/order.struct';
import { OrderStatusEnum } from '../enums/order-status.enum';

@Entity({ name: 'orders' })
export class OrderEntity extends BaseEntity implements IOrderModel {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Column({ type: 'varchar', length: 255, name: 'customer_name' })
  customerName: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  // Enums are stored as VARCHAR by convention.
  @Index()
  @Column({ type: 'varchar', length: 32, default: OrderStatusEnum.PENDING })
  status: OrderStatusEnum;
}
