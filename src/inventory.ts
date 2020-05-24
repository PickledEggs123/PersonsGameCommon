import {
    ENetworkObjectType,
    getMaxStackSize,
    IApiPersonsObjectCraftPost,
    IApiPersonsObjectDropPost,
    IApiPersonsObjectPickUpPost,
    ICraftingRecipe,
    ICraftingRecipeItem,
    INetworkObject,
    INpc,
    IPerson,
    IPersonsInventory,
} from './types/GameTypes';
import * as seedrandom from 'seedrandom';

/**
 * When performing a pickup, drop, or craft, it will affect multiple objects.
 */
export interface IInventoryTransaction {
    /**
     * The updated copy of the original item used in the pickup, drop, or craft. If it is null,
     * the original item was deleted.
     */
    updatedItem: INetworkObject | null;
    /**
     * A list of inventory slot objects that were affected. If you pick up an item, instead of going into a new slot,
     * it could go into an existing slot.
     */
    stackableSlots: INetworkObject[];
    /**
     * A list of slots which were deleted. An example is crafting which can delete slots by using the entire stack.
     */
    deletedSlots: string[];
    /**
     * A list of modified slots. An example is crafting which can use half of a stack. The slot must also be updated.
     */
    modifiedSlots: INetworkObject[];
}

/**
 * The slot changes made while crafting an item.
 */
export interface ICraftingTransaction {
    /**
     * The new array of slots after crafting is complete.
     */
    newSlots: INetworkObject[];
    /**
     * The ids of slots that have been deleted.
     */
    deletedSlots: string[];
    /**
     * The slots which have been modified, such as a partially used stack during crafting.
     */
    modifiedSlots: INetworkObject[];
}

/**
 * A class which can handle inventory operations like picking up an item or dropping an item or crafting an item.
 */
export class InventoryController {
    /**
     * The number of rows of the inventory.
     */
    private readonly numRows: number;
    /**
     * The number of columns of the inventory.
     */
    private readonly numColumns: number;
    /**
     * The number of slots of the inventory.
     */
    private readonly numMaxSlots: number;
    /**
     * The slots of the inventory.
     */
    private slots: INetworkObject[];
    /**
     * The inventory is attached to a person.
     */
    private readonly isPerson: boolean;
    /**
     * The inventory is attached to an NPC.
     */
    private readonly isNpc: boolean;
    /**
     * The person or npc holding the inventory.
     */
    private inventoryHolder: IPerson | INpc;
    /**
     * The random number generator used to generate predictable random crafted item ids.
     */
    private rng: seedrandom.prng;

    /**
     * Use a person or npc to create an inventory controller instance. The Inventory Controller will allow simple operations
     * such as picking up item, dropping items, and crafting items. Calling [[getInventory]] will return the final state
     * of the inventory after a specific set of operations.
     * @param inventoryHolder The inventory holding person or npc.
     */
    constructor(inventoryHolder: IPerson | INpc) {
        // handle inventory slots
        const inventory = inventoryHolder.inventory;
        this.numRows = inventory.rows;
        this.numColumns = inventory.columns;
        this.numMaxSlots = this.numRows * this.numColumns;
        this.slots = inventory.slots;

        // determine if the inventory holder is a person or an npc
        this.isNpc = !!(inventoryHolder as INpc).path;
        this.isPerson = !this.isNpc;

        // copy inventory holder
        this.inventoryHolder = inventoryHolder;

        // crafting item id rng, used to predict the next rng id of a crafted item.
        this.rng = seedrandom.alea(inventoryHolder.craftingState === true ? inventoryHolder.craftingSeed : '', {
            state: inventoryHolder.craftingState,
        });
    }

