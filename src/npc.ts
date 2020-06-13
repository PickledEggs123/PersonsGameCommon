import {
    ENpcJobType,
    ICraftingRecipe,
    IHouse,
    IInventoryHolder,
    IInventoryState,
    INetworkObject,
    INetworkObjectBase,
    INetworkObjectState,
    INpc,
    INpcJobCrafting,
    INpcPathPoint,
    IResource,
    IStockpile,
} from './types/GameTypes';
import { HarvestResourceController } from './resources';
import { getMaxStackSize, InventoryController, listOfRecipes } from './inventory';

/**
 * The input of the [[CellController]] which controls all npcs within a cell, collaboratively.
 */
export interface ICellControllerParams {
    /**
     * A list of npcs within the cell.
     */
    npcs: INpc[];
    /**
     * A list of resources like trees for the NPC to cut down.
     */
    resources: IResource[];
    /**
     * A list of houses that the NPCs live in.
     */
    houses: IHouse[];
    /**
     * A list of objects on the ground for the NPCs to pick up.
     */
    objects: INetworkObject[];
    /**
     * A list of stockpiles near the NPC. NPCs will store and retrieve items from stockpiles.
     */
    stockpiles: IStockpile[];
}

/**
 * Represent an event where an object is ready to be used.
 */
interface ISimulationEvent<T extends INpc> {
    /**
     * When an object is ready to be used.
     */
    readyTime: Date;
    /**
     * The object to be used.
     */
    data: T;
}

/**
 * An event for a resource node.
 */
interface IResourceEvent {
    resourceId: string;
    state: Partial<IResource>;
    time: Date;
}

/**
 * The state of the simulation. Used as a priority queue to sort events by when they happen first. This will allow the
 * controller to loop through events which happen first, schedule new events, and repeat.
 */
interface ICellSimulationState {
    /**
     * Npc Events.
     */
    npcs: ISimulationEvent<INpc>[];
    resources: IResource[];
    spawns: ISpawnEvent[];
    resourceEvents: { [objectId: string]: IResourceEvent[] };
    networkObjectEvents: { [objectId: string]: INetworkObjectEvent[] };
    npcInventoryEvents: { [objectId: string]: INpcInventoryEvent[] };
    stockpiles: IStockpile[];
    stockpileInventoryEvents: { [objectId: string]: IStockpileInventoryEvent[] };
}

/**
 * The result of an NPC walking.
 */
interface INpcWalkResult {
    /**
     * The number of milliseconds the action will occur for.
     */
    duration: number;
    /**
     * The path of the npc during the action.
     */
    path: INpcPathPoint[];
}

/**
 * An event where an NPC picked up an item and the NPC inventory must be updated.
 */
interface INpcInventoryEvent {
    /**
     * The id of the NPC which picked up an item and the inventory must be updated.
     */
    npcId: string;
    /**
     * The time of the item being picked up.
     */
    time: Date;
    /**
     * The new content of the NPC inventory.
     */
    state: IInventoryState;
}

/**
 * A stockpile inventory change event.
 */
interface IStockpileInventoryEvent {
    /**
     * The id of the stockpile affected.
     */
    stockpileId: string;
    /**
     * The time of the event.
     */
    time: Date;
    /**
     * The event data.
     */
    state: IInventoryState;
}

/**
 * Represent an item being spawned after a resource is harvested.
 */
interface ISpawnEvent {
    /**
     * The time of spawning the item.
     */
    time: Date;
    /**
     * The item that was spawned.
     */
    spawn: INetworkObject;
}

interface INetworkObjectEvent {
    /**
     * The id of the affected object.
     */
    objectId: string;
    /**
     * The time of the network object being modified.
     */
    time: Date;
    /**
     * The modification to the network object.
     */
    state: INetworkObjectState<INetworkObject>;
}

/**
 * An array of documents to save to the database. Contains the final state of the cell.
 */
export interface ICellFinalState {
    /**
     * The final NPCs of the cell.
     */
    npcs: INpc[];
    /**
     * The final resources of the cell.
     */
    resources: IResource[];
    /**
     * The final objects of the cell.
     */
    objects: INetworkObject[];
    /**
     * The final stockpiles of the cell.
     */
    stockpiles: IStockpile[];
}

/**
 * Interpolate path data onto the npc position.
 * @param npc The npc with path data.
 */
const internalApplyPathToNpc = (npc: INpc): INpc => {
    // get the current time, used to interpolate the npc
    const now = new Date();

    // determine if there is path data
    const firstPoint = npc.path[0];
    if (firstPoint && +now > Date.parse(firstPoint.time)) {
        // there is path information and the path started

        // a path is made of an array of points. We want to interpolate two points forming a line segment.
        // find point b in array of points, it's the second point
        const indexOfPointB = npc.path.findIndex((p) => Date.parse(p.time) > +now);
        if (indexOfPointB >= 0) {
            // not past last path yet, interpolate point a to point b
            const a = npc.path[indexOfPointB - 1];
            const b = npc.path[indexOfPointB];
            if (a && b) {
                const pointA = a.location;
                const pointB = b.location;
                const timeA = Date.parse(a.time);
                const timeB = Date.parse(b.time);

                const dx = pointB.x - pointA.x;
                const dy = pointB.y - pointA.y;
                const dt = timeB - timeA;
                const t = (+now - timeA) / dt;
                const x = pointA.x + dx * t;
                const y = pointA.y + dy * t;

                return {
                    ...npc,
                    x,
                    y,
                    path: [],
                };
            } else {
                // missing points a and b
                return npc;
            }
        } else {
            // past last point, path data is over
            const lastPoint = npc.path[npc.path.length - 1];
            if (lastPoint) {
                // draw npc at last location
                const { x, y } = lastPoint.location;
                return {
                    ...npc,
                    x,
                    y,
                    path: [],
                };
            } else {
                // cannot find last location, return original npc
                return npc;
            }
        }
    } else {
        // no path information, return original npc
        return npc;
    }
};

/**
 * Apply a single inventory state
 * @param all If all inventory states should be applied.
 * @param now The current now time to apply inventory state with.
 * @param acc The accumulated inventory holder.
 * @param inventoryState The inventory state event to apply.
 */
