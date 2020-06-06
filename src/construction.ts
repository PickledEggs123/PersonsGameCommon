import {
    EFloorPattern,
    ENetworkObjectType,
    EOwnerType,
    EWallDirection,
    EWallPattern,
    IApiPersonsConstructionPost,
    ICraftingRecipeItem,
    IFloor,
    IHouse,
    INetworkObject,
    INpc,
    IObject,
    IPerson,
    IWall,
} from './types/GameTypes';
import { InventoryController } from './inventory';

/**
 * Data needed to setup the construction controller.
 */
export interface IConstructionControllerParams {
    inventoryHolder: IPerson | INpc;
    houses: IHouse[];
    floors: IFloor[];
    walls: IWall[];
}

/**
 * Data after the construction controller is done.
 */
export interface IConstructionControllerState {
    inventoryHolder: IPerson | INpc;
    houses: IHouse[];
    floors: IFloor[];
    walls: IWall[];
}

/**
 * Get a list of building and item changes.
 */
export interface IConstructBuildingTransaction {
    housesToAdd: IHouse[];
    housesToRemove: IHouse[];
    floorsToAdd: IFloor[];
    floorsToRemove: IFloor[];
    wallsToAdd: IWall[];
    wallsToRemove: IWall[];
    deletedSlots: string[];
    modifiedSlots: INetworkObject[];
    updatedItems: INetworkObject[];
    stackableSlots: INetworkObject[];
}

/**
 * A class which handles all logic behind constructing or destroying a building.
 */
export class ConstructionController {
    /**
     * The person or npc performing the construction.
     */
    private readonly inventoryHolder: IPerson | INpc;
    /**
     * The inventory of the person or npc performing the construction.
     */
    private inventoryController: InventoryController;
    private houses: IHouse[];
    private floors: IFloor[];
    private walls: IWall[];

    /**
     * Create an instance of the construction controller. Used to perform construction related tasks such as adding,
     * removing, walls, floors, homes and items used to build walls and floors.
     * @param inventoryHolder The person or npc performing the construction task.
     * @param houses The houses in the area.
     * @param floors The floors in the area.
     * @param walls The walls in the area.
     */
    constructor({ inventoryHolder, houses, floors, walls }: IConstructionControllerParams) {
        this.inventoryHolder = inventoryHolder;
        this.inventoryController = new InventoryController(this.inventoryHolder);
        this.houses = houses;
        this.floors = floors;
        this.walls = walls;
    }

    /**
     * Create a new house.
     * @param houseId The house id of the new house.
     * @param location The location of the house.
     */
    private createNewHouse(houseId: string, location: IObject): IHouse {
        return {
            id: houseId,
            ownerType: EOwnerType.PERSON,
            ownerId: this.inventoryHolder.id,
            x: location.x,
            y: location.y,
            objectType: ENetworkObjectType.POND,
            health: {
                rate: 0,
                max: 1,
                value: 1,
            },
            lastUpdate: new Date().toISOString(),
            npcId: this.inventoryController.getHouseId(),
        };
    }

    /**
     * Create a new wall for a house.
     * @param l The location of the wall.
     * @param direction The direction of the wall.
     */
    private createNewWall(l: IObject, direction: EWallDirection): IWall {
        return {
            id: `wall-${direction}(${l.x},${l.y})`,
            ownerType: EOwnerType.PERSON,
            ownerId: this.inventoryHolder.id,
            x: l.x,
            y: l.y,
            wallPattern: EWallPattern.WATTLE,
            direction,
            objectType: ENetworkObjectType.POND,
            lastUpdate: new Date().toISOString(),
            health: {
                max: 1,
                rate: 0,
                value: 1,
            },
        };
    }

    /**
     * Create a new floor for a house.
     * @param houseId The house id of the house.
     * @param location The location of the floor.
     */
    private createNewFloor(houseId: string, location: IObject): IFloor {
        return {
            id: `floor(${location.x},${location.y})`,
            ownerType: EOwnerType.PERSON,
            ownerId: this.inventoryHolder.id,
            houseId,
            x: location.x,
            y: location.y,
            floorPattern: EFloorPattern.DIRT,
            objectType: ENetworkObjectType.POND,
            lastUpdate: new Date().toISOString(),
            health: {
                max: 1,
                rate: 0,
                value: 1,
            },
        };
    }