    /**
     * Perform a pick up operation on an object.
     * @param itemToPickUp The object to pick up.
     * @param slots The inventory slots to pick up an item with.
     * @returns Updated item, must update original item.
     * @returns null, must destroy original item.
     */
    private pickUpItemInternal(
        itemToPickUp: INetworkObject,
        slots: INetworkObject[] = this.slots,
    ): IInventoryTransaction {
        // find a stackable slot, which is a slot of the same item type with an amount less than the max stack size
        const stackableSlot: INetworkObject | undefined = slots.find((slot) => {
            return (
                slot.objectType === itemToPickUp.objectType &&
                slot.amount + itemToPickUp.amount <= getMaxStackSize(slot.objectType)
            );
        });
        // find an empty slot which does not have an item
        const emptySlot: boolean = slots.length < this.numMaxSlots;

        // there is room for one more item if there is a stackable slot or if there is an empty slot
        const roomForOneMoreItem: boolean = !!stackableSlot || emptySlot;
        if (roomForOneMoreItem) {
            // remove duplicates, cannot pickup the same item twice
            const slotsWithoutItemToPickup = slots.filter((slot) => slot.id !== itemToPickUp.id);

            // depending on if a stackable slot was found or if an empty slot was found
            if (stackableSlot) {
                const newStackableSlot = {
                    ...stackableSlot,
                    // add amounts, a stack of 5 sticks and picking up 5 more sticks should result in a stack of 10 sticks
                    amount: stackableSlot.amount + itemToPickUp.amount,
                    isInInventory: true,
                    grabbedByPersonId: this.isPerson ? this.inventoryHolder.id : null,
                    grabbedByNpcId: this.isNpc ? this.inventoryHolder.id : null,
                    lastUpdate: new Date().toISOString(),
                };
                // found stackable slot, we're stacking the item, perform stack pick up
                this.slots = slotsWithoutItemToPickup.reduce(
                    (acc: INetworkObject[], slot: INetworkObject): INetworkObject[] => {
                        if (slot.id === stackableSlot.id) {
                            // found matching stackable slot, add amounts
                            return [...acc, newStackableSlot];
                        } else {
                            // did not find matching slot, append unmodified slot
                            return [...acc, slot];
                        }
                    },
                    [],
                );

                // original item was destroyed, instead it was stored in a stackable slot
                return {
                    updatedItem: null,
                    stackableSlots: [newStackableSlot],
                    deletedSlots: [],
                    modifiedSlots: [],
                };
                // done
            } else {
                // found empty slot, we're appending the item, append to inventory slots
                const updatedItemToPickUp: INetworkObject = {
                    ...itemToPickUp,
                    isInInventory: true,
                    grabbedByPersonId: this.isPerson ? this.inventoryHolder.id : null,
                    grabbedByNpcId: this.isNpc ? this.inventoryHolder.id : null,
                    lastUpdate: new Date().toISOString(),
                };
                this.slots = [...slotsWithoutItemToPickup, updatedItemToPickUp];
                // appended item, the item still exists, return item to update item
                return {
                    updatedItem: updatedItemToPickUp,
                    stackableSlots: [],
                    deletedSlots: [],
                    modifiedSlots: [],
                };
                // done
            }
        } else {
            // not enough room for the new item
            throw new Error('Not enough room for item');
        }
    }

    /**
     * Perform a pick up operation on an object.
     * @param itemToPickUp The object to pick up.
     * @returns Updated item, must update original item.
     * @returns null, must destroy original item.
     */
    pickUpItem(itemToPickUp: INetworkObject): IInventoryTransaction {
        return this.pickUpItemInternal(itemToPickUp);
    }

    /**
     * Return the post request used to create a pick up item request.
     * @param person The person picking up an item.
     * @param networkObject The item to pick up.
     */
    pickUpItemRequest(person: IPerson, networkObject: INetworkObject): IApiPersonsObjectPickUpPost {
        return {
            personId: person.id,
            objectId: networkObject.id,
        };
    }