const internalApplyOneInventoryState = <T extends INpc | IStockpile>(
    all: boolean,
    now: Date,
    acc: T,
    inventoryState: IInventoryState,
): T => {
    if (all || +now >= Date.parse(inventoryState.time)) {
        return {
            ...acc,
            inventory: {
                ...acc.inventory,
                rows: typeof inventoryState.rows === 'number' ? inventoryState.rows : acc.inventory.rows,
                columns: typeof inventoryState.columns === 'number' ? inventoryState.columns : acc.inventory.columns,
                slots: [
                    ...acc.inventory.slots
                        .filter((slot) => {
                            return (
                                !inventoryState.remove.includes(slot.id) &&
                                !inventoryState.add.some((s) => s.id === slot.id)
                            );
                        })
                        .map((slot) => {
                            const matchingModify = inventoryState.modified.find((o) => o.id === slot.id);
                            if (matchingModify) {
                                return matchingModify;
                            } else {
                                return slot;
                            }
                        }),
                    ...inventoryState.add,
                ],
            },
        };
    } else {
        return acc;
    }
};

/**
 * Apply inventory state updates over time. The npc will store a list of inventory changes as it will pick
 * items up over time. Each NPC tick (npc logic) is 1 minute long. Each web page refresh is 2 seconds long. A
 * list of inventory states is required to smoothly interpolate npc data in between the large npc logic tick
 * and page refresh.
 * @param npc The npc with inventory state to interpolate.
 * @param all
 */
const internalApplyInventoryState = <T extends INpc | IStockpile>(npc: T, all: boolean): T => {
    const now = new Date();
    return npc.inventoryState.reduce((acc: T, inventoryState: IInventoryState): T => {
        return internalApplyOneInventoryState(all, now, acc, inventoryState);
    }, npc);
};

/**
 * Apply inventory state updates over time. The npc will store a list of inventory changes as it will pick
 * items up over time. Each NPC tick (npc logic) is 1 minute long. Each web page refresh is 2 seconds long. A
 * list of inventory states is required to smoothly interpolate npc data in between the large npc logic tick
 * and page refresh.
 * @param npc The npc with inventory state to interpolate.
 */
export const applyInventoryState = <T extends INpc | IStockpile>(npc: T): T => {
    const finalState = internalApplyInventoryState(npc, false);
    return {
        ...finalState,
        inventoryState: [],
    };
};

export const applyFutureInventoryState = <T extends INpc | IStockpile>(npc: T): T => {
    return internalApplyInventoryState(npc, true);
};

export const applyOneInventoryState = <T extends INpc | IStockpile>(npc: T, inventoryState: IInventoryState): T => {
    const now = new Date();
    const all = true;
    return internalApplyOneInventoryState(all, now, npc, inventoryState);
};

/**
 * Interpolate npc data.
 * @param npc The npc to interpolate to current time, now.
 */
export const applyPathToNpc = (npc: INpc): INpc => {
    return internalApplyPathToNpc(applyInventoryState(npc));
};

/**
 * Apply the interpolated state updates onto the network object. An object can be loaded with multiple state changes
 * over time. The UI can update the object using the object information without having to receive network updates.
 * @param networkObject The object containing state updates.
 */
export const applyStateToNetworkObject = (networkObject: INetworkObject): INetworkObject => {
    const now = +new Date();
    const finalState = networkObject.state.reduce(
        (acc: INetworkObject, state: INetworkObjectState<INetworkObject>): INetworkObject => {
            if (now >= Date.parse(state.time)) {
                return {
                    ...acc,
                    ...state.state,
                };
            } else {
                return acc;
            }
        },
        networkObject,
    );
    return {
        ...finalState,
    };
};

/**
 * Apply the interpolated state updates onto the network object. An object can be loaded with multiple state changes
 * over time. The UI can update the object using the object information without having to receive network updates.
 * @param resource The object containing state updates.
 */
export const applyStateToResource = (resource: IResource): IResource => {
    const now = +new Date();
    const finalState = resource.state.reduce((acc: IResource, state: INetworkObjectState<IResource>): IResource => {
        if (now >= Date.parse(state.time)) {
            return {
                ...acc,
                ...state.state,
            };
        } else {
            return acc;
        }
    }, resource);
    return {
        ...finalState,
        state: [],
    };
};

export class CellController {
    /**
     * The initial list of npcs.
     */
    private npcs: { [id: string]: INpc };
    /**
     * The initial list of resources.
     */
    private resources: { [id: string]: IResource };
    /**
     * The initial list of houses.
     */
    private houses: { [id: string]: IHouse };
    /**
     * The initial list of objects.
     */
    private objects: { [id: string]: INetworkObject };
    /**
     * The initial list of stockpiles.
     */
    private stockpiles: { [id: string]: IStockpile };

    /**
     * The state of the cell run.
     */
    private state: ICellSimulationState = {
        npcs: [],
        resources: [],
        spawns: [],
        resourceEvents: {},
        networkObjectEvents: {},
        npcInventoryEvents: {},
        stockpiles: [],
        stockpileInventoryEvents: {},
    };

    /**
     * The start time of the cell run.
     */
    private startTime: Date;
    /**
     * The current time of the simulation since startTime.
     */
    private currentMilliseconds: number;

    constructor({ npcs, resources, houses, objects, stockpiles }: ICellControllerParams) {
        this.npcs = npcs.reduce((acc: { [id: string]: INpc }, npc) => {
            return {
                ...acc,
                [npc.id]: applyPathToNpc(npc),
            };
        }, {});
        this.resources = resources.reduce((acc: { [id: string]: IResource }, resource) => {
            return {
                ...acc,
                [resource.id]: applyStateToResource(resource),
            };
        }, {});
        this.houses = houses.reduce((acc: { [id: string]: IHouse }, house) => {
            return {
                ...acc,
                [house.npcId]: {
                    ...house,
                },
            };
        }, {});
        this.objects = objects.reduce((acc: { [id: string]: INetworkObject }, obj) => {
            return {
                ...acc,
                [obj.id]: applyStateToNetworkObject(obj),
            };
        }, {});
        this.stockpiles = stockpiles.reduce((acc: { [id: string]: IStockpile }, obj) => {
            return {
                ...acc,
                [obj.id]: applyInventoryState(obj),
            };
        }, {});

        this.startTime = new Date();
        this.currentMilliseconds = 0;
    }