    /**
     * Check the neighboring floor tiles for walls to add and neighboring house ids.
     * @param floors The floors tiles to check.
     * @param location The location to check floor tiles against.
     * @param removeTile If the operation is adding or removing a tile.
     */
    private checkNeighboringFloorTiles(
        floors: IFloor[],
        location: IObject,
        removeTile: boolean,
    ): {
        wallsToAdd: IWall[];
        neighborHouseIds: string[];
    } {
        // determine neighboring tiles
        const westNeighbors = floors.filter((floor) => floor.x === location.x - 200 && floor.y === location.y);
        const eastNeighbors = floors.filter((floor) => floor.x === location.x + 200 && floor.y === location.y);
        const northNeighbors = floors.filter((floor) => floor.x === location.x && floor.y === location.y - 200);
        const southNeighbors = floors.filter((floor) => floor.x === location.x && floor.y === location.y + 200);

        // determine which tile is nearby, changing which walls are added
        const thereIsWestNeighbor = westNeighbors.length > 0;
        const thereIsEastNeighbor = eastNeighbors.length > 0;
        const thereIsNorthNeighbor = northNeighbors.length > 0;
        const thereIsSouthNeighbor = southNeighbors.length > 0;

        // get neighboring house ids, which will change how construction behaves
        const neighborHouseIds = Array.from(
            new Set(
                [...westNeighbors, ...eastNeighbors, ...northNeighbors, ...southNeighbors].map(
                    (floor) => floor.houseId,
                ),
            ),
        );

        // determine walls to add
        const wallsToAdd: IWall[] = [];
        if (thereIsWestNeighbor === removeTile) {
            // add west wall
            wallsToAdd.push(
                this.createNewWall(
                    {
                        x: location.x,
                        y: location.y,
                    },
                    EWallDirection.VERTICAL,
                ),
            );
        }
        if (thereIsEastNeighbor === removeTile) {
            // add east wall
            wallsToAdd.push(
                this.createNewWall(
                    {
                        x: location.x + 200,
                        y: location.y,
                    },
                    EWallDirection.VERTICAL,
                ),
            );
        }
        if (thereIsNorthNeighbor === removeTile) {
            // add north wall
            wallsToAdd.push(
                this.createNewWall(
                    {
                        x: location.x,
                        y: location.y,
                    },
                    EWallDirection.HORIZONTAL,
                ),
            );
        }
        if (thereIsSouthNeighbor === removeTile) {
            // add south wall
            wallsToAdd.push(
                this.createNewWall(
                    {
                        x: location.x,
                        y: location.y + 200,
                    },
                    EWallDirection.HORIZONTAL,
                ),
            );
        }
        return {
            wallsToAdd,
            neighborHouseIds,
        };
    }

