import { Injectable } from "@nestjs/common";
import { AbstractPresenter } from "@/@shared/classes/presenter";
import { IOrderModel } from "../models/order.model";

export interface IOrderPresenterResponse {
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
  IOrderPresenterResponse
> {}

@Injectable()
export class OrderPresenter implements IOrderPresenter {
  present(entity: IOrderModel): IOrderPresenterResponse {
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

  presentWithoutRelations(entity: IOrderModel): IOrderPresenterResponse {
    return this.present(entity);
  }

  presentMany(entities: IOrderModel[]): IOrderPresenterResponse[] {
    return entities.map((e) => this.present(e));
  }
}