    /**
     * Load the initial state of the simulation.
     */
    private setupState() {
        this.state = {
            npcs: Object.values(this.npcs).map((npc) => {
                return {
                    readyTime: new Date(Date.parse(npc.readyTime)),
                    data: applyPathToNpc(npc),
                };
            }),
            resources: Object.values(this.resources).map((resource) => applyStateToResource(resource)),
            spawns: [],
            resourceEvents: {},
            networkObjectEvents: {},
            npcInventoryEvents: {},
            stockpiles: Object.values(this.stockpiles).map((stockpile) => applyInventoryState(stockpile)),
            stockpileInventoryEvents: {},
        };
        this.startTime = new Date();
        this.currentMilliseconds = 0;
    }

    private static newestSimulationEvent(a: ISimulationEvent<any>, b: ISimulationEvent<any>): number {
        return +a.readyTime - +b.readyTime;
    }

    private sortEvents() {
        this.state.npcs = this.state.npcs.sort(CellController.newestSimulationEvent);
    }

    private static hasInventorySpace(inventoryHolder: IInventoryHolder) {
        const maxSlots: number = inventoryHolder.inventory.rows * inventoryHolder.inventory.columns;
        return inventoryHolder.inventory.slots.length < maxSlots;
    }

    private static hasRecipeItems(recipe: ICraftingRecipe, amount: number, inventoryHolder: IInventoryHolder) {
        // check for each recipe item
        return recipe.items
            .map((item) => {
                // count the number of items in inventory which match the recipe item
                const numItems = inventoryHolder.inventory.slots.reduce((acc: number, slot): number => {
                    if (slot.objectType === item.item) {
                        return acc + slot.amount;
                    } else {
                        return acc;
                    }
                }, 0);
                // the number of inventory items is greater than requested recipe item amount
                return numItems > item.quantity * amount;
            })
            .every((item) => item);
    }

    private static hasItemInInventory(npc: IInventoryHolder) {
        return npc.inventory.slots.length > 0;
    }

    private isNpcReady(npc: INpc) {
        return +this.startTime + this.currentMilliseconds >= Date.parse(npc.readyTime);
    }

    private isResourceReady(resource: IResource) {
        const ready: boolean = +this.startTime + this.currentMilliseconds >= Date.parse(resource.readyTime);
        return !resource.depleted || ready;
    }

    private getFirstEventIndex(): number {
        if (this.state.npcs.length <= 0) {
            return -1;
        } else {
            return this.state.npcs.findIndex((npcEvent) => this.isNpcReady(npcEvent.data));
        }
    }

    private static distance(a: INetworkObjectBase, b: INetworkObjectBase): number {
        return Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    }

    private static byDistance(npc: INetworkObjectBase, a: INetworkObjectBase, b: INetworkObjectBase) {
        return CellController.distance(npc, a) - CellController.distance(npc, b);
    }

    private getNextResourceIndex(npc: INpc): number {
        return this.state.resources
            .sort(CellController.byDistance.bind(this, npc))
            .findIndex(this.isResourceReady.bind(this));
    }

    /**
     * Generate a path of the npc walking towards a resource.
     * @param npc
     * @param resource
     */
    private generatePathToResource(npc: INpc, resource: INetworkObjectBase): INpcWalkResult {
        const path: INpcPathPoint[] = [];
        let timeSinceTraveling: number = 0;

        // the starting point of the npc
        const initialPoint: INpcPathPoint = {
            time: new Date(+this.startTime + this.currentMilliseconds).toISOString(),
            location: {
                x: npc.x,
                y: npc.y,
            },
        };
        path.push(initialPoint);

        // change y coordinate
        const yDelta: number = resource.y - npc.y;
        const yDistance: number = Math.abs(yDelta);
        if (yDistance > 0) {
            timeSinceTraveling += yDistance * 10;
            const yChangePoint: INpcPathPoint = {
                time: new Date(+this.startTime + this.currentMilliseconds + timeSinceTraveling).toISOString(),
                location: {
                    x: npc.x,
                    y: npc.y + yDelta,
                },
            };
            path.push(yChangePoint);
        }

        // change x coordinate
        const xDelta: number = resource.x - npc.x;
        const xDistance: number = Math.abs(xDelta);
        if (xDistance > 0) {
            timeSinceTraveling += xDistance * 10;
            const xChangePoint: INpcPathPoint = {
                time: new Date(+this.startTime + this.currentMilliseconds + timeSinceTraveling).toISOString(),
                location: {
                    x: npc.x + xDelta,
                    y: npc.y + yDelta,
                },
            };
            path.push(xChangePoint);
        }

        return {
            duration: timeSinceTraveling,
            path,
        };
    }

    /**
     * The amount of time the NPC should pause after reaching destination.
     */
    public static WAIT_TIME_AFTER_WALKING: number = 2000;
    /**
     * The amount of time the NPC should pause after picking up an item.
     */
    public static WAIT_TIME_AFTER_PICK_UP: number = 2000;

    private walkNpcTowardsLocation({
        npcEvent,
        firstEventIndex,
        location,
    }: {
        npcEvent: ISimulationEvent<INpc>;
        firstEventIndex: number;
        location: INetworkObjectBase;
    }): {
        duration: number;
        npcReadyTime: Date;
        npcEvent: ISimulationEvent<INpc>;
    } {
        // update npc to walk towards resource point
        const { path, duration } = this.generatePathToResource(npcEvent.data, location);
        const npcReadyTime: Date = new Date(
            +this.startTime +
                this.currentMilliseconds +
                duration +
                CellController.WAIT_TIME_AFTER_WALKING +
                CellController.WAIT_TIME_AFTER_PICK_UP,
        );
        npcEvent = {
            ...npcEvent,
            data: {
                ...npcEvent.data,
                path: [...npcEvent.data.path, ...path],
                x: path[path.length - 1].location.x,
                y: path[path.length - 1].location.y,
                readyTime: npcReadyTime.toISOString(),
            },
            readyTime: npcReadyTime,
        };
        this.state.npcs[firstEventIndex] = npcEvent;

        return {
            duration,
            npcReadyTime,
            npcEvent,
        };
    }

