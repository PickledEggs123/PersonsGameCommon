import {
    IHouse,
    IInventoryState,
    INetworkObject,
    INetworkObjectBase,
    INetworkObjectState,
    INpc,
    INpcPathPoint,
    IResource,
    IStockpile,
} from './types/GameTypes';
import { HarvestResourceController } from './resources';
import { InventoryController } from './inventory';

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
    resourceEvents: IResourceEvent[];
    networkObjectEvents: INetworkObjectEvent[];
    npcInventoryEvents: INpcInventoryEvent[];
    stockpiles: IStockpile[];
    stockpileInventoryEvents: IStockpileInventoryEvent[];
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
        if (all || +now >= Date.parse(inventoryState.time)) {
            return {
                ...acc,
                inventory: {
                    ...acc.inventory,
                    rows: typeof inventoryState.rows === 'number' ? inventoryState.rows : acc.inventory.rows,
                    columns:
                        typeof inventoryState.columns === 'number' ? inventoryState.columns : acc.inventory.columns,
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
    return internalApplyInventoryState(npc, false);
};

export const applyFutureInventoryState = <T extends INpc | IStockpile>(npc: T): T => {
    return internalApplyInventoryState(npc, true);
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
    return networkObject.state.reduce(
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
};

/**
 * Apply the interpolated state updates onto the network object. An object can be loaded with multiple state changes
 * over time. The UI can update the object using the object information without having to receive network updates.
 * @param resource The object containing state updates.
 */
export const applyStateToResource = (resource: IResource): IResource => {
    const now = +new Date();
    return resource.state.reduce((acc: IResource, state: INetworkObjectState<IResource>): IResource => {
        if (now >= Date.parse(state.time)) {
            return {
                ...acc,
                ...state.state,
            };
        } else {
            return acc;
        }
    }, resource);
};

export class CellController {
    /**
     * The initial list of npcs.
     */
    private npcs: INpc[];
    /**
     * The initial list of resources.
     */
    private resources: IResource[];
    /**
     * The initial list of houses.
     */
    private houses: IHouse[];
    /**
     * The initial list of objects.
     */
    private objects: INetworkObject[];
    /**
     * The initial list of stockpiles.
     */
    private stockpiles: IStockpile[];

    /**
     * The state of the cell run.
     */
    private state: ICellSimulationState = {
        npcs: [],
        resources: [],
        spawns: [],
        resourceEvents: [],
        networkObjectEvents: [],
        npcInventoryEvents: [],
        stockpiles: [],
        stockpileInventoryEvents: [],
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
        this.npcs = npcs.map((npc) => applyPathToNpc(npc));
        this.resources = resources.map((resource) => applyStateToResource(resource));
        this.houses = houses;
        this.objects = objects.map((obj) => applyStateToNetworkObject(obj));
        this.stockpiles = stockpiles.map((obj) => applyInventoryState(obj));

        this.startTime = new Date();
        this.currentMilliseconds = 0;
    }

    /**
     * Load the initial state of the simulation.
     */
    private setupState() {
        this.state = {
            npcs: this.npcs.map((npc) => {
                return {
                    readyTime: new Date(Date.parse(npc.readyTime)),
                    data: npc,
                };
            }),
            resources: this.resources.map((o) => ({ ...o })),
            spawns: [],
            resourceEvents: [],
            networkObjectEvents: [],
            npcInventoryEvents: [],
            stockpiles: this.stockpiles.map((o) => ({ ...o })),
            stockpileInventoryEvents: [],
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

    private static hasInventorySpace(npc: INpc | IStockpile) {
        const maxSlots: number = npc.inventory.rows * npc.inventory.columns;
        return npc.inventory.slots.length < maxSlots;
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
            const spawnState: INetworkObjectState<INetworkObject> = {
                time: harvestedTime.toISOString(),
                state: {
                    exist: true,
                },
            };
            const spawnEvent: ISpawnEvent = {
                time: harvestedTime,
                spawn: {
                    ...spawn,
                    exist: false,
                    state: [spawnState],
                },
            };
            this.state.spawns.push(spawnEvent);

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
            this.state.resourceEvents.push(harvestedEvent, respawnEvent);

            const inventoryController = new InventoryController(npcEvent.data);
            const { updatedItem, stackableSlots } = inventoryController.pickUpItem(spawnEvent.spawn);
            if (updatedItem) {
                // inventory picked up item
                const pickUpState: INetworkObjectState<INetworkObject> = {
                    time: pickUpTime.toISOString(),
                    state: {
                        isInInventory: true,
                        grabbedByNpcId: npcEvent.data.id,
                    },
                };
                spawnEvent.spawn.state.push(pickUpState);
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
                    this.state.networkObjectEvents.push(mergeItemEvent);
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
            this.state.npcInventoryEvents.push(npcInventoryEvent);

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
                data: applyFutureInventoryState(npcEvent.data),
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

            // check to see if npc has inventory space
            if (CellController.hasInventorySpace(npcEvent.data)) {
                // fetch resource
                this.collectResources({
                    npcEvent,
                    firstEventIndex,
                });
            } else {
                // check for empty stockpiles
                const stockpileIndex = this.state.stockpiles
                    .sort(CellController.byDistance.bind(this, npcEvent.data))
                    .findIndex(CellController.hasInventorySpace.bind(this));
                const stockpile = this.state.stockpiles[stockpileIndex];
                if (stockpile) {
                    // store in stockpile
                    this.storeInStockpile({
                        npcEvent,
                        firstEventIndex,
                        stockpile,
                        stockpileIndex,
                    });
                } else {
                    this.npcGoHome({
                        npcEvent,
                        firstEventIndex,
                    });
                }
            }
        }
    }
    getState(): ICellFinalState {
        // update npcs by removing long path arrays
        const npcs: INpc[] = this.state.npcs.map(
            (npcEvent): INpc => {
                const npc = this.npcs.find((n) => n.id === npcEvent.data.id);
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
                const relevantNpcInventoryEvents = this.state.npcInventoryEvents.filter(
                    (event) => event.npcId === npc.id,
                );
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
                const initialStockpile = this.stockpiles.find((s) => s.id === stockpile.id);
                if (!initialStockpile) {
                    throw new Error('Cannot find initial stockpile');
                }

                // get npc inventory events
                const relevantInventoryEvents = this.state.stockpileInventoryEvents.filter(
                    (event) => event.stockpileId === stockpile.id,
                );
                const now = new Date();
                const inventoryState: IInventoryState[] = [
                    ...initialStockpile.inventoryState.filter((event) => Date.parse(event.time) > +now),
                    ...relevantInventoryEvents.map((event) => event.state),
                ];
                return {
                    ...initialStockpile,
                    inventoryState,
                    lastUpdate: now.toISOString(),
                };
            },
        );

        const resources: IResource[] = this.state.resources.map((resource) => {
            const state: INetworkObjectState<IResource>[] = [
                ...this.state.resourceEvents
                    .filter((resourceEvent) => {
                        return resourceEvent.resourceId === resource.id;
                    })
                    .map(
                        (resourceEvent): INetworkObjectState<IResource> => {
                            return {
                                time: resourceEvent.time.toISOString(),
                                state: resourceEvent.state,
                            };
                        },
                    ),
            ];
            const initialResourceCopy = this.resources.find((r) => r.id === resource.id);
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
                    return spawnEvent.spawn;
                },
            ),
            // update modified old items
            ...this.objects.map((obj) => {
                const objectEvents: INetworkObjectEvent[] = this.state.networkObjectEvents.filter(
                    (event) => event.objectId === obj.id,
                );
                const state: INetworkObjectState<INetworkObject>[] = [
                    // filter old state objects to prevent large arrays
                    ...obj.state.filter((s) => Date.parse(s.time) < +this.startTime),
                    // add new object states
                    ...objectEvents.map((event) => event.state),
                ];
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
    }) {
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
                this.state.networkObjectEvents.push(dropItemEvent);
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
                this.state.npcInventoryEvents.push(npcDropItemEvent);
                npcEvent = {
                    ...npcEvent,
                    data: {
                        ...npcEvent.data,
                        inventoryState: [...npcEvent.data.inventoryState, npcDropItemEvent.state],
                    },
                };
                npcEvent = {
                    ...npcEvent,
                    data: applyFutureInventoryState(npcEvent.data),
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
                this.state.stockpileInventoryEvents.push(stockpileEvent);
                this.state.stockpiles[stockpileIndex] = applyFutureInventoryState({
                    ...stockpile,
                    inventoryState: [...stockpile.inventoryState, stockpileEvent.state],
                });
                const moveToStockpileEvent: INetworkObjectEvent = {
                    objectId: npcItem.id,
                    time: npcReadyTime,
                    state: {
                        time: npcReadyTime.toISOString(),
                        state: {
                            isInInventory: true,
                            insideStockpile: stockpile.id,
                        },
                    },
                };
                this.state.networkObjectEvents.push(moveToStockpileEvent);
            }
        }
    }

    /**
     * The npc has nothing to do, go home.
     * @param npcEvent The npc data.
     * @param firstEventIndex The index of the npc data, used to modify array.
     */
    private npcGoHome({ npcEvent, firstEventIndex }: { npcEvent: ISimulationEvent<INpc>; firstEventIndex: number }) {
        const home = this.houses.find((house) => house.npcId === npcEvent.data.id);
        if (!home) {
            throw new Error('Could not find a house for the NPC to go home to');
        }
        this.walkNpcTowardsLocation({
            npcEvent,
            firstEventIndex,
            location: home,
        });
    }
}
