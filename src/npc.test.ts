import 'jest';
import { applyPathToNpc, applyStateToNetworkObject, CellController } from './npc';
import {
    ENetworkObjectType,
    ENpcJobType,
    EOwnerType,
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
        });
        expect(controller).toBeTruthy();
    });
    /**
     * Run the Cell Controller for a specified amount of time.
     * @param milliseconds The number of milliseconds to simulate.
     * @param steps The number of rounds of simulation.
     */
    const runSimulationForAmountOfTime = (milliseconds: number, steps: number = 1) => {
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

            // copy last run into next Cell Controller
            initialNpcs = stateResult.npcs;
            initialResources = stateResult.resources;
            initialObjects = stateResult.objects;
            initialStockpiles = stateResult.stockpiles;
        }
    };
    it('should run for 1 minute', () => runSimulationForAmountOfTime(60 * 1000));
    it('should run for 2 minutes in 2 steps', () => runSimulationForAmountOfTime(2 * 60 * 1000, 2));
    it('should run for 10 minutes', () => runSimulationForAmountOfTime(10 * 60 * 1000));
    it('should run for 1 hour', () => runSimulationForAmountOfTime(60 * 60 * 1000));
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
        expect(finalNpc.x).toBeCloseTo(expectedPosition.x, 0);
        expect(finalNpc.y).toBeCloseTo(expectedPosition.y, 0);
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
            state: [],
            exist: false,
        });
    });
});