    private addNetworkObjectEvent(objectId: string, event: INetworkObjectEvent) {
        if (this.state.networkObjectEvents[objectId]) {
            this.state.networkObjectEvents[objectId].push(event);
        } else {
            this.state.networkObjectEvents[objectId] = [event];
        }
    }

    private addNpcInventoryEvent(npcId: string, event: INpcInventoryEvent) {
        if (this.state.npcInventoryEvents[npcId]) {
            this.state.npcInventoryEvents[npcId].push(event);
        } else {
            this.state.npcInventoryEvents[npcId] = [event];
        }
    }

    private addStockpileInventoryEvent(stockpileId: string, event: IStockpileInventoryEvent) {
        if (this.state.stockpileInventoryEvents[stockpileId]) {
            this.state.stockpileInventoryEvents[stockpileId].push(event);
        } else {
            this.state.stockpileInventoryEvents[stockpileId] = [event];
        }
    }

    private addResourceEvent(resourceId: string, event: IResourceEvent) {
        if (this.state.resourceEvents[resourceId]) {
            this.state.resourceEvents[resourceId].push(event);
        } else {
            this.state.resourceEvents[resourceId] = [event];
        }
    }

    /**
     * Create all events required to spawn an item.
     * @param spawn The item to spawn.
     * @param time The time the item was spawned.
     */
    private spawnItem(spawn: INetworkObject, time: Date): { spawnEvent: ISpawnEvent } {
        const spawnedItemEvent: INetworkObjectEvent = {
            objectId: spawn.id,
            time,
            state: {
                time: time.toISOString(),
                state: {
                    exist: true,
                },
            },
        };
        const spawnEvent: ISpawnEvent = {
            time,
            spawn: {
                ...spawn,
                exist: false,
                state: [spawnedItemEvent.state],
            },
        };
        this.state.spawns.push(spawnEvent);
        this.addNetworkObjectEvent(spawn.id, spawnedItemEvent);
        return {
            spawnEvent,
        };
    }

    /**
     * The collect resources routine for NPCs. Will perform all steps required when collecting resources.
     * @param npcEvent
     * @param firstEventIndex
     */
    private collectResources({
        npcEvent,
        firstEventIndex,
    }: {
        npcEvent: ISimulationEvent<INpc>;
        firstEventIndex: number;
    }) {
        // find ready resources
        const nextResourceIndex = this.getNextResourceIndex(npcEvent.data);
        if (nextResourceIndex < 0) {
            // did not find a ready resource, increment time by 1000 milliseconds
            this.currentMilliseconds += 1000;
            return;
        }
        const nextResource: IResource = this.state.resources[nextResourceIndex];

        // walk towards resource
        const { duration, npcReadyTime, npcEvent: npcEventWithPath } = this.walkNpcTowardsLocation({
            npcEvent,
            firstEventIndex,
            location: nextResource,
        });
        npcEvent = npcEventWithPath;

        // harvest resource point
        {
            // harvest resource
            const controller = new HarvestResourceController(nextResource);
            const { spawn, respawnTime } = controller.spawn();

            // the times of the resource node being harvested and respawning and picking up resource
            const harvestedTime: Date = new Date(
                +this.startTime + this.currentMilliseconds + duration + CellController.WAIT_TIME_AFTER_WALKING,
            );
            const respawnedTime: Date = new Date(+harvestedTime + respawnTime);
            const pickUpTime: Date = new Date(+harvestedTime + CellController.WAIT_TIME_AFTER_PICK_UP);

            // the harvested state of the resource node
            const harvestedState: Partial<IResource> = {
                spawnState: controller.saveState(),
                depleted: true,
                readyTime: respawnedTime.toISOString(),
            };
            // the ready state of the resource node
            const respawnedState: Partial<IResource> = {
                depleted: false,
            };

            // update resources
            this.state.resources[nextResourceIndex] = {
                ...nextResource,
                ...harvestedState,
            };

            // drop item
            const { spawnEvent } = this.spawnItem(spawn, harvestedTime);

            // create two resource events, one harvested and one ready
            const resourceId = nextResource.id;
            const harvestedEvent: IResourceEvent = {
                resourceId,
                state: harvestedState,
                time: harvestedTime,
            };
            const respawnEvent: IResourceEvent = {
                resourceId,
                state: respawnedState,
                time: respawnedTime,
            };
            this.addResourceEvent(resourceId, harvestedEvent);
            this.addResourceEvent(resourceId, respawnEvent);

            const inventoryController = new InventoryController(npcEvent.data);
            const { updatedItem, stackableSlots } = inventoryController.pickUpItem(spawnEvent.spawn);
            if (updatedItem) {
                // inventory picked up item
                const pickUpEvent: INetworkObjectEvent = {
                    objectId: spawn.id,
                    time: pickUpTime,
                    state: {
                        time: pickUpTime.toISOString(),
                        state: {
                            isInInventory: true,
                            grabbedByNpcId: npcEvent.data.id,
                        },
                    },
                };
                this.addNetworkObjectEvent(spawn.id, pickUpEvent);
                spawnEvent.spawn.state = [...spawnEvent.spawn.state, pickUpEvent.state];
            } else {
                // inventory merged item with existing object stack
                for (const stackableSlot of stackableSlots) {
                    const mergeItemEvent: INetworkObjectEvent = {
                        objectId: stackableSlot.id,
                        time: pickUpTime,
                        state: {
                            time: pickUpTime.toISOString(),
                            state: {
                                ...stackableSlot,
                            },
                        },
                    };
                    this.addNetworkObjectEvent(stackableSlot.id, mergeItemEvent);
                }

                // inventory picked up item
                const destroyState: INetworkObjectState<INetworkObject> = {
                    time: pickUpTime.toISOString(),
                    state: {
                        exist: false,
                    },
                };
                spawnEvent.spawn.state.push(destroyState);
            }

            // update the npc inventory of the object that was just picked up.
            const npcInventoryEvent: INpcInventoryEvent = {
                npcId: npcEvent.data.id,
                time: pickUpTime,
                state: {
                    time: pickUpTime.toISOString(),
                    add: updatedItem ? [updatedItem] : [],
                    modified: stackableSlots,
                    remove: [],
                },
            };
            this.addNpcInventoryEvent(npcEvent.data.id, npcInventoryEvent);

            // update npc to pick up item
            npcEvent = {
                ...npcEvent,
                data: {
                    ...npcEvent.data,
                    inventory: {
                        ...npcEvent.data.inventory,
                    },
                    inventoryState: [...npcEvent.data.inventoryState, npcInventoryEvent.state],
                    readyTime: npcReadyTime.toISOString(),
                },
                readyTime: npcReadyTime,
            };
            npcEvent = {
                ...npcEvent,
                data: applyOneInventoryState(npcEvent.data, npcInventoryEvent.state),
            };
            this.state.npcs[firstEventIndex] = npcEvent;
        }
    }

