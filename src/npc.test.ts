import 'jest';
import {
    applyFutureStateToNetworkObject,
    applyInventoryState,
    applyPathToNpc,
    applyStateToNetworkObject,
    applyStateToResource,
    CellController,
} from './npc';
import {
    EBuildingDesignation,
    ENetworkObjectType,
    ENpcJobType,
    EOwnerType,
    ICellLock,
    IHouse,
    INetworkObject,
    INpc,
    INpcJobCrafting,
    INpcPathPoint,
    IObject,
    IResource,
    IStockpile,
} from './types/GameTypes';
import { createResource } from './terrain';
import { getNetworkObjectCellString } from './cell';

const createNpc = (index: number): INpc => ({
    id: `npc${index}`,
    x: 0,
    y: 0,
    path: [],
    readyTime: new Date().toISOString(),
    lastUpdate: new Date().toISOString(),
    creditLimit: 0,
    cash: 0,
    craftingState: true,
    craftingSeed: 'craftingSeed',
    shirtColor: 'blue',
    pantColor: 'brown',
    schedule: [],
    health: {
        rate: 0,
        max: 1,
        value: 1,
    },
    carId: null,
    objectType: ENetworkObjectType.PERSON,
    inventory: {
        rows: 1,
        columns: 10,
        slots: [],
    },
    inventoryState: [],
    job:
        index % 3 === 2
            ? ({
                  type: ENpcJobType.CRAFT,
                  products: [ENetworkObjectType.WATTLE_WALL],
              } as INpcJobCrafting)
            : {
                  type: ENpcJobType.GATHER,
              },
    cell: getNetworkObjectCellString({ x: 0, y: 0 }),
    version: 0,
});

describe('CellController', () => {
    const npcs: INpc[] = new Array(10).fill(0).map((v, i) => createNpc(i));
    const houses: IHouse[] = npcs.map(
        (npc, index): IHouse => ({
            id: `house-${npc.id}`,
            npcId: npc.id,
            x: index * 100,
            y: 0,
            ownerType: EOwnerType.PERSON,
            ownerId: 'person',
            objectType: ENetworkObjectType.POND,
            lastUpdate: new Date().toISOString(),
            health: {
                rate: 0,
                max: 1,
                value: 1,
            },
            cell: getNetworkObjectCellString({ x: index * 100, y: 0 }),
            version: 0,
            buildingDesignation: EBuildingDesignation.HOUSE,
        }),
    );
    const resources: IResource[] = new Array(10).fill(0).reduce((acc, v, x) => {
        return [
            ...acc,
            ...new Array(10).fill(0).map((w, y) => {
                return createResource(
                    {
                        x: x * 100,
                        y: y * 100,
                    },
                    ENetworkObjectType.TREE,
                );
            }),
        ];
    }, []);
    const stockpiles: IStockpile[] = [
        {
            id: 'stockpile',
            x: 0,
            y: 0,
            inventory: {
                rows: 1,
                columns: 10,
                slots: [],
            },
            ownerId: 'person',
            ownerType: EOwnerType.PERSON,
            objectType: ENetworkObjectType.STOCKPILE,
            inventoryState: [],
            craftingSeed: 'stockpile',
            craftingState: true,
            lastUpdate: new Date().toISOString(),
            health: {
                rate: 0,
                max: 1,
                value: 1,
            },
            cell: getNetworkObjectCellString({ x: 0, y: 0 }),
            version: 0,
            acceptedNetworkObjectGroups: [],
        },
    ];
    const objects: INetworkObject[] = [];
    it('should create an instance', () => {
        const controller = new CellController({
            npcs,
            resources,
            houses,
            objects,
            stockpiles,
            cellLock: null,
        });
        expect(controller).toBeTruthy();
    });
    /**
     * Run the Cell Controller for a specified amount of time.
     * @param milliseconds The number of milliseconds to simulate.
     * @param steps The number of rounds of simulation.
     */
    const runSimulationForAmountOfTime = (
        milliseconds: number,
        steps: number = 1,
        cellLock: ICellLock | null = null,
    ) => {
        let initialNpcs: INpc[] = npcs;
        let initialResources: IResource[] = resources;
        let initialHouses: IHouse[] = houses;
        let initialObjects: INetworkObject[] = objects;
        let initialStockpiles: IStockpile[] = stockpiles;
        for (let i = 0; i < steps; i++) {
            const controller = new CellController({
                npcs: initialNpcs,
                resources: initialResources,
                houses: initialHouses,
                objects: initialObjects,
                stockpiles: initialStockpiles,
                cellLock,
            });
            controller.run(Math.ceil(milliseconds / steps));
            const stateResult = controller.getState();

            // check to see valid formatted getState result
            expect(stateResult).toEqual({
                npcs: expect.arrayContaining([
                    expect.objectContaining({
                        path: expect.arrayContaining([
                            expect.objectContaining({
                                location: {
                                    x: expect.any(Number),
                                    y: expect.any(Number),
                                },
                                time: expect.any(String),
                            }),
                        ]),
                        inventoryState: expect.anything(),
                    }),
                ]),
                objects: expect.arrayContaining([
                    expect.objectContaining({
                        exist: false,
                        state: expect.arrayContaining([
                            expect.objectContaining({
                                state: expect.anything(),
                                time: expect.any(String),
                            }),
                        ]),
                    }),
                ]),
                resources: expect.arrayContaining([
                    expect.objectContaining({
                        state: expect.arrayContaining([
                            expect.objectContaining({
                                state: expect.anything(),
                                time: expect.any(String),
                            }),
                        ]),
                    }),
                ]),
                stockpiles: expect.anything(),
            });

            for (const obj of stateResult.objects) {
                if (obj.state.length <= 2) {
                    const futureObject = applyFutureStateToNetworkObject(obj);
                    if (futureObject.exist && !futureObject.isInInventory) {
                        throw new Error('Created an object that will not stop existing, object leak');
                    }
                }
            }

            // copy last run into next Cell Controller
            initialNpcs = stateResult.npcs;
            initialResources = stateResult.resources;
            initialObjects = stateResult.objects;
            initialStockpiles = stateResult.stockpiles;
        }
    };
    it('should run for 1 minute', () => runSimulationForAmountOfTime(60 * 1000));
    it('should run for 1 minute and cellLock 30 seconds', () => {
        const cellLock: ICellLock = {
            pauseDate: new Date(+new Date() + 30 * 1000).toISOString(),
            cell: getNetworkObjectCellString({ x: 0, y: 0 }),
            version: 1,
            versionCounter: 1,
        };
        runSimulationForAmountOfTime(60 * 1000, 2, cellLock);
    });
    it('should run for 2 minutes in 2 steps', () => runSimulationForAmountOfTime(2 * 60 * 1000, 2));
    it('should run for 10 minutes', () => runSimulationForAmountOfTime(10 * 60 * 1000));
    it('should run for 1 hour', () => runSimulationForAmountOfTime(60 * 60 * 1000));
    it('should run for 1 hour in 6 steps', () => runSimulationForAmountOfTime(60 * 60 * 1000, 6));
    it('should run for 4 hours', () => runSimulationForAmountOfTime(4 * 60 * 60 * 1000));
    it('should run for 8 hours', () => runSimulationForAmountOfTime(8 * 60 * 60 * 1000));
});

