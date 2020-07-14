import {
    ENetworkObjectType,
    EOwnerType,
    IApiPersonsConstructionStockpilePost,
    IObject,
    IPerson,
    IStockpile,
    IStockpileTile,
} from './types/GameTypes';
import { getNetworkObjectCellString } from './cell';

/**
 * Data needed to setup the stockpile controller.
 */
export interface IStockpileControllerParams {
    person: IPerson;
    stockpiles: IStockpile[];
    stockpileTiles: IStockpileTile[];
}

/**
 * Data after the stockpile controller is done.
 */
export interface IStockpileControllerState {
    stockpiles: IStockpile[];
    stockpileTiles: IStockpileTile[];
}

/**
 * Get a list of stockpile changes.
 */
export interface IConstructStockpileTransaction {
    stockpilesToAdd: IStockpile[];
    stockpilesToModify: IStockpile[];
    stockpilesToRemove: IStockpile[];
    stockpileTilesToAdd: IStockpileTile[];
    stockpileTilesToModify: IStockpileTile[];
    stockpileTilesToRemove: IStockpileTile[];
}

/**
 * A class which handles all logic behind constructing or destroying a building.
 */
export class StockpileController {
    private person: IPerson;
    private stockpiles: IStockpile[];
    private stockpileTiles: IStockpileTile[];

    static NUMBER_OF_ROWS_PER_STOCKPILE_TILE: number = 1;
    static NUMBER_OF_COLUMNS_PER_STOCKPILE_TILE: number = 10;

    static getStockpileId(location: IObject): string {
        return `stockpile(${location.x},${location.y})`;
    }

    /**
     * Create an instance of the stockpile controller. Used to perform stockpile related tasks such as adding,
     * removing, stockpiles, and stockpile tiles.
     * @param person The person that is modifying stockpiles.
     * @param stockpiles The stockpiles in the area.
     * @param stockpileTiles The stockpile tiles in the area.
     */
    constructor({ person, stockpiles, stockpileTiles }: IStockpileControllerParams) {
        this.person = person;
        this.stockpiles = stockpiles;
        this.stockpileTiles = stockpileTiles;
    }

    /**
     * Create a new stockpile.
     * @param stockpileId The stockpile id of the new stockpile.
     * @param location The location of the stockpile.
     */
    private createNewStockpile(stockpileId: string, location: IObject): IStockpile {
        return {
            id: stockpileId,
            ownerType: EOwnerType.PERSON,
            ownerId: this.person.id,
            x: location.x,
            y: location.y,
            objectType: ENetworkObjectType.STOCKPILE,
            health: {
                rate: 0,
                max: 1,
                value: 1,
            },
            lastUpdate: new Date().toISOString(),
            inventory: {
                rows: StockpileController.NUMBER_OF_ROWS_PER_STOCKPILE_TILE,
                columns: StockpileController.NUMBER_OF_COLUMNS_PER_STOCKPILE_TILE,
                slots: [],
            },
            craftingSeed: stockpileId,
            craftingState: true,
            inventoryState: [],
            cell: getNetworkObjectCellString(location),
            acceptedNetworkObjectGroups: [],
        };
    }

    /**
     * Create a new stockpile tile for a stockpile.
     * @param stockpileId The stockpile id of the stockpile.
     * @param location The location of the stockpile tile.
     */
    private createNewStockpileTile(stockpileId: string, location: IObject): IStockpileTile {
        return {
            id: `stockpileTile(${location.x},${location.y})`,
            ownerType: EOwnerType.PERSON,
            ownerId: this.person.id,
            stockpileId,
            x: location.x,
            y: location.y,
            objectType: ENetworkObjectType.STOCKPILE,
            lastUpdate: new Date().toISOString(),
            health: {
                max: 1,
                rate: 0,
                value: 1,
            },
            stockpileIndex: 0,
            cell: getNetworkObjectCellString(location),
        };
    }

    /**
     * Check the neighboring stockpile tiles for neighboring stockpile ids.
     * @param stockpileTiles The stockpile tiles to check.
     * @param location The location to check stockpile tiles against.
     */
    private checkNeighboringStockpileTiles(
        stockpileTiles: IStockpileTile[],
        location: IObject,
    ): {
        neighborStockpileIds: string[];
    } {
        // determine neighboring tiles
        const westNeighbors = stockpileTiles.filter((tile) => tile.x === location.x - 200 && tile.y === location.y);
        const eastNeighbors = stockpileTiles.filter((tile) => tile.x === location.x + 200 && tile.y === location.y);
        const northNeighbors = stockpileTiles.filter((tile) => tile.x === location.x && tile.y === location.y - 200);
        const southNeighbors = stockpileTiles.filter((tile) => tile.x === location.x && tile.y === location.y + 200);

        // get neighboring stockpile ids, which will change how construction behaves
        const neighborStockpileIds = Array.from(
            new Set(
                [...westNeighbors, ...eastNeighbors, ...northNeighbors, ...southNeighbors].map(
                    (tile) => tile.stockpileId,
                ),
            ),
        );
        return {
            neighborStockpileIds,
        };
    }