    /**
     * Run all npcs and objects within the cell for a specified amount of milliseconds.
     * @param maxMilliseconds The amount of time to run the cell for.
     */
    public run(maxMilliseconds: number) {
        // setup cell simulation
        this.setupState();

        // run until max milliseconds
        while (this.currentMilliseconds < maxMilliseconds) {
            // get first event to happen
            this.sortEvents();
            const firstEventIndex = this.getFirstEventIndex();
            if (firstEventIndex < 0) {
                // no npcs ready, skip time
                this.currentMilliseconds += 1000;
                continue;
            }
            const npcEvent: ISimulationEvent<INpc> = this.state.npcs[firstEventIndex];

            if (npcEvent.data.job.type === ENpcJobType.GATHER) {
                this.handleGatherJob({
                    npcEvent,
                    firstEventIndex,
                });
            } else if (npcEvent.data.job.type === ENpcJobType.CRAFT) {
                this.handleCraftJob({
                    npcEvent,
                    firstEventIndex,
                });
            } else {
                this.npcGoHome({
                    npcEvent,
                    firstEventIndex,
                });
            }
        }
    }
    getState(): ICellFinalState {
        // update npcs by removing long path arrays
        const npcs: INpc[] = this.state.npcs.map(
            (npcEvent): INpc => {
                const npc = this.npcs[npcEvent.data.id];
                if (!npc) {
                    throw new Error('Cannot find initial copy of npc');
                }

                // slice old npc paths to avoid it from growing to large
                const firstRelevantPathPoint = npc.path.findIndex((p) => Date.parse(p.time) >= +this.startTime);
                let path: INpcPathPoint[];
                if (firstRelevantPathPoint <= 0) {
                    path = npcEvent.data.path;
                } else {
                    path = [...npc.path.slice(firstRelevantPathPoint - 1), ...npcEvent.data.path];
                }

                // get npc inventory events
                const relevantNpcInventoryEvents = this.state.npcInventoryEvents[npc.id] || [];
                const inventoryState: IInventoryState[] = relevantNpcInventoryEvents.map((event) => event.state);
                return {
                    ...npc,
                    path,
                    inventoryState,
                    lastUpdate: new Date().toISOString(),
                };
            },
        );

        // update npcs by removing long path arrays
        const stockpiles: IStockpile[] = this.state.stockpiles.map(
            (stockpile): IStockpile => {
                const initialStockpile = this.stockpiles[stockpile.id];
                if (!initialStockpile) {
                    throw new Error('Cannot find initial stockpile');
                }

                // get npc inventory events
                const relevantInventoryEvents = this.state.stockpileInventoryEvents[stockpile.id] || [];
                const now = new Date();
                const inventoryState: IInventoryState[] = [
                    ...initialStockpile.inventoryState.filter((event) => Date.parse(event.time) > +now),
                    ...relevantInventoryEvents.map((event) => event.state),
                ].sort((a, b) => +a.time - +b.time);
                return {
                    ...initialStockpile,
                    inventoryState,
                    lastUpdate: now.toISOString(),
                };
            },
        );

        const resources: IResource[] = this.state.resources.map((resource) => {
            const state: INetworkObjectState<IResource>[] = [
                ...(this.state.resourceEvents[resource.id] || []).map(
                    (resourceEvent): INetworkObjectState<IResource> => {
                        return {
                            time: resourceEvent.time.toISOString(),
                            state: resourceEvent.state,
                        };
                    },
                ),
            ];
            const initialResourceCopy = this.resources[resource.id];
            if (initialResourceCopy) {
                return {
                    ...initialResourceCopy,
                    state,
                    lastUpdate: new Date().toISOString(),
                };
            } else {
                throw new Error('Could not find initial resource');
            }
        });

        const objects: INetworkObject[] = [
            // add newly spawned items
            ...this.state.spawns.map(
                (spawnEvent): INetworkObject => {
                    const state = (this.state.networkObjectEvents[spawnEvent.spawn.id] || []).map((e) => e.state);
                    if (state.length === 0) {
                        throw new Error('Spawn Object Empty State');
                    }
                    return {
                        ...spawnEvent.spawn,
                        state,
                    };
                },
            ),
            // update modified old items
            ...Object.values(this.objects).map((obj) => {
                const objectEvents: INetworkObjectEvent[] = this.state.networkObjectEvents[obj.id] || [];
                const state: INetworkObjectState<INetworkObject>[] = [
                    // filter old state objects to prevent large arrays
                    ...obj.state.filter((s) => Date.parse(s.time) > +this.startTime),
                    // add new object states
                    ...objectEvents.map((event) => event.state),
                ];
                if (state.length === 0) {
                    throw new Error('Modified Object Empty State');
                }
                return {
                    ...applyStateToNetworkObject(obj),
                    state,
                    lastUpdate: new Date().toISOString(),
                };
            }),
        ];

        return {
            npcs,
            resources,
            objects,
            stockpiles,
        };
    }