describe('applyPathToNpc', () => {
    it('should handle blank path', () => {
        const npc = createNpc(1);
        expect(applyPathToNpc(npc)).toEqual(npc);
    });
    it('should handle one point', () => {
        const npc = createNpc(1);
        const a: INpcPathPoint = {
            location: {
                x: 500,
                y: 0,
            },
            time: new Date(+new Date() - 5000).toISOString(),
        };
        npc.path = [a];
        const expectedPosition: IObject = {
            x: 500,
            y: 0,
        };
        const finalNpc = applyPathToNpc(npc);
        expect(finalNpc.x).toBeCloseTo(expectedPosition.x, 0);
        expect(finalNpc.y).toBeCloseTo(expectedPosition.y, 0);
    });
    it('should handle line segment', () => {
        const npc = createNpc(1);
        const a: INpcPathPoint = {
            location: {
                x: 0,
                y: 0,
            },
            time: new Date(+new Date() - 5000).toISOString(),
        };
        const b: INpcPathPoint = {
            location: {
                x: 1000,
                y: 0,
            },
            time: new Date(+new Date() + 5000).toISOString(),
        };
        npc.path = [a, b];
        const expectedPosition: IObject = {
            x: 500,
            y: 0,
        };
        const finalNpc = applyPathToNpc(npc);
        expect(finalNpc.x).toBeCloseTo(expectedPosition.x, -1);
        expect(finalNpc.y).toBeCloseTo(expectedPosition.y, -1);
    });
    it('should handle line segment (end of line segment)', () => {
        const npc = createNpc(1);
        const a: INpcPathPoint = {
            location: {
                x: 0,
                y: 0,
            },
            time: new Date(+new Date() - 15000).toISOString(),
        };
        const b: INpcPathPoint = {
            location: {
                x: 1000,
                y: 0,
            },
            time: new Date(+new Date() - 5000).toISOString(),
        };
        npc.path = [a, b];
        const expectedPosition: IObject = {
            x: 1000,
            y: 0,
        };
        const finalNpc = applyPathToNpc(npc);
        expect(finalNpc.x).toBeCloseTo(expectedPosition.x, 0);
        expect(finalNpc.y).toBeCloseTo(expectedPosition.y, 0);
    });
});