    /**
     * Determine the building requirements for constructing a stockpile.
     * @param location The location to build or destroy.
     * @param stockpiles A list of stockpiles in the area.
     * @param stockpileTiles A list of stockpile tiles in the area.
     */
    private determineBuildingRequirements({
        location,
        stockpiles,
        stockpileTiles,
    }: {
        location: IObject;
        stockpiles: IStockpile[];
        stockpileTiles: IStockpileTile[];
    }) {
        // determine things to remove
        let stockpilesToRemove: IStockpile[];
        let stockpileTilesToRemove: IStockpileTile[];

        // determine things to modify
        let stockpilesToModify: IStockpile[];
        let stockpileTilesToModify: IStockpileTile[];

        // determine things to add
        let stockpilesToAdd: IStockpile[];
        let stockpileTilesToAdd: IStockpileTile[];

        // if location exists, remove tile, else add tile
        const matchingFloorAtLocation = stockpileTiles.find((tile) => tile.x === location.x && tile.y === location.y);
        if (matchingFloorAtLocation) {
            // remove tile
            // stockpile id
            const stockpileId = matchingFloorAtLocation.stockpileId;
            const stockpileStockpileTiles = stockpileTiles.filter((tile) => tile.stockpileId === stockpileId);

            stockpilesToAdd = [];
            stockpileTilesToAdd = [];
            stockpileTilesToRemove = stockpileTiles.filter((tile) => tile.x === location.x && tile.y === location.y);
            stockpilesToRemove =
                stockpileStockpileTiles.filter((tile) => {
                    return !stockpileTilesToRemove.some((t) => t.id === tile.id);
                }).length <= 1
                    ? stockpiles
                          .filter((stockpile) => {
                              return stockpile.id === stockpileId;
                          })
                          .map((stockpile) => ({
                              ...stockpile,
                              inventory: {
                                  ...stockpile.inventory,
                                  rows: 0,
                                  columns: StockpileController.NUMBER_OF_COLUMNS_PER_STOCKPILE_TILE,
                              },
                              lastUpdate: new Date().toISOString(),
                          }))
                    : [];
            stockpileTilesToModify = stockpileTiles
                .filter((tile) => {
                    return !stockpileTilesToRemove.some((t) => t.id === tile.id);
                })
                .map((tile, index) => ({
                    ...tile,
                    stockpileIndex: index,
                    lastUpdate: new Date().toISOString(),
                }));
            stockpilesToModify = stockpiles
                .filter((stockpile) => {
                    return stockpile.id === stockpileId && !stockpilesToRemove.some((s) => s.id === stockpile.id);
                })
                .map((stockpile) => ({
                    ...stockpile,
                    inventory: {
                        ...stockpile.inventory,
                        rows:
                            stockpileTilesToModify.filter((tile) => {
                                return tile.stockpileId === stockpile.id;
                            }).length * StockpileController.NUMBER_OF_ROWS_PER_STOCKPILE_TILE,
                        columns: StockpileController.NUMBER_OF_COLUMNS_PER_STOCKPILE_TILE,
                    },
                    lastUpdate: new Date().toISOString(),
                }));

            // check to see if newly modified stockpile has inventory space to store items
            for (const stockpile of [...stockpilesToModify, ...stockpilesToRemove]) {
                const maxSlots = stockpile.inventory.rows * stockpile.inventory.columns;
                if (stockpile.inventory.slots.length > maxSlots) {
                    throw new Error('Cannot remove stockpile tile, please remove items in inventory first');
                }
            }
        } else {
            // add tile
            // determine stockpiles to add
            const result = this.checkNeighboringStockpileTiles(stockpileTiles, location);
            const nearbyStockpileIds = result.neighborStockpileIds;

            let stockpileId: string;
            stockpilesToRemove = [];
            if (nearbyStockpileIds.length === 0) {
                stockpileId = StockpileController.getStockpileId(location);
                const newStockpile: IStockpile = this.createNewStockpile(stockpileId, location);
                stockpilesToAdd = [newStockpile];
            } else if (nearbyStockpileIds.length === 1) {
                stockpileId = nearbyStockpileIds[0];
                stockpilesToAdd = [];
            } else {
                throw new Error('Cannot connect two separate stockpiles');
            }

            const newStockpileTile: IStockpileTile = this.createNewStockpileTile(stockpileId, location);
            stockpileTilesToAdd = [newStockpileTile];
            stockpileTilesToRemove = [];

            // check building constraints, largest stockpile is 5 by 5
            const afterConstructionStockpileTiles = [...stockpileTiles, ...stockpileTilesToAdd];
            const stockpileStockpileTiles = afterConstructionStockpileTiles.filter(
                (tile) => tile.stockpileId === stockpileId,
            );
            const minX = stockpileStockpileTiles.reduce(
                (acc: number, tile: IStockpileTile): number => Math.min(acc, tile.x),
                Infinity,
            );
            const maxX = stockpileStockpileTiles.reduce(
                (acc: number, tile: IStockpileTile): number => Math.max(acc, tile.x),
                -Infinity,
            );
            const minY = stockpileStockpileTiles.reduce(
                (acc: number, tile: IStockpileTile): number => Math.min(acc, tile.y),
                Infinity,
            );
            const maxY = stockpileStockpileTiles.reduce(
                (acc: number, tile: IStockpileTile): number => Math.max(acc, tile.y),
                -Infinity,
            );
            if (maxX - minX >= 5 * 200) {
                throw new Error('Stockpile is too long east to west');
            }
            if (maxY - minY >= 5 * 200) {
                throw new Error('Stockpile is too long north to south');
            }

            // modify stockpile tiles and stockpile data
            stockpileTilesToModify = stockpileTiles.map((tile, index) => ({
                ...tile,
                stockpileIndex: index,
                lastUpdate: new Date().toISOString(),
            }));
            newStockpileTile.stockpileIndex = stockpileTiles.length;
            stockpilesToModify = stockpiles
                .filter((stockpile) => {
                    return stockpile.id === stockpileId;
                })
                .map((stockpile) => ({
                    ...stockpile,
                    inventory: {
                        ...stockpile.inventory,
                        rows:
                            (stockpileTilesToModify.filter((tile) => {
                                return tile.stockpileId === stockpileId;
                            }).length +
                                1) *
                            StockpileController.NUMBER_OF_ROWS_PER_STOCKPILE_TILE,
                        columns: StockpileController.NUMBER_OF_COLUMNS_PER_STOCKPILE_TILE,
                    },
                    lastUpdate: new Date().toISOString(),
                }));
        }

        return {
            stockpilesToAdd,
            stockpileTilesToAdd,
            stockpilesToModify,
            stockpileTilesToModify,
            stockpilesToRemove,
            stockpileTilesToRemove,
        };
    }

