import { IObject } from './types/GameTypes';

export const leftNormal = ({ x, y }: IObject): IObject => ({ x: -y, y: x });
export const dotProduct = (a: IObject, b: IObject): number => a.x * b.x + a.y * b.y;
export const perpendicularProduct = (a: IObject, b: IObject): number => dotProduct(leftNormal(a), b);
export const intersectionTime = (a: IObject, b: IObject, d: IObject): number => {
    return perpendicularProduct(d, b) / perpendicularProduct(a, b);
};
export const intersectionOfVectors = (a: IObject, b: IObject, d: IObject): boolean => {
    const scalarA = intersectionTime(a, b, d);
    const scalarB = intersectionTime(b, a, { x: -d.x, y: -d.y });
    return scalarA >= 0 && scalarB >= 0 && scalarB < 1;
};