    /**
     * NPC should store resources into stockpile. The second part of collecting resources is putting
     * them in one location that is easier to access.
     * @param npcEvent The NPC which has a full inventory and need to store resources into a stockpile.
     * @param firstEventIndex The index of the npc, used to modify npc itself in the array.
     * @param stockpile The stockpile to store items into.
     * @param stockpileIndex The stockpile index to update in the stockpiles array
     */
    private storeInStockpile({
        npcEvent,
        firstEventIndex,
        stockpile,
        stockpileIndex,
    }: {
        npcEvent: ISimulationEvent<INpc>;
        firstEventIndex: number;
        stockpile: IStockpile;
        stockpileIndex: number;
    }): {
        npcEvent: ISimulationEvent<INpc>;
    } {
        const { npcReadyTime, npcEvent: npcEventWithPath } = this.walkNpcTowardsLocation({
            npcEvent,
            firstEventIndex,
            location: stockpile,
        });
        npcEvent = npcEventWithPath;

        for (const item of npcEvent.data.inventory.slots) {
            stockpile = this.state.stockpiles[stockpileIndex];
            const npcInventoryController = new InventoryController(npcEvent.data);
            const stockpileInventoryController = new InventoryController(stockpile);

            // check to see if there is room to store more items into the stockpile
            const stockpileInventoryState = stockpileInventoryController.getInventory();
            const maxSlots = stockpileInventoryState.rows * stockpileInventoryState.columns;
            if (stockpileInventoryState.slots.length >= maxSlots) {
                // no room, end loop of placing item into inventory
                break;
            }

            // drop item
            const { updatedItem: npcItem } = npcInventoryController.dropItem(item);
            if (npcItem) {
                const dropItemEvent: INetworkObjectEvent = {
                    objectId: npcItem.id,
                    time: npcReadyTime,
                    state: {
                        time: npcReadyTime.toISOString(),
                        state: {
                            grabbedByNpcId: null,
                            isInInventory: false,
                        },
                    },
                };
                this.addNetworkObjectEvent(npcItem.id, dropItemEvent);
                const npcDropItemEvent: INpcInventoryEvent = {
                    npcId: npcEvent.data.id,
                    time: npcReadyTime,
                    state: {
                        time: npcReadyTime.toISOString(),
                        add: [],
                        modified: [],
                        remove: [npcItem.id],
                    },
                };
                this.addNpcInventoryEvent(npcEvent.data.id, npcDropItemEvent);
                npcEvent = {
                    ...npcEvent,
                    data: {
                        ...npcEvent.data,
                        inventoryState: [...npcEvent.data.inventoryState, npcDropItemEvent.state],
                    },
                };
                npcEvent = {
                    ...npcEvent,
                    data: applyOneInventoryState(npcEvent.data, npcDropItemEvent.state),
                };
                this.state.npcs[firstEventIndex] = npcEvent;

                // move item into stockpile
                const { updatedItem, stackableSlots } = stockpileInventoryController.insertIntoStockpile(npcItem);
                const stockpileEvent: IStockpileInventoryEvent = {
                    stockpileId: stockpile.id,
                    time: npcReadyTime,
                    state: {
                        time: npcReadyTime.toISOString(),
                        add: updatedItem ? [updatedItem] : [],
                        modified: stackableSlots,
                        remove: [],
                    },
                };
                this.addStockpileInventoryEvent(stockpile.id, stockpileEvent);
                this.state.stockpiles[stockpileIndex] = applyOneInventoryState(
                    {
                        ...stockpile,
                        inventoryState: [...stockpile.inventoryState, stockpileEvent.state],
                    },
                    stockpileEvent.state,
                );
                if (updatedItem) {
                    const moveToStockpileEvent: INetworkObjectEvent = {
                        objectId: updatedItem.id,
                        time: npcReadyTime,
                        state: {
                            time: npcReadyTime.toISOString(),
                            state: {
                                isInInventory: true,
                                insideStockpile: stockpile.id,
                            },
                        },
                    };
                    this.addNetworkObjectEvent(updatedItem.id, moveToStockpileEvent);
                } else {
                    const destroyOriginalItem: INetworkObjectEvent = {
                        objectId: npcItem.id,
                        time: npcReadyTime,
                        state: {
                            time: npcReadyTime.toISOString(),
                            state: {
                                exist: false,
                            },
                        },
                    };
                    this.addNetworkObjectEvent(npcItem.id, destroyOriginalItem);

                    for (const slot of stackableSlots) {
                        const modifyStackedItem: INetworkObjectEvent = {
                            objectId: slot.id,
                            time: npcReadyTime,
                            state: {
                                time: npcReadyTime.toISOString(),
                                state: {
                                    amount: slot.amount,
                                },
                            },
                        };
                        this.addNetworkObjectEvent(slot.id, modifyStackedItem);
                    }
                }
            }
        }
        return {
            npcEvent,
        };
    }

