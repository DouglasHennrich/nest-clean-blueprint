import { AbstractPresenter } from '@/@shared/classes/presenter';
import { IOrderModel } from '../models/order.struct';

export interface IOrderPresenterResponseModel {
  id: string;
  code: string;
  customerName: string;
  amount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export abstract class IOrderPresenter extends AbstractPresenter<
  IOrderModel,
  IOrderPresenterResponseModel
> {}

export class OrderPresenter extends IOrderPresenter {
  present({ entity }: { entity: IOrderModel; options?: any }): IOrderPresenterResponseModel {
    return {
      id: entity.id,
      code: entity.code,
      customerName: entity.customerName,
      amount: Number(entity.amount),
      status: entity.status,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
