import { IHouse, INetworkObject, INetworkObjectState, INpc, INpcPathPoint, IResource } from './types/GameTypes';
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
}

/**
 * Represent an event where an object is ready to be used.
 */
interface ISimulationEvent<T extends INetworkObject> {
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
}

/**
 * An npc action result.
 */
interface INpcActionResult {
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
}

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
     * The state of the cell run.
     */
    private state: ICellSimulationState = {
        npcs: [],
        resources: [],
        spawns: [],
        resourceEvents: [],
    };

    /**
     * The start time of the cell run.
     */
    private startTime: Date;
    /**
     * The current time of the simulation since startTime.
     */
    private currentMilliseconds: number;

    constructor({ npcs, resources, houses, objects }: ICellControllerParams) {
        this.npcs = npcs;
        this.resources = resources;
        this.houses = houses;
        this.objects = objects;

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
        };
        this.startTime = new Date();
        this.currentMilliseconds = 0;
    }

    private static newestSimulationEvent(a: ISimulationEvent<any>, b: ISimulationEvent<any>): number {
        return +b.readyTime - +a.readyTime;
    }

    private sortEvents() {
        this.state.npcs = this.state.npcs.sort(CellController.newestSimulationEvent);
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

    private static distance(a: INetworkObject, b: INetworkObject): number {
        return Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    }

    private static byDistance(npc: INpc, a: INetworkObject, b: INetworkObject) {
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
    generatePathToResource(npc: INpc, resource: IResource): INpcActionResult {
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

            // find ready resources
            const nextResourceIndex = this.getNextResourceIndex(npcEvent.data);
            if (nextResourceIndex < 0) {
                // did not find a ready resource, increment time by 1000 milliseconds
                this.currentMilliseconds += 1000;
                continue;
            }
            const nextResource: IResource = this.state.resources[nextResourceIndex];

            // update npc to walk towards resource point
            const { path, duration } = this.generatePathToResource(npcEvent.data, nextResource);
            this.state.npcs[firstEventIndex] = {
                ...npcEvent,
                data: {
                    ...npcEvent.data,
                    path: [...npcEvent.data.path, ...path],
                    x: path[path.length - 1].location.x,
                    y: path[path.length - 1].location.y,
                    readyTime: new Date(+this.startTime + this.currentMilliseconds + duration).toISOString(),
                },
                readyTime: new Date(+this.startTime + this.currentMilliseconds + duration),
            };

            // harvest resource point
            {
                // harvest resource
                const controller = new HarvestResourceController(nextResource);
                const { spawn, respawnTime } = controller.spawn();

                // the times of the resource node being harvested and respawning
                const harvestedTime: Date = new Date(+this.startTime + this.currentMilliseconds + duration);
                const respawnedTime: Date = new Date(
                    +this.startTime + this.currentMilliseconds + duration + respawnTime,
                );

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
                const spawnEvent: ISpawnEvent = {
                    time: harvestedTime,
                    spawn: {
                        ...spawn,
                        exist: false,
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
            }
        }
    }
    getState(): ICellFinalState {
        // update npcs by removing long path arrays
        const npcs: INpc[] = this.state.npcs.map(
            (npcEvent): INpc => {
                const npc = npcEvent.data;
                const firstRelevantPathPoint = npc.path.findIndex((p) => Date.parse(p.time) >= +this.startTime);
                let path: INpcPathPoint[];
                if (firstRelevantPathPoint < 0) {
                    path = [];
                } else if (firstRelevantPathPoint === 0) {
                    path = npc.path;
                } else {
                    path = npc.path.slice(firstRelevantPathPoint - 1);
                }
                return {
                    ...npc,
                    path,
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
            return {
                ...resource,
                state,
            };
        });

        const objects: INetworkObject[] = this.state.spawns.map(
            (spawnEvent): INetworkObject => {
                const spawnState: INetworkObjectState<INetworkObject> = {
                    time: spawnEvent.time.toISOString(),
                    state: {
                        exist: true,
                    },
                };
                return {
                    ...spawnEvent.spawn,
                    state: [spawnState],
                };
            },
        );

        return {
            npcs,
            resources,
            objects,
        };
    }
}

/**
 * Interpolate path data onto the npc position.
 * @param npc The npc with path data.
 */
export const applyPathToNpc = (npc: INpc): INpc => {
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