    /**
     * NPC should withdraw resources from stockpile. The first part of crafting is getting the resources to craft with.
     * @param npcEvent The NPC which will withdraw the resources.
     * @param firstEventIndex The index of the npc, used to modify npc itself in the array.
     * @param stockpile The stockpile to withdraw from
     * @param stockpileIndex The stockpile index to update in the stockpiles array
     * @param recipe The recipe to withdraw, containing a list of all items to withdraw.
     * @param amountRecipes The amount of the recipe to withdraw, ie. withdrawing 5 copies of the recipe.
     */
    private withdrawFromStockpile({
        npcEvent,
        firstEventIndex,
        stockpile,
        stockpileIndex,
        recipe,
        amountRecipes,
    }: {
        npcEvent: ISimulationEvent<INpc>;
        firstEventIndex: number;
        stockpile: IStockpile;
        stockpileIndex: number;
        recipe: ICraftingRecipe;
        amountRecipes: number;
    }): {
        npcEvent: ISimulationEvent<INpc>;
    } {
        // walk towards stockpile
        const { npcReadyTime, npcEvent: npcEventWithPath } = this.walkNpcTowardsLocation({
            npcEvent,
            firstEventIndex,
            location: stockpile,
        });
        npcEvent = npcEventWithPath;

        // for each recipe item, withdraw resource for part of the recipe
        for (const recipeItem of recipe.items) {
            stockpile = this.state.stockpiles[stockpileIndex];
            const npcInventoryController = new InventoryController(npcEvent.data);
            const stockpileInventoryController = new InventoryController(stockpile);

            // determine the withdraw amounts to withdraw all resources, will take multiple withdraws for the same item
            // there is a withdraw limit which is max stack size
            const withdrawAmounts: number[] = [];
            {
                let withdrawAmountLeft: number = recipeItem.quantity * amountRecipes;
                while (withdrawAmountLeft > 0) {
                    const withdrawAmount = Math.min(withdrawAmountLeft, getMaxStackSize(recipeItem.item));
                    withdrawAmountLeft -= withdrawAmount;
                    withdrawAmounts.push(withdrawAmount);
                }
            }

            // for each withdraw amount
            for (const withdrawAmount of withdrawAmounts) {
                // determine relevant slots to withdraw from
                const slotAmountPairs = stockpile.inventory.slots.reduce(
                    (acc: { amount: number; slot: INetworkObject }[], slot: INetworkObject) => {
                        if (slot.objectType === recipeItem.item) {
                            const amountLeft =
                                withdrawAmount -
                                acc.reduce((acc1: number, accItem): number => {
                                    return acc1 + accItem.amount;
                                }, 0);
                            const amountToWithdrawForSlot = Math.min(slot.amount, amountLeft);
                            if (amountToWithdrawForSlot > 0) {
                                return [
                                    ...acc,
                                    {
                                        amount: amountToWithdrawForSlot,
                                        slot,
                                    },
                                ];
                            }
                        }
                        return acc;
                    },
                    [],
                );

                // for each pair of slot and amount
                for (const slotAmountPair of slotAmountPairs) {
                    const amountToWithdraw = slotAmountPair.amount;
                    const slotToWithdraw = slotAmountPair.slot;

                    // withdraw item
                    const { updatedItem: withdrawnItem } = stockpileInventoryController.withdrawFromStockpile(
                        slotToWithdraw,
                        amountToWithdraw,
                    );
                    if (withdrawnItem) {
                        const stockpileEvent: IStockpileInventoryEvent = {
                            stockpileId: stockpile.id,
                            time: npcReadyTime,
                            state: {
                                time: npcReadyTime.toISOString(),
                                add: [],
                                modified: [],
                                remove: [withdrawnItem.id],
                            },
                        };
                        this.addStockpileInventoryEvent(stockpile.id, stockpileEvent);
                        this.state.stockpiles[stockpileIndex] = applyOneInventoryState(
                            {
                                ...stockpile,
                                inventoryState: [...stockpile.inventoryState, stockpileEvent.state],
                            },
                            stockpileEvent.state,
                        );
                        const withdrawnFromStockpileEvent: INetworkObjectEvent = {
                            objectId: withdrawnItem.id,
                            time: npcReadyTime,
                            state: {
                                time: npcReadyTime.toISOString(),
                                state: {
                                    isInInventory: false,
                                    insideStockpile: null,
                                },
                            },
                        };
                        this.addNetworkObjectEvent(withdrawnItem.id, withdrawnFromStockpileEvent);

                        // pickup item
                        const { updatedItem, stackableSlots } = npcInventoryController.pickUpItem(withdrawnItem);
                        const pickUpItemEvent: INetworkObjectEvent = {
                            objectId: withdrawnItem.id,
                            time: npcReadyTime,
                            state: {
                                time: npcReadyTime.toISOString(),
                                state: {
                                    grabbedByNpcId: npcEvent.data.id,
                                    isInInventory: true,
                                },
                            },
                        };
                        this.addNetworkObjectEvent(withdrawnItem.id, pickUpItemEvent);
                        const npcPickUpItemEvent: INpcInventoryEvent = {
                            npcId: npcEvent.data.id,
                            time: npcReadyTime,
                            state: {
                                time: npcReadyTime.toISOString(),
                                add: updatedItem ? [updatedItem] : [],
                                modified: stackableSlots,
                                remove: [],
                            },
                        };
                        this.addNpcInventoryEvent(npcEvent.data.id, npcPickUpItemEvent);
                        npcEvent = {
                            ...npcEvent,
                            data: {
                                ...npcEvent.data,
                                inventoryState: [...npcEvent.data.inventoryState, npcPickUpItemEvent.state],
                            },
                        };
                        npcEvent = {
                            ...npcEvent,
                            data: applyOneInventoryState(npcEvent.data, npcPickUpItemEvent.state),
                        };
                        this.state.npcs[firstEventIndex] = npcEvent;
                    }
                }
            }
        }
        return {
            npcEvent,
        };
    }

    /**
     * The npc has nothing to do, go home.
     * @param npcEvent The npc data.
     * @param firstEventIndex The index of the npc data, used to modify array.
     */
    private npcGoHome({
        npcEvent,
        firstEventIndex,
    }: {
        npcEvent: ISimulationEvent<INpc>;
        firstEventIndex: number;
    }): {
        duration: number;
        npcReadyTime: Date;
        npcEvent: ISimulationEvent<INpc>;
    } {
        const home = this.houses[npcEvent.data.id];
        if (!home) {
            throw new Error('Could not find a house for the NPC to go home to');
        }
        return this.walkNpcTowardsLocation({
            npcEvent,
            firstEventIndex,
            location: home,
        });
    }

    private findAndStoreInStockpile({
        npcEvent,
        firstEventIndex,
    }: {
        npcEvent: ISimulationEvent<INpc>;
        firstEventIndex: number;
    }): {
        foundStockpile: boolean;
        npcEvent: ISimulationEvent<INpc>;
    } {
        // check for empty stockpiles
        const stockpileIndex = this.state.stockpiles
            .sort(CellController.byDistance.bind(this, npcEvent.data))
            .findIndex(CellController.hasInventorySpace.bind(this));
        const stockpile = this.state.stockpiles[stockpileIndex];
        if (stockpile) {
            // store in stockpile
            const result = this.storeInStockpile({
                npcEvent,
                firstEventIndex,
                stockpile,
                stockpileIndex,
            });
            return {
                foundStockpile: true,
                npcEvent: result.npcEvent,
            };
        } else {
            return {
                foundStockpile: false,
                npcEvent,
            };
        }
    }

    private findAndWithdrawFromStockpile({
        npcEvent,
        firstEventIndex,
        recipe,
        amountRecipes,
    }: {
        npcEvent: ISimulationEvent<INpc>;
        firstEventIndex: number;
        recipe: ICraftingRecipe;
        amountRecipes: number;
    }): {
        foundStockpile: boolean;
        npcEvent: ISimulationEvent<INpc>;
    } {
        // check for empty stockpiles
        const stockpileIndex = this.state.stockpiles
            .sort(CellController.byDistance.bind(this, npcEvent.data))
            .findIndex(CellController.hasRecipeItems.bind(this, recipe, amountRecipes));
        const stockpile = this.state.stockpiles[stockpileIndex];
        if (stockpile) {
            // store in stockpile
            const result = this.withdrawFromStockpile({
                npcEvent,
                firstEventIndex,
                stockpile,
                stockpileIndex,
                recipe,
                amountRecipes,
            });
            return {
                foundStockpile: true,
                npcEvent: result.npcEvent,
            };
        } else {
            return {
                foundStockpile: false,
                npcEvent,
            };
        }
    }

