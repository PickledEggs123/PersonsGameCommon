/**
 * Get the cell tile position of a network object.
 * @param networkObject The object to compute position for.
 */
import { INetworkObjectCellPosition, IObject } from './types/GameTypes';

/**
 * The size of each cell in the game world.
 */
export const cellSize = 2000;

export const getNetworkObjectWorldCellPosition = (networkObject: IObject): INetworkObjectCellPosition => {
    const x = Math.floor(networkObject.x / cellSize);
    const y = Math.floor(networkObject.y / cellSize);
    return {
        x,
        y,
    };
};
/**
 * Get the cell string of a cell position.
 * @param position The cell position to convert into a string.
 */
const networkObjectCellPositionToCellString = (position: INetworkObjectCellPosition): string => {
    return `cell:${position.x},${position.y}`;
};
/**
 * Get the cell string of a network object.
 * @param networkObject The network object to convert into a cell string.
 */
export const getNetworkObjectCellString = (networkObject: IObject): string => {
    return networkObjectCellPositionToCellString(getNetworkObjectWorldCellPosition(networkObject));
};