    public constructStockpile({ location }: { location: IObject }): IConstructStockpileTransaction {
        // determine the structure changes required to perform the construction action at the location
        const {
            stockpileTilesToModify,
            stockpilesToModify,
            stockpileTilesToRemove,
            stockpilesToRemove,
            stockpileTilesToAdd,
            stockpilesToAdd,
        } = this.determineBuildingRequirements({
            location,
            stockpiles: this.stockpiles,
            stockpileTiles: this.stockpileTiles,
        });

        // update local copy
        const updateLocalCopy = <T extends { id: string }>(arr: T[], toModify: T[], toAdd: T[], toRemove: T[]): T[] => {
            return [
                ...arr.filter((stockpile) => {
                    return (
                        !toModify.some((s) => s.id === stockpile.id) &&
                        !toAdd.some((s) => s.id === stockpile.id) &&
                        !toRemove.some((s) => s.id === stockpile.id)
                    );
                }),
                ...toModify,
                ...toAdd,
            ];
        };
        this.stockpiles = updateLocalCopy(this.stockpiles, stockpilesToModify, stockpilesToAdd, stockpilesToRemove);
        this.stockpileTiles = updateLocalCopy(
            this.stockpileTiles,
            stockpileTilesToModify,
            stockpileTilesToAdd,
            stockpileTilesToRemove,
        );

        return {
            stockpilesToAdd,
            stockpilesToModify,
            stockpilesToRemove,
            stockpileTilesToAdd,
            stockpileTilesToModify,
            stockpileTilesToRemove,
        };
    }

    public getState(): IStockpileControllerState {
        return {
            stockpiles: this.stockpiles,
            stockpileTiles: this.stockpileTiles,
        };
    }

    public getConstructionStockpileRequest(location: IObject): IApiPersonsConstructionStockpilePost {
        return {
            personId: this.person.id,
            location,
        };
    }
}
