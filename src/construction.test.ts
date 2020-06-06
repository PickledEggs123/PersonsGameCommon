import 'jest';
import { ENetworkObjectType, IObject, IPerson } from './types/GameTypes';
import { ConstructionController } from './construction';
import { InventoryController } from './inventory';

describe('Construction Controller', () => {
    const person: IPerson = {
        id: 'id',
        x: 0,
        y: 0,
        shirtColor: 'green',
        pantColor: 'black',
        carId: null,
        cash: 0,
        creditLimit: 1000,
        objectType: ENetworkObjectType.PERSON,
        lastUpdate: new Date().toISOString(),
        health: {
            rate: 0,
            max: 10,
            value: 10,
        },
        inventory: {
            rows: 1,
            columns: 10,
            slots: [],
        },
        craftingSeed: 'craftingSeed',
        craftingState: true,
    };

    it('should create construction controller', () => {
        const controller = new ConstructionController({
            inventoryHolder: person,
            houses: [],
            floors: [],
            walls: [],
        });
        expect(controller).toBeTruthy();
    });
    it('should create construction request', () => {
        const controller = new ConstructionController({
            inventoryHolder: person,
            houses: [],
            floors: [],
            walls: [],
        });
        const location: IObject = {
            x: 0,
            y: 0,
        };
        expect(controller.getConstructionRequest(location)).toEqual({
            personId: person.id,
            location,
        });
    });
    it('should fail to construct 1x1 building (no materials)', () => {
        const controller = new ConstructionController({
            inventoryHolder: person,
            houses: [],
            floors: [],
            walls: [],
        });
        expect(() =>
            controller.constructBuilding({
                location: {
                    x: 0,
                    y: 0,
                },
            }),
        ).toThrow('Not enough materials for crafting');
    });
    it('should construct 1x1 building', () => {
        // add construction materials
        const inventoryController = new InventoryController(person);
        for (let i = 0; i < 4; i++) {
            const item = inventoryController.createItemType(ENetworkObjectType.WATTLE_WALL);
            inventoryController.addItem(item);
        }
        const inventoryHolder: IPerson = {
            ...person,
            ...inventoryController.getState(),
        };

        // perform construction
        const controller = new ConstructionController({
            inventoryHolder,
            houses: [],
            floors: [],
            walls: [],
        });
        controller.constructBuilding({
            location: {
                x: 0,
                y: 0,
            },
        });
        expect(controller.getState()).toEqual({
            inventoryHolder: expect.objectContaining({
                id: inventoryHolder.id,
            }),
            houses: expect.objectContaining({
                length: 1,
            }),
            floors: expect.objectContaining({
                length: 1,
            }),
            walls: expect.objectContaining({
                length: 4,
            }),
        });
    });
    it('should construct 2x2 building', () => {
        // add construction materials
        const inventoryController = new InventoryController(person);
        for (let i = 0; i < 10; i++) {
            const item = inventoryController.createItemType(ENetworkObjectType.WATTLE_WALL);
            inventoryController.addItem(item);
        }
        const inventoryHolder: IPerson = {
            ...person,
            ...inventoryController.getState(),
        };

        // perform construction
        const controller = new ConstructionController({
            inventoryHolder,
            houses: [],
            floors: [],
            walls: [],
        });
        const locations: IObject[] = [
            {
                x: 0,
                y: 0,
            },
            {
                x: 200,
                y: 0,
            },
            {
                x: 0,
                y: 200,
            },
            {
                x: 200,
                y: 200,
            },
        ];
        for (const location of locations) {
            controller.constructBuilding({
                location,
            });
        }
        expect(controller.getState()).toEqual({
            inventoryHolder: expect.objectContaining({
                id: inventoryHolder.id,
            }),
            houses: expect.objectContaining({
                length: 1,
            }),
            floors: expect.objectContaining({
                length: 4,
            }),
            walls: expect.objectContaining({
                length: 8,
            }),
        });
    });
    it('should construct 3x3 building', () => {
        // add construction materials
        const inventoryController = new InventoryController(person);
        for (let i = 0; i < 16; i++) {
            const item = inventoryController.createItemType(ENetworkObjectType.WATTLE_WALL);
            inventoryController.addItem(item);
        }
        const inventoryHolder: IPerson = {
            ...person,
            ...inventoryController.getState(),
        };

        // perform construction
        const controller = new ConstructionController({
            inventoryHolder,
            houses: [],
            floors: [],
            walls: [],
        });
        const locations: IObject[] = [
            {
                x: 0,
                y: 0,
            },
            {
                x: 200,
                y: 0,
            },
            {
                x: 400,
                y: 0,
            },
            {
                x: 0,
                y: 200,
            },
            {
                x: 200,
                y: 200,
            },
            {
                x: 400,
                y: 200,
            },
            {
                x: 0,
                y: 400,
            },
            {
                x: 200,
                y: 400,
            },
            {
                x: 400,
                y: 400,
            },
        ];
        for (const location of locations) {
            controller.constructBuilding({
                location,
            });
        }
        expect(controller.getState()).toEqual({
            inventoryHolder: expect.objectContaining({
                id: inventoryHolder.id,
            }),
            houses: expect.objectContaining({
                length: 1,
            }),
            floors: expect.objectContaining({
                length: 9,
            }),
            walls: expect.objectContaining({
                length: 12,
            }),
        });
    });
    it('should construct 3x3 building then remove', () => {
        // add construction materials
        const inventoryController = new InventoryController(person);
        for (let i = 0; i < 16; i++) {
            const item = inventoryController.createItemType(ENetworkObjectType.WATTLE_WALL);
            inventoryController.addItem(item);
        }
        const inventoryHolder: IPerson = {
            ...person,
            ...inventoryController.getState(),
        };

        // perform construction
        const controller = new ConstructionController({
            inventoryHolder,
            houses: [],
            floors: [],
            walls: [],
        });
        const locations: IObject[] = [
            {
                x: 0,
                y: 0,
            },
            {
                x: 200,
                y: 0,
            },
            {
                x: 400,
                y: 0,
            },
            {
                x: 0,
                y: 200,
            },
            {
                x: 200,
                y: 200,
            },
            {
                x: 400,
                y: 200,
            },
            {
                x: 0,
                y: 400,
            },
            {
                x: 200,
                y: 400,
            },
            {
                x: 400,
                y: 400,
            },
        ];
        for (const location of locations) {
            controller.constructBuilding({
                location,
            });
        }
        expect(controller.getState()).toEqual({
            inventoryHolder: expect.objectContaining({
                id: inventoryHolder.id,
            }),
            houses: expect.objectContaining({
                length: 1,
            }),
            floors: expect.objectContaining({
                length: 9,
            }),
            walls: expect.objectContaining({
                length: 12,
            }),
        });
        for (const location of locations) {
            controller.constructBuilding({
                location,
            });
        }
        expect(controller.getState()).toEqual({
            inventoryHolder: expect.objectContaining({
                id: inventoryHolder.id,
            }),
            houses: expect.objectContaining({
                length: 0,
            }),
            floors: expect.objectContaining({
                length: 0,
            }),
            walls: expect.objectContaining({
                length: 0,
            }),
        });
    });
    it('should fail to construct by building between two buildings', () => {
        // add construction materials
        const inventoryController = new InventoryController(person);
        for (let i = 0; i < 16; i++) {
            const item = inventoryController.createItemType(ENetworkObjectType.WATTLE_WALL);
            inventoryController.addItem(item);
        }
        const inventoryHolder: IPerson = {
            ...person,
            ...inventoryController.getState(),
        };

        // perform construction
        const controller = new ConstructionController({
            inventoryHolder,
            houses: [],
            floors: [],
            walls: [],
        });
        controller.constructBuilding({
            location: {
                x: 0,
                y: 0,
            },
        });
        controller.constructBuilding({
            location: {
                x: 400,
                y: 0,
            },
        });
        expect(() =>
            controller.constructBuilding({
                location: {
                    x: 200,
                    y: 0,
                },
            }),
        ).toThrow('Cannot connect two separate buildings');
    });
    it('should fail to construct by building too long east to west', () => {
        // add construction materials
        const inventoryController = new InventoryController(person);
        for (let i = 0; i < 16; i++) {
            const item = inventoryController.createItemType(ENetworkObjectType.WATTLE_WALL);
            inventoryController.addItem(item);
        }
        const inventoryHolder: IPerson = {
            ...person,
            ...inventoryController.getState(),
        };

        // perform construction
        const controller = new ConstructionController({
            inventoryHolder,
            houses: [],
            floors: [],
            walls: [],
        });
        controller.constructBuilding({
            location: {
                x: 0,
                y: 0,
            },
        });
        controller.constructBuilding({
            location: {
                x: 200,
                y: 0,
            },
        });
        controller.constructBuilding({
            location: {
                x: 400,
                y: 0,
            },
        });
        expect(() =>
            controller.constructBuilding({
                location: {
                    x: 600,
                    y: 0,
                },
            }),
        ).toThrow('House is too long east to west');
    });
    it('should fail to construct by building too long north to south', () => {
        // add construction materials
        const inventoryController = new InventoryController(person);
        for (let i = 0; i < 16; i++) {
            const item = inventoryController.createItemType(ENetworkObjectType.WATTLE_WALL);
            inventoryController.addItem(item);
        }
        const inventoryHolder: IPerson = {
            ...person,
            ...inventoryController.getState(),
        };

        // perform construction
        const controller = new ConstructionController({
            inventoryHolder,
            houses: [],
            floors: [],
            walls: [],
        });
        controller.constructBuilding({
            location: {
                x: 0,
                y: 0,
            },
        });
        controller.constructBuilding({
            location: {
                x: 0,
                y: 200,
            },
        });
        controller.constructBuilding({
            location: {
                x: 0,
                y: 400,
            },
        });
        expect(() =>
            controller.constructBuilding({
                location: {
                    x: 0,
                    y: 600,
                },
            }),
        ).toThrow('House is too long north to south');
    });
});