    /**
     * Determine the building requirements for constructing a building.
     * @param location The location to build or destroy.
     * @param houses A list of houses in the area.
     * @param floors A list of floors in the area.
     * @param walls A list of walls in the area.
     */
    private determineBuildingRequirements({
        location,
        houses,
        floors,
        walls,
    }: {
        location: IObject;
        houses: IHouse[];
        floors: IFloor[];
        walls: IWall[];
    }) {
        // determine things to remove
        let housesToRemove: IHouse[];
        let floorsToRemove: IFloor[];

        // find neighboring walls, must remove neighboring walls.
        const wallsToRemove: IWall[] = walls.filter((wall) => {
            const isWestWall =
                wall.direction === EWallDirection.VERTICAL && wall.x === location.x && wall.y === location.y;
            const isEastWall =
                wall.direction === EWallDirection.VERTICAL && wall.x === location.x + 200 && wall.y === location.y;
            const isNorthWall =
                wall.direction === EWallDirection.HORIZONTAL && wall.x === location.x && wall.y === location.y;
            const isSouthWall =
                wall.direction === EWallDirection.HORIZONTAL && wall.x === location.x && wall.y === location.y + 200;
            return isWestWall || isEastWall || isNorthWall || isSouthWall;
        });

        // determine things to add
        let floorsToAdd: IFloor[];
        let housesToAdd: IHouse[];
        let wallsToAdd: IWall[];

        // if location exists, remove floor, else add floor
        const matchingFloorAtLocation = floors.find((floor) => floor.x === location.x && floor.y === location.y);
        if (matchingFloorAtLocation) {
            // remove tile
            // house id
            const houseId = matchingFloorAtLocation.houseId;
            const houseFloors = floors.filter((floor) => floor.houseId === houseId);

            // determine walls to add
            const result = this.checkNeighboringFloorTiles(floors, location, true);

            housesToAdd = [];
            wallsToAdd = result.wallsToAdd;
            floorsToAdd = [];
            housesToRemove = houseFloors.length <= 1 ? houses.filter((house) => house.id === houseId) : [];
            floorsToRemove = floors.filter((floor) => floor.x === location.x && floor.y === location.y);
        } else {
            // add tile
            // determine walls to add
            const result = this.checkNeighboringFloorTiles(floors, location, false);
            wallsToAdd = result.wallsToAdd;
            const nearbyHouseIds = result.neighborHouseIds;

            let houseId: string;
            housesToRemove = [];
            if (nearbyHouseIds.length === 0) {
                houseId = this.inventoryController.getHouseId();
                const newHouse: IHouse = this.createNewHouse(houseId, location);
                housesToAdd = [newHouse];
            } else if (nearbyHouseIds.length === 1) {
                houseId = nearbyHouseIds[0];
                housesToAdd = [];
            } else {
                throw new Error('Cannot connect two separate buildings');
            }

            const newFloor: IFloor = this.createNewFloor(houseId, location);
            floorsToAdd = [newFloor];
            floorsToRemove = [];

            // check building constraints, largest building is 3 by 3
            const afterConstructionFloors = [...floors, ...floorsToAdd];
            const houseFloors = afterConstructionFloors.filter((floor) => floor.houseId === houseId);
            const minX = houseFloors.reduce((acc: number, floor: IFloor): number => Math.min(acc, floor.x), Infinity);
            const maxX = houseFloors.reduce((acc: number, floor: IFloor): number => Math.max(acc, floor.x), -Infinity);
            const minY = houseFloors.reduce((acc: number, floor: IFloor): number => Math.min(acc, floor.y), Infinity);
            const maxY = houseFloors.reduce((acc: number, floor: IFloor): number => Math.max(acc, floor.y), -Infinity);
            if (maxX - minX >= 3 * 200) {
                throw new Error('House is too long east to west');
            }
            if (maxY - minY >= 3 * 200) {
                throw new Error('House is too long north to south');
            }
        }

        return {
            housesToAdd,
            floorsToAdd,
            wallsToAdd,
            housesToRemove,
            floorsToRemove,
            wallsToRemove,
        };
    }

    /**
     * Determine the building material used when building a wall with this pattern.
     * @param wall The wall to build.
     */
    getBuildWallMaterials(wall: IWall): ENetworkObjectType[] {
        if (wall.wallPattern === EWallPattern.WATTLE) {
            return [ENetworkObjectType.WATTLE_WALL];
        } else {
            return [];
        }
    }

    /**
     * Determine the building materials recovered when destroying a wall.
     * @param wall The wall to destroy.
     */
    getDestroyWallMaterials(wall: IWall): ENetworkObjectType[] {
        if (wall.wallPattern === EWallPattern.WATTLE) {
            return [ENetworkObjectType.WATTLE_WALL];
        } else {
            return [];
        }
    }

    /**
     * Determine the building material used when building a floor with this pattern.
     * @param floor The floor to build.
     */
    getBuildFloorMaterials(floor: IFloor): ENetworkObjectType[] {
        return [];
    }

    /**
     * Determine the building materials recovered when destroying a floor.
     * @param floor The floor to destroy.
     */
    getDestroyFloorMaterials(floor: IFloor): ENetworkObjectType[] {
        return [];
    }

