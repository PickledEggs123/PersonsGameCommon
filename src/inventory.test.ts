import 'jest';
import { getMaxStackSize, InventoryController, listOfRecipes } from './inventory';
import { ENetworkObjectType, ICraftingRecipe, INetworkObject, IPerson, IStockpile } from './types/GameTypes';
import { getNetworkObjectCellString } from './cell';

describe('InventoryController', () => {
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
        cell: getNetworkObjectCellString({ x: 0, y: 0 }),
        version: 0,
    };

    it('should create inventory controller', () => {
        const controller = new InventoryController(person);
        expect(controller).toBeTruthy();
    });
    /**
     * Generate a stick item for testing.
     * @param v Not used.
     * @param index The index of an array, used to generate stick id.
     */
    const generateStick = (v: any, index: number): INetworkObject => {
        return {
            id: `stick-${index}`,
            x: 0,
            y: 0,
            objectType: ENetworkObjectType.STICK,
            lastUpdate: new Date().toISOString(),
            grabbedByNpcId: null,
            grabbedByPersonId: null,
            insideStockpile: null,
            isInInventory: false,
            health: {
                rate: 0,
                max: 1,
                value: 1,
            },
            amount: 1,
            exist: true,
            state: [],
            cell: getNetworkObjectCellString({ x: 0, y: 0 }),
            version: 0,
        };
    };
    /**
     * Attempt ot craft a wattle. This function could fail.
     * @param numberOfSticks The number of sticks to pickup before crafting.
     */
    const craftWattle = (numberOfSticks: number) => {
        const controller = new InventoryController(person);

        // pick up a bunch of sticks
        const sticks: INetworkObject[] = new Array(numberOfSticks).fill(0).map(generateStick);
        let i: number = 0;
        for (const stick of sticks) {
            // pick up the stick
            const { updatedItem, stackableSlots } = controller.pickUpItem(stick);

            if (i % getMaxStackSize(stick.objectType) === 0) {
                // first stick in stack should return an updated item
                expect(updatedItem).toEqual(
                    expect.objectContaining({
                        id: stick.id,
                        grabbedByPersonId: person.id,
                        grabbedByNpcId: null,
                        isInInventory: true,
                    }),
                );
                expect(stackableSlots).toEqual([]);
            } else {
                // other sticks that were added to stack should return stack.
                expect(updatedItem).toBeNull();
                expect(stackableSlots).toEqual([
                    expect.objectContaining({
                        objectType: stick.objectType,
                        amount: (i % getMaxStackSize(stick.objectType)) + 1,
                    }),
                ]);
            }
            i += 1;
        }

        // craft a wattle out of the sticks
        const recipe: ICraftingRecipe = listOfRecipes.find(
            (r) => r.product === ENetworkObjectType.WATTLE_WALL,
        ) as ICraftingRecipe;
        const originalRngState = controller.getCraftingState();
        controller.craftItem(recipe);
        expect(controller.getCraftingState()).not.toEqual(originalRngState);
        expect(controller.getInventory()).toEqual(
            expect.objectContaining({
                rows: 1,
                columns: 10,
                slots: expect.arrayContaining([
                    expect.objectContaining({
                        objectType: ENetworkObjectType.WATTLE_WALL,
                        amount: 1,
                        grabbedByPersonId: person.id,
                        grabbedByNpcId: null,
                        isInInventory: true,
                    }),
                ]),
            }),
        );

        // drop the wattle
        const wattle = controller
            .getInventory()
            .slots.find((slot) => slot.objectType === ENetworkObjectType.WATTLE_WALL) as INetworkObject;
        controller.dropItem(wattle);
        expect(controller.getInventory()).toEqual(
            expect.objectContaining({
                rows: 1,
                columns: 10,
                slots: expect.not.arrayContaining([
                    expect.objectContaining({
                        objectType: ENetworkObjectType.WATTLE_WALL,
                        amount: 1,
                        grabbedByPersonId: person.id,
                        grabbedByNpcId: null,
                        isInInventory: true,
                    }),
                ]),
            }),
        );

        // should return information about the new rng state
        expect(controller.getCraftingState()).toBeTruthy();
        expect(controller.getState()).toEqual({
            inventory: controller.getInventory(),
            craftingState: controller.getCraftingState(),
            lastUpdate: expect.any(String),
        });
    };
    /**
     * Attempt to remove a wattle. This function could fail.
     * @param numberOfSticks The number of sticks to pickup before crafting.
     */
    const pickUpAndRemove = (numberOfSticks: number) => {
        const controller = new InventoryController(person);

        // pick up a bunch of sticks
        const sticks: INetworkObject[] = new Array(numberOfSticks).fill(0).map(generateStick);
        let i: number = 0;
        for (const stick of sticks) {
            // pick up the stick
            const { updatedItem, stackableSlots } = controller.pickUpItem(stick);

            if (i % getMaxStackSize(stick.objectType) === 0) {
                // first stick in stack should return an updated item
                expect(updatedItem).toEqual(
                    expect.objectContaining({
                        id: stick.id,
                        grabbedByPersonId: person.id,
                        grabbedByNpcId: null,
                        isInInventory: true,
                    }),
                );
                expect(stackableSlots).toEqual([]);
            } else {
                // other sticks that were added to stack should return stack.
                expect(updatedItem).toBeNull();
                expect(stackableSlots).toEqual([
                    expect.objectContaining({
                        objectType: stick.objectType,
                        amount: (i % getMaxStackSize(stick.objectType)) + 1,
                    }),
                ]);
            }
            i += 1;
        }

        // craft a wattle out of the sticks
        const recipe: ICraftingRecipe = listOfRecipes.find(
            (r) => r.product === ENetworkObjectType.WATTLE_WALL,
        ) as ICraftingRecipe;
        const originalRngState = controller.getCraftingState();
        controller.craftItem(recipe);
        expect(controller.getCraftingState()).not.toEqual(originalRngState);
        expect(controller.getInventory()).toEqual(
            expect.objectContaining({
                rows: 1,
                columns: 10,
                slots: expect.arrayContaining([
                    expect.objectContaining({
                        objectType: ENetworkObjectType.WATTLE_WALL,
                        amount: 1,
                        grabbedByPersonId: person.id,
                        grabbedByNpcId: null,
                        isInInventory: true,
                    }),
                ]),
            }),
        );

        // drop the wattle
        const wattle = controller
            .getInventory()
            .slots.find((slot) => slot.objectType === ENetworkObjectType.WATTLE_WALL) as INetworkObject;
        controller.removeCraftingRecipeItem({
            item: wattle.objectType,
            quantity: 1,
        });
        expect(controller.getInventory()).toEqual(
            expect.objectContaining({
                rows: 1,
                columns: 10,
                slots: expect.not.arrayContaining([
                    expect.objectContaining({
                        objectType: ENetworkObjectType.WATTLE_WALL,
                        amount: 1,
                        grabbedByPersonId: person.id,
                        grabbedByNpcId: null,
                        isInInventory: true,
                    }),
                ]),
            }),
        );

        // should return information about the new rng state
        expect(controller.getCraftingState()).toBeTruthy();
        expect(controller.getState()).toEqual({
            inventory: controller.getInventory(),
            craftingState: controller.getCraftingState(),
            lastUpdate: expect.any(String),
        });
    };
    it('should pick up 20 sticks and craft a wattle', () => craftWattle(20));
    it('should pick up 100 sticks (full inventory) and craft a wattle', () => craftWattle(100));
    it('should pick up 19 sticks and fail to craft a wattle', () => {
        expect(() => craftWattle(9)).toThrow('Not enough materials for crafting');
    });
    it('should pick up 101 sticks (not enough inventory space)', () => {
        expect(() => craftWattle(101)).toThrow('Not enough room for item');
    });
    it('should pick up 100 sticks then remove them all', () => pickUpAndRemove(100));
    it('should generate a pick up item request', () => {
        const controller = new InventoryController(person);
        const item = generateStick(0, 0);
        expect(controller.pickUpItemRequest(person, item)).toEqual({
            personId: person.id,
            objectId: item.id,
        });
    });
    it('should generate a withdraw item from stockpile request', () => {
        const controller = new InventoryController(person);
        const item = generateStick(0, 0);
        const amount = 1;
        const stockpile: IStockpile = {
            id: 'stockpile-id',
        } as IStockpile;
        expect(controller.withdrawItemFromStockpileRequest(person, item, stockpile, amount)).toEqual({
            personId: person.id,
            objectId: item.id,
            stockpileId: stockpile.id,
            amount,
        });
    });
    it('should generate a deposit item into stockpile request', () => {
        const controller = new InventoryController(person);
        const item = generateStick(0, 0);
        const stockpile: IStockpile = {
            id: 'stockpile-id',
        } as IStockpile;
        expect(controller.depositItemIntoStockpileRequest(person, item, stockpile)).toEqual({
            personId: person.id,
            objectId: item.id,
            stockpileId: stockpile.id,
        });
    });
    it('should generate a drop item request', () => {
        const controller = new InventoryController(person);
        const item = generateStick(0, 0);
        expect(controller.dropItemRequest(person, item)).toEqual({
            personId: person.id,
            objectId: item.id,
        });
    });
    it('should generate a pick up item request', () => {
        const controller = new InventoryController(person);
        const recipe = listOfRecipes.find((r) => r.product === ENetworkObjectType.WATTLE_WALL) as ICraftingRecipe;
        expect(controller.craftItemRequest(person, recipe)).toEqual({
            personId: person.id,
            recipeProduct: recipe.product,
        });
    });
    it('should get house id', () => {
        const controller = new InventoryController(person);
        expect(typeof controller.getHouseId()).toBe('string');
    });
    it('should add item', () => {
        const controller = new InventoryController(person);
        for (let i = 0; i < 4; i++) {
            const item = controller.createItemType(ENetworkObjectType.WATTLE_WALL);
            controller.addItem(item);
            expect(controller.getInventory()).toEqual(
                expect.objectContaining({
                    slots: [
                        expect.objectContaining({
                            objectType: ENetworkObjectType.WATTLE_WALL,
                            amount: i + 1,
                        }),
                    ],
                }),
            );
        }
    });
    describe('getMaxStackSize', () => {
        const cases: Array<{
            objectType: ENetworkObjectType;
            stackSize: number;
        }> = [
            {
                objectType: ENetworkObjectType.STICK,
                stackSize: 10,
            },
            {
                objectType: ENetworkObjectType.WATTLE_WALL,
                stackSize: 4,
            },
            {
                objectType: ENetworkObjectType.WOOD,
                stackSize: 1,
            },
        ];

        for (const c of cases) {
            const { objectType, stackSize } = c;
            it(`should get ${objectType}`, () => {
                expect(getMaxStackSize(objectType)).toBe(stackSize);
            });
        }
    });
});
