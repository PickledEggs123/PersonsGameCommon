import 'jest';
import { ENetworkObjectType, IObject, IPerson } from './types/GameTypes';
import { StockpileController } from './stockpile';
import { getMaxStackSize, InventoryController } from './inventory';

describe('Stockpile Controller', () => {
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

    it('should create stockpile controller', () => {
        const controller = new StockpileController({
            person,
            stockpiles: [],
            stockpileTiles: [],
        });
        expect(controller).toBeTruthy();
    });
    it('should create construct stockpile request', () => {
        const controller = new StockpileController({
            person,
            stockpiles: [],
            stockpileTiles: [],
        });
        const location: IObject = {
            x: 0,
            y: 0,
        };
        expect(controller.getConstructionStockpileRequest(location)).toEqual({
            personId: person.id,
            location,
        });
    });
    it('should construct 1x1 stockpile', () => {
        // perform construction
        const controller = new StockpileController({
            person,
            stockpiles: [],
            stockpileTiles: [],
        });
        controller.constructStockpile({
            location: {
                x: 0,
                y: 0,
            },
        });
        expect(controller.getState()).toEqual({
            stockpiles: expect.objectContaining({
                length: 1,
            }),
            stockpileTiles: expect.objectContaining({
                length: 1,
            }),
        });
    });
    it('should construct 2x2 stockpile', () => {
        // perform construction
        const controller = new StockpileController({
            person,
            stockpiles: [],
            stockpileTiles: [],
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
            controller.constructStockpile({
                location,
            });
        }
        expect(controller.getState()).toEqual({
            stockpiles: expect.objectContaining({
                length: 1,
            }),
            stockpileTiles: expect.objectContaining({
                length: 4,
            }),
        });
    });
    it('should construct 3x3 building', () => {
        // perform construction
        const controller = new StockpileController({
            person,
            stockpiles: [],
            stockpileTiles: [],
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
            controller.constructStockpile({
                location,
            });
        }
        expect(controller.getState()).toEqual({
            stockpiles: expect.objectContaining({
                length: 1,
            }),
            stockpileTiles: expect.objectContaining({
                length: 9,
            }),
        });
    });
    it('should construct 3x3 building then remove', () => {
        // perform construction
        const controller = new StockpileController({
            person,
            stockpiles: [],
            stockpileTiles: [],
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
            controller.constructStockpile({
                location,
            });
        }
        expect(controller.getState()).toEqual({
            stockpiles: expect.objectContaining({
                length: 1,
            }),
            stockpileTiles: expect.objectContaining({
                length: 9,
            }),
        });
        for (const location of locations) {
            controller.constructStockpile({
                location,
            });
        }
        expect(controller.getState()).toEqual({
            stockpiles: expect.objectContaining({
                length: 0,
            }),
            stockpileTiles: expect.objectContaining({
                length: 0,
            }),
        });
    });
    it('should fail to remove tile with one item in it', () => {
        // perform construction
        const controller = new StockpileController({
            person,
            stockpiles: [],
            stockpileTiles: [],
        });
        controller.constructStockpile({
            location: {
                x: 0,
                y: 0,
            },
        });

        // add a stick to the stockpile
        const { stockpiles, stockpileTiles } = controller.getState();
        const inventoryController = new InventoryController(stockpiles[0]);
        const stickItem = inventoryController.createItemType(
            ENetworkObjectType.STICK,
            getMaxStackSize(ENetworkObjectType.STICK),
        );
        inventoryController.insertIntoStockpile(stickItem);
        const stickItem2 = inventoryController.createItemType(
            ENetworkObjectType.STICK,
            getMaxStackSize(ENetworkObjectType.STICK),
        );
        inventoryController.insertIntoStockpile(stickItem2);
        stockpiles[0].inventory = inventoryController.getInventory();
        const stickStockpileItem = stockpiles[0].inventory.slots[0];

        // attempt to remove stockpile tile even if there is a stick
        const controller2 = new StockpileController({
            person,
            stockpiles,
            stockpileTiles,
        });
        expect(() =>
            controller2.constructStockpile({
                location: {
                    x: 0,
                    y: 0,
                },
            }),
        ).toThrow('Cannot remove stockpile tile, please remove items in inventory first');

        // remove stick
        const inventoryController2 = new InventoryController(stockpiles[0]);
        inventoryController2.withdrawFromStockpile(stickStockpileItem, getMaxStackSize(stickStockpileItem.objectType));
        inventoryController2.withdrawFromStockpile(stickStockpileItem, getMaxStackSize(stickStockpileItem.objectType));
        stockpiles[0].inventory = inventoryController2.getInventory();

        // now able to remove stockpile
        const controller3 = new StockpileController({
            person,
            stockpiles,
            stockpileTiles,
        });
        controller3.constructStockpile({
            location: {
                x: 0,
                y: 0,
            },
        });
    });
    it('should fail to construct by building between two buildings', () => {
        // perform construction
        const controller = new StockpileController({
            person,
            stockpiles: [],
            stockpileTiles: [],
        });
        controller.constructStockpile({
            location: {
                x: 0,
                y: 0,
            },
        });
        controller.constructStockpile({
            location: {
                x: 400,
                y: 0,
            },
        });
        expect(() =>
            controller.constructStockpile({
                location: {
                    x: 200,
                    y: 0,
                },
            }),
        ).toThrow('Cannot connect two separate stockpiles');
    });
    it('should fail to construct by building too long east to west', () => {
        // perform construction
        const controller = new StockpileController({
            person,
            stockpiles: [],
            stockpileTiles: [],
        });
        controller.constructStockpile({
            location: {
                x: 0,
                y: 0,
            },
        });
        controller.constructStockpile({
            location: {
                x: 200,
                y: 0,
            },
        });
        controller.constructStockpile({
            location: {
                x: 400,
                y: 0,
            },
        });
        controller.constructStockpile({
            location: {
                x: 600,
                y: 0,
            },
        });
        controller.constructStockpile({
            location: {
                x: 800,
                y: 0,
            },
        });
        expect(() =>
            controller.constructStockpile({
                location: {
                    x: 1000,
                    y: 0,
                },
            }),
        ).toThrow('Stockpile is too long east to west');
    });
    it('should fail to construct by building too long north to south', () => {
        // perform construction
        const controller = new StockpileController({
            person,
            stockpiles: [],
            stockpileTiles: [],
        });
        controller.constructStockpile({
            location: {
                x: 0,
                y: 0,
            },
        });
        controller.constructStockpile({
            location: {
                x: 0,
                y: 200,
            },
        });
        controller.constructStockpile({
            location: {
                x: 0,
                y: 400,
            },
        });
        controller.constructStockpile({
            location: {
                x: 0,
                y: 600,
            },
        });
        controller.constructStockpile({
            location: {
                x: 0,
                y: 800,
            },
        });
        expect(() =>
            controller.constructStockpile({
                location: {
                    x: 0,
                    y: 1000,
                },
            }),
        ).toThrow('Stockpile is too long north to south');
    });
});