    /**
     * Determine the total materials required for a construction change.
     * @param wallsToAdd Adding walls will require materials.
     * @param wallsToRemove Removing walls will return some materials.
     * @param floorsToAdd Adding floors will require materials.
     * @param floorsToRemove Removing floors will return some materials.
     */
    private determineConstructionMaterialsDifference({
        wallsToAdd,
        wallsToRemove,
        floorsToAdd,
        floorsToRemove,
    }: {
        wallsToAdd: IWall[];
        wallsToRemove: IWall[];
        floorsToAdd: IFloor[];
        floorsToRemove: IFloor[];
    }): {
        itemsToAdd: INetworkObject[];
        itemsToRemove: ICraftingRecipeItem[];
    } {
        const itemTypesToAdd: ENetworkObjectType[] = [];
        const itemsToRemove: ICraftingRecipeItem[] = [];

        /**
         * Accumulate list of items to remove.
         * @param objectType The type of item to remove.
         */
        const incrementItemsToRemove = (objectType: ENetworkObjectType) => {
            const existingItemType = itemsToRemove.find((i) => i.item === objectType);
            if (existingItemType) {
                // match found, increment
                existingItemType.quantity += 1;
            } else {
                // match not found, add new item
                const newItemType: ICraftingRecipeItem = {
                    item: objectType,
                    quantity: 1,
                };
                itemsToRemove.push(newItemType);
            }
        };

        for (const wall of wallsToAdd) {
            const returnedItemTypes = this.getDestroyWallMaterials(wall);
            for (const itemType of returnedItemTypes) {
                incrementItemsToRemove(itemType);
            }
        }
        for (const wall of wallsToRemove) {
            const requiredItems = this.getBuildWallMaterials(wall);
            itemTypesToAdd.push(...requiredItems);
        }
        for (const floor of floorsToAdd) {
            const returnedItemTypes = this.getDestroyFloorMaterials(floor);
            for (const itemType of returnedItemTypes) {
                incrementItemsToRemove(itemType);
            }
        }
        for (const floor of floorsToRemove) {
            const requiredItems = this.getBuildFloorMaterials(floor);
            itemTypesToAdd.push(...requiredItems);
        }

        const itemsToAdd: INetworkObject[] = itemTypesToAdd.map((type) =>
            this.inventoryController.createItemType(type),
        );
        return {
            itemsToAdd,
            itemsToRemove,
        };
    }

    public constructBuilding({ location }: { location: IObject }): IConstructBuildingTransaction {
        // determine the structure changes required to perform the construction action at the location
        const {
            housesToRemove,
            housesToAdd,
            floorsToRemove,
            floorsToAdd,
            wallsToRemove,
            wallsToAdd,
        } = this.determineBuildingRequirements({
            location,
            houses: this.houses,
            floors: this.floors,
            walls: this.walls,
        });

        // determine the material and inventory space requirements to perform the construction action
        const { itemsToAdd, itemsToRemove } = this.determineConstructionMaterialsDifference({
            wallsToAdd,
            wallsToRemove,
            floorsToAdd,
            floorsToRemove,
        });

        let deletedSlots: string[] = [];
        let modifiedSlots: INetworkObject[] = [];
        let updatedItems: INetworkObject[] = [];
        let stackableSlots: INetworkObject[] = [];

        // perform inventory update
        for (const craftingRecipeItem of itemsToRemove) {
            const result = this.inventoryController.removeCraftingRecipeItem(craftingRecipeItem);
            deletedSlots = [...deletedSlots, ...result.deletedSlots];
            modifiedSlots = [...modifiedSlots, ...result.modifiedSlots];
        }
        for (const item of itemsToAdd) {
            const result = this.inventoryController.addItem(item);
            if (result.updatedItem) {
                updatedItems = [...updatedItems, result.updatedItem];
            }
            stackableSlots = [...stackableSlots, ...result.stackableSlots];
        }

        // update construction
        this.houses = [
            ...this.houses.filter((house) => !housesToRemove.some((h) => h.id === house.id)),
            ...housesToAdd,
        ];
        this.floors = [
            ...this.floors.filter((floor) => !floorsToRemove.some((f) => f.id === floor.id)),
            ...floorsToAdd,
        ];
        this.walls = [...this.walls.filter((wall) => !wallsToRemove.some((w) => w.id === wall.id)), ...wallsToAdd];

        return {
            housesToAdd,
            housesToRemove,
            floorsToAdd,
            floorsToRemove,
            wallsToAdd,
            wallsToRemove,
            deletedSlots,
            modifiedSlots,
            updatedItems,
            stackableSlots,
        };
    }

    public getState(): IConstructionControllerState {
        return {
            inventoryHolder: {
                ...this.inventoryHolder,
                ...this.inventoryController.getState(),
            },
            houses: this.houses,
            floors: this.floors,
            walls: this.walls,
        };
    }

    public getConstructionRequest(location: IObject): IApiPersonsConstructionPost {
        return {
            personId: this.inventoryHolder.id,
            location,
        };
    }
}
