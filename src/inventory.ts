import {
    getMaxStackSize,
    IApiPersonsObjectCraftPost,
    IApiPersonsObjectDropPost,
    IApiPersonsObjectPickUpPost,
    ICraftingRecipe,
    INetworkObject,
    INpc,
    IPerson,
    IPersonsInventory,
} from './types/GameTypes';

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
    ): INetworkObject | null {
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
                // found stackable slot, we're stacking the item, perform stack pick up
                this.slots = slotsWithoutItemToPickup.reduce(
                    (acc: INetworkObject[], slot: INetworkObject): INetworkObject[] => {
                        if (slot.id === stackableSlot.id) {
                            // found matching stackable slot, add amounts
                            return [
                                ...acc,
                                {
                                    ...slot,
                                    // add amounts, a stack of 5 sticks and picking up 5 more sticks should result in a stack of 10 sticks
                                    amount: slot.amount + itemToPickUp.amount,
                                    isInInventory: true,
                                    grabbedByPersonId: this.isPerson ? this.inventoryHolder.id : null,
                                    grabbedByNpcId: this.isNpc ? this.inventoryHolder.id : null,
                                    lastUpdate: new Date().toISOString(),
                                },
                            ];
                        } else {
                            // did not find matching slot, append unmodified slot
                            return [...acc, slot];
                        }
                    },
                    [],
                );

                // original item was destroyed, return null, must also destroy original item
                return null;
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
                return updatedItemToPickUp;
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
    pickUpItem(itemToPickUp: INetworkObject): INetworkObject | null {
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
    dropItem(itemToDrop: INetworkObject): INetworkObject {
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
        return itemToDropState;
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
     * Subtract crafting materials from inventory slots.
     * @param recipe The recipe to process.
     */
    private getSlotsAfterCraftingMaterials(recipe: ICraftingRecipe): INetworkObject[] {
        const copyOfSlots = this.slots.map((slot) => ({ ...slot }));

        // for each recipe item
        for (const recipeItem of recipe.items) {
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
                }
            }

            // did not have all resources required by recipe, return false for failed crafting
            if (recipeItemAmountLeft > 0) {
                throw new Error('Not enough materials for crafting');
            }
        }

        // remove empty slots
        return copyOfSlots.filter((slot) => slot.amount > 0);
    }

    /**
     * Convert items in the inventory into another item.
     */
    craftItem(recipe: ICraftingRecipe): INetworkObject {
        const slotsAfterCrafting = this.getSlotsAfterCraftingMaterials(recipe);
        // there was enough materials to craft the recipe

        const id = new Array(10)
            .fill(0)
            .map(() => Math.floor(Math.random() * 36).toString(36))
            .join('');
        const recipeItem: INetworkObject = {
            id,
            x: this.inventoryHolder.x,
            y: this.inventoryHolder.y,
            objectType: recipe.product,
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
        this.pickUpItemInternal(recipeItem, slotsAfterCrafting);
        return recipeItem;
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