    private handleGatherJob({
        npcEvent,
        firstEventIndex,
    }: {
        npcEvent: ISimulationEvent<INpc>;
        firstEventIndex: number;
    }) {
        // check to see if npc has inventory space
        if (CellController.hasInventorySpace(npcEvent.data)) {
            // fetch resource
            this.collectResources({
                npcEvent,
                firstEventIndex,
            });
        } else {
            const result = this.findAndStoreInStockpile({
                npcEvent,
                firstEventIndex,
            });
            if (!result.foundStockpile) {
                this.npcGoHome({
                    npcEvent,
                    firstEventIndex,
                });
            }
        }
    }

    private handleCraftJob({
        npcEvent,
        firstEventIndex,
    }: {
        npcEvent: ISimulationEvent<INpc>;
        firstEventIndex: number;
    }) {
        // remove all items if there are items inside of the inventory
        // must clear inventory before the npc will start crafting
        if (CellController.hasItemInInventory(npcEvent.data)) {
            const result = this.findAndStoreInStockpile({
                npcEvent,
                firstEventIndex,
            });
            npcEvent = result.npcEvent;
            if (!result.foundStockpile) {
                this.npcGoHome({
                    npcEvent,
                    firstEventIndex,
                });
                return;
            }
        }

        // determine crafting recipe
        const craftingJob: INpcJobCrafting = npcEvent.data.job as INpcJobCrafting;
        const products = craftingJob.products;

        // pick a crafting product
        const product = products[Math.floor(Math.random() * products.length)];
        if (product) {
            // determine recipe to craft
            const recipe = listOfRecipes.find((r) => r.product === product);
            if (recipe) {
                // determine crafting amount
                const numInputSlotsPerRecipe = recipe.items.reduce((acc: number, item): number => {
                    const numSlotsForItem = Math.floor(item.quantity / getMaxStackSize(item.item));
                    return acc + numSlotsForItem;
                }, 0);
                const numOutputSlotsPerRecipe = Math.floor(recipe.amount / getMaxStackSize(recipe.product));
                const slotsPerRecipe = Math.max(numInputSlotsPerRecipe, numOutputSlotsPerRecipe);
                const maxSlots = npcEvent.data.inventory.rows * npcEvent.data.inventory.columns;
                const numRecipes = Math.floor(maxSlots / slotsPerRecipe);

                // withdraw crafting recipe materials
                {
                    const result = this.findAndWithdrawFromStockpile({
                        npcEvent,
                        firstEventIndex,
                        recipe,
                        amountRecipes: numRecipes,
                    });
                    npcEvent = result.npcEvent;
                    if (!result.foundStockpile) {
                        this.npcGoHome({
                            npcEvent,
                            firstEventIndex,
                        });
                        return;
                    }
                }

                this.craftRecipes({
                    npcEvent,
                    firstEventIndex,
                    recipe,
                    amountRecipes: numRecipes,
                });
            }
        }
    }

    private craftRecipes({
        npcEvent,
        firstEventIndex,
        recipe,
        amountRecipes,
    }: {
        npcEvent: ISimulationEvent<INpc>;
        firstEventIndex: number;
        recipe: any;
        amountRecipes: number;
    }) {
        const goHomeResult = this.npcGoHome({
            npcEvent,
            firstEventIndex,
        });
        npcEvent = goHomeResult.npcEvent;
        const npcReadyTime = goHomeResult.npcReadyTime;

        for (let i = 0; i < amountRecipes; i++) {
            const npcController = new InventoryController(npcEvent.data);

            // perform the crafting operation
            const { updatedItem, stackableSlots, modifiedSlots, deletedSlots } = npcController.craftItem(recipe);

            // a new object was created inside of the npc inventory
            if (updatedItem) {
                this.spawnItem(updatedItem, npcReadyTime);
            }

            // for each slot that was stacked (added) or modified (subtracted), an inventory object was modified, create modified event
            for (const slot of [...stackableSlots, ...modifiedSlots]) {
                const objectEvent: INetworkObjectEvent = {
                    time: npcReadyTime,
                    objectId: slot.id,
                    state: {
                        time: npcReadyTime.toISOString(),
                        state: {
                            amount: slot.amount,
                        },
                    },
                };
                this.addNetworkObjectEvent(slot.id, objectEvent);
            }

            // for each slot that was deleted, create deletion event
            for (const slotId of deletedSlots) {
                const objectElement: INetworkObjectEvent = {
                    time: npcReadyTime,
                    objectId: slotId,
                    state: {
                        time: npcReadyTime.toISOString(),
                        state: {
                            exist: false,
                        },
                    },
                };
                this.addNetworkObjectEvent(slotId, objectElement);
            }

            // update npc inventory in one go
            const inventoryState: IInventoryState = {
                time: npcReadyTime.toISOString(),
                add: updatedItem ? [updatedItem] : [],
                modified: [...stackableSlots, ...modifiedSlots],
                remove: deletedSlots,
            };
            const npcInventoryEvent: INpcInventoryEvent = {
                time: npcReadyTime,
                npcId: npcEvent.data.id,
                state: inventoryState,
            };
            this.addNpcInventoryEvent(npcEvent.data.id, npcInventoryEvent);
            npcEvent = {
                ...npcEvent,
                data: {
                    ...npcEvent.data,
                    inventory: {
                        ...npcEvent.data.inventory,
                    },
                    inventoryState: [...npcEvent.data.inventoryState, npcInventoryEvent.state],
                    readyTime: npcReadyTime.toISOString(),
                },
                readyTime: npcReadyTime,
            };
            npcEvent = {
                ...npcEvent,
                data: applyOneInventoryState(npcEvent.data, npcInventoryEvent.state),
            };
            this.state.npcs[firstEventIndex] = npcEvent;
        }
    }
}