describe('applyStateToNetworkObject', () => {
    const networkObject: INetworkObject = {
        id: 'obj1',
        x: 0,
        y: 0,
        insideStockpile: null,
        grabbedByNpcId: null,
        grabbedByPersonId: null,
        isInInventory: false,
        exist: false,
        objectType: ENetworkObjectType.BOX,
        amount: 1,
        lastUpdate: new Date().toISOString(),
        health: {
            rate: 0,
            max: 1,
            value: 1,
        },
        state: [],
        cell: getNetworkObjectCellString({ x: 0, y: 0 }),
        version: 0,
    };
    it('should handle no state changes', () => {
        expect(applyStateToNetworkObject(networkObject)).toEqual(networkObject);
    });
    it('should apply 1 state change (has happened)', () => {
        const initialNetworkObject: INetworkObject = {
            ...networkObject,
            exist: false,
            state: [
                {
                    state: {
                        exist: true,
                    },
                    time: new Date(+new Date() - 1000).toISOString(),
                },
            ],
        };
        expect(applyStateToNetworkObject(initialNetworkObject)).toEqual({
            ...initialNetworkObject,
            state: [],
            exist: true,
        });
    });
    it('should not apply 1 state change (has not happen yet)', () => {
        const initialNetworkObject: INetworkObject = {
            ...networkObject,
            exist: false,
            state: [
                {
                    state: {
                        exist: true,
                    },
                    time: new Date(+new Date() + 1000).toISOString(),
                },
            ],
        };
        expect(applyStateToNetworkObject(initialNetworkObject)).toEqual({
            ...initialNetworkObject,
            exist: false,
        });
    });
    it('should apply state to networkObject using pauseDate', () => {
        const time1 = new Date(+new Date() - 10 * 1000).toISOString();
        const time2 = new Date(+new Date() + 10 * 1000).toISOString();
        const time3 = new Date(+new Date() + 40 * 1000).toISOString();
        const time4 = new Date(+new Date() + 60 * 1000).toISOString();
        const initialNetworkObject: INetworkObject = {
            ...networkObject,
            state: [
                {
                    time: time1,
                    state: {
                        exist: true,
                    },
                },
                {
                    time: time2,
                    state: {
                        exist: false,
                    },
                },
                {
                    time: time3,
                    state: {
                        exist: true,
                    },
                },
                {
                    time: time4,
                    state: {
                        exist: false,
                    },
                },
            ],
        };
        expect(applyStateToNetworkObject(initialNetworkObject, new Date(+new Date() + 30 * 1000))).toEqual(
            expect.objectContaining({
                exist: true,
                state: [
                    {
                        time: time2,
                        state: {
                            exist: false,
                        },
                    },
                ],
            }),
        );
    });
});

describe('applyStateToResource', () => {
    it('should apply state to resource using pauseDate', () => {
        const point: IObject = {
            x: 0,
            y: 0,
        };
        const time1 = new Date(+new Date() - 10 * 1000).toISOString();
        const time2 = new Date(+new Date() + 10 * 1000).toISOString();
        const time3 = new Date(+new Date() + 40 * 1000).toISOString();
        const time4 = new Date(+new Date() + 60 * 1000).toISOString();
        const resource: IResource = {
            ...createResource(point, ENetworkObjectType.TREE),
            state: [
                {
                    time: time1,
                    state: {
                        depleted: true,
                    },
                },
                {
                    time: time2,
                    state: {
                        depleted: false,
                    },
                },
                {
                    time: time3,
                    state: {
                        depleted: true,
                    },
                },
                {
                    time: time4,
                    state: {
                        depleted: false,
                    },
                },
            ],
        };
        expect(applyStateToResource(resource, new Date(+new Date() + 30 * 1000))).toEqual(
            expect.objectContaining({
                depleted: true,
                state: [
                    {
                        time: time2,
                        state: {
                            depleted: false,
                        },
                    },
                ],
            }),
        );
    });
});

describe('applyInventoryState', () => {
    it('should apply inventory state to npc using pauseDate', () => {
        const time1 = new Date(+new Date() - 10 * 1000).toISOString();
        const time2 = new Date(+new Date() + 10 * 1000).toISOString();
        const time3 = new Date(+new Date() + 40 * 1000).toISOString();
        const time4 = new Date(+new Date() + 60 * 1000).toISOString();
        const item1: INetworkObject = {
            id: 'item1',
        } as INetworkObject;
        const item2: INetworkObject = {
            id: 'item2',
        } as INetworkObject;
        const item3: INetworkObject = {
            id: 'item3',
        } as INetworkObject;
        const item4: INetworkObject = {
            id: 'item4',
        } as INetworkObject;
        const npc: INpc = {
            ...createNpc(1),
            inventoryState: [
                {
                    time: time1,
                    add: [item1],
                    remove: [],
                    modified: [],
                },
                {
                    time: time2,
                    add: [item2],
                    remove: [],
                    modified: [],
                },
                {
                    time: time3,
                    add: [item3],
                    remove: [],
                    modified: [],
                },
                {
                    time: time4,
                    add: [item4],
                    remove: [],
                    modified: [],
                },
            ],
        };
        expect(applyInventoryState(npc, new Date(+new Date() + 30 * 1000))).toEqual(
            expect.objectContaining({
                inventoryState: [
                    {
                        time: time2,
                        add: [item2],
                        remove: [],
                        modified: [],
                    },
                ],
            }),
        );
    });
});
