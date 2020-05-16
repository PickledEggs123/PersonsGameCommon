import 'jest';
import { InventoryController } from './inventory';
import {
    ENetworkObjectType,
    getMaxStackSize,
    ICraftingRecipe,
    INetworkObject,
    IPerson,
    listOfRecipes,
} from './types/GameTypes';

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
        grabbedByPersonId: null,
        grabbedByNpcId: null,
        isInInventory: false,
        health: {
            rate: 0,
            max: 10,
            value: 10,
        },
        amount: 1,
        inventory: {
            rows: 1,
            columns: 10,
            slots: [],
        },
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
            isInInventory: false,
            health: {
                rate: 0,
                max: 1,
                value: 1,
            },
            amount: 1,
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
            const updatedItem = controller.pickUpItem(stick);

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
            } else {
                // other sticks that were added to stack should return stack.
                expect(updatedItem).toBeNull();
            }
            i += 1;
        }

        // craft a wattle out of the sticks
        const recipe: ICraftingRecipe = listOfRecipes.find(
            (r) => r.product === ENetworkObjectType.WATTLE_WALL,
        ) as ICraftingRecipe;
        controller.craftItem(recipe);
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
    };
    it('should pick up 20 sticks and craft a wattle', () => craftWattle(20));
    it('should pick up 100 sticks (full inventory) and craft a wattle', () => craftWattle(100));
    it('should pick up 19 sticks and fail to craft a wattle', () => {
        expect(() => craftWattle(19)).toThrow('Not enough materials for crafting');
    });
    it('should pick up 101 sticks (not enough inventory space)', () => {
        expect(() => craftWattle(101)).toThrow('Not enough room for item');
    });
    it('should generate a pick up item request', () => {
        const controller = new InventoryController(person);
        const item = generateStick(0, 0);
        expect(controller.pickUpItemRequest(person, item)).toEqual({
            personId: person.id,
            objectId: item.id,
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
});