    /**
     * The item to drop from the inventory.
     * @param itemToDrop The item to drop.
     * @return A copy of the new item state. The function will return a new item since it is no longer part of the inventory
     */
    dropItem(itemToDrop: INetworkObject): IInventoryTransaction {
        // remove item from inventory slots
        const slotsWithoutItem = this.slots.filter((slot) => slot.id !== itemToDrop.id);
        const itemToDropState = {
            ...itemToDrop,
            isInInventory: false,
            grabbedByNpcId: null,
            grabbedByPersonId: null,
            lastUpdate: new Date().toISOString(),
        };

        // update inventory and item
        this.slots = slotsWithoutItem;
        return {
            updatedItem: itemToDropState,
            stackableSlots: [],
            deletedSlots: [],
            modifiedSlots: [],
        };
    }

    /**
     * Create a network post request for dropping an item.
     * @param person The person dropping an item.
     * @param networkObject The item to drop.
     */
    dropItemRequest(person: IPerson, networkObject: INetworkObject): IApiPersonsObjectDropPost {
        return {
            personId: person.id,
            objectId: networkObject.id,
        };
    }

    /**
     * Get a copy of the current inventory state after an operation.
     */
    getInventory(): IPersonsInventory {
        return {
            rows: this.numRows,
            columns: this.numColumns,
            slots: this.slots,
        };
    }

    /**
     * Get the new crafting state after generating a crafted item.
     */
    getCraftingState(): seedrandom.State {
        return this.rng.state();
    }

    /**
     * Return the total state change to the inventory holder. This combines the new inventory and crafting state.
     */
    getState(): Partial<IPerson | INpc> {
        return {
            inventory: this.getInventory(),
            craftingState: this.getCraftingState(),
        };
    }

    /**
     * Remove a recipe item from copy of slots.
     * @param recipeItem The recipe containing item type and quantity.
     * @param copyOfSlots The copy of the inventory slots to remove items from.
     * @param modifiedSlots The list of modified slots.
     */
    private static internalRemoveCraftingRecipeItem(
        recipeItem: ICraftingRecipeItem,
        {
            copyOfSlots,
            modifiedSlots,
        }: {
            copyOfSlots: INetworkObject[];
            modifiedSlots: INetworkObject[];
        },
    ) {
        // get recipe amount needed
        let recipeItemAmountLeft = recipeItem.quantity;
        // for each slot in inventory
        for (const slot of copyOfSlots) {
            // found matching slot
            if (slot.objectType === recipeItem.item) {
                // determine amount to use, either full slot amount or full recipe amount left
                const amountToUse = Math.min(slot.amount, recipeItemAmountLeft);

                // subtract amount used from slot and recipe amount left
                slot.amount -= amountToUse;
                slot.lastUpdate = new Date().toISOString();
                recipeItemAmountLeft -= amountToUse;

                // add a modified slot if it is not in a list of already modified slots
                if (!modifiedSlots.map((s) => s.id).includes(slot.id)) {
                    modifiedSlots.push(slot);
                }
            }
        }

        // did not have all resources required by recipe, return false for failed crafting
        if (recipeItemAmountLeft > 0) {
            throw new Error('Not enough materials for crafting');
        }

        return {
            copyOfSlots,
            modifiedSlots,
        };
    }

    /**
     * Remove a crafting recipe item from the inventory.
     * @param recipeItem Contains item type and quantity to remove from inventory.
     */
    removeCraftingRecipeItem(recipeItem: ICraftingRecipeItem) {
        let copyOfSlots: INetworkObject[] = this.slots.map((slot) => ({ ...slot }));
        let modifiedSlots: INetworkObject[] = [];

        const result = InventoryController.internalRemoveCraftingRecipeItem(recipeItem, {
            copyOfSlots,
            modifiedSlots,
        });
        copyOfSlots = result.copyOfSlots;
        modifiedSlots = result.modifiedSlots;

        const newSlots = copyOfSlots.filter((slot) => slot.amount > 0);
        this.slots = newSlots;
        // remove empty slots
        return {
            // new slots are all slots which have more than 0 items
            newSlots,
            // deleted slots are slots which have 0 items
            deletedSlots: copyOfSlots.filter((slot) => slot.amount === 0).map((slot) => slot.id),
            // modified slots are slots which were modified and still have items
            modifiedSlots: modifiedSlots.filter((slot) => slot.amount > 0),
        };
    }

    /**
     * Subtract crafting materials from inventory slots.
     * @param recipe The recipe to process.
     */
    private getSlotsAfterCraftingMaterials(recipe: ICraftingRecipe): ICraftingTransaction {
        let copyOfSlots: INetworkObject[] = this.slots.map((slot) => ({ ...slot }));
        let modifiedSlots: INetworkObject[] = [];

        // for each recipe item
        for (const recipeItem of recipe.items) {
            const result = InventoryController.internalRemoveCraftingRecipeItem(recipeItem, {
                copyOfSlots,
                modifiedSlots,
            });
            copyOfSlots = result.copyOfSlots;
            modifiedSlots = result.modifiedSlots;
        }

        // remove empty slots
        return {
            // new slots are all slots which have more than 0 items
            newSlots: copyOfSlots.filter((slot) => slot.amount > 0),
            // deleted slots are slots which have 0 items
            deletedSlots: copyOfSlots.filter((slot) => slot.amount === 0).map((slot) => slot.id),
            // modified slots are slots which were modified and still have items
            modifiedSlots: modifiedSlots.filter((slot) => slot.amount > 0),
        };
    }

    /**
     * Create the basic id string for all inventory items. Use the RNG to create predictable yet random id strings.
     */
    private newItemId(): string {
        return `${this.inventoryHolder.id}-${this.rng.int32()}`;
    }

    /**
     * The id string of all crafted items.
     */
    private newCraftingItemId(): string {
        return `crafted-item-${this.newItemId()}`;
    }

    /**
     * The id string of a new houses.
     */
    getHouseId(): string {
        return `house-${this.newItemId()}`;
    }

    /**
     * Create a new item of a given object type.
     * @param objectType The type of item to create.
     */
    createItemType(objectType: ENetworkObjectType): INetworkObject {
        return {
            id: this.newCraftingItemId(),
            x: this.inventoryHolder.x,
            y: this.inventoryHolder.y,
            objectType,
            amount: 1,
            isInInventory: true,
            grabbedByNpcId: this.isNpc ? this.inventoryHolder.id : null,
            grabbedByPersonId: this.isPerson ? this.inventoryHolder.id : null,
            lastUpdate: new Date().toISOString(),
            health: {
                rate: 0,
                max: 1,
                value: 1,
            },
        };
    }

    /**
     * Convert items in the inventory into another item.
     */
    craftItem(recipe: ICraftingRecipe): IInventoryTransaction {
        const { newSlots: slotsAfterCrafting, deletedSlots, modifiedSlots } = this.getSlotsAfterCraftingMaterials(
            recipe,
        );
        // there was enough materials to craft the recipe

        // create item and pick it up
        const recipeItem: INetworkObject = this.createItemType(recipe.product);
        return {
            ...this.pickUpItemInternal(recipeItem, slotsAfterCrafting),
            deletedSlots,
            modifiedSlots,
        };
    }

    /**
     * Add an item to the inventory.
     * @param item The item to add.
     */
    addItem(item: INetworkObject): IInventoryTransaction {
        return this.pickUpItemInternal(item);
    }

    /**
     * Create a crafting api request for crafting an item.
     * @param person The person crafting an item.
     * @param recipe The recipe to craft.
     */
    craftItemRequest(person: IPerson, recipe: ICraftingRecipe): IApiPersonsObjectCraftPost {
        return {
            personId: person.id,
            recipeProduct: recipe.product,
        };
    }
}
