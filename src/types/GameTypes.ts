import * as seedrandom from 'seedrandom';
import { TDayNightTime } from './time';

/**
 * The base interface for all game objects.
 */
export interface IObject {
    /**
     * The left to right position of the object in the game world.
     */
    x: number;
    /**
     * The top to bottom position of the object in the game world.
     */
    y: number;
}

/**
 * The type of object being networked. They are drawn differently and behave differently
 */
export enum ENetworkObjectType {
    STOCKPILE = 'STOCKPILE',
    PERSON = 'PERSON',
    /**
     * Manufacturing products.
     */
    CHAIR = 'CHAIR',
    TABLE = 'TABLE',
    BOX = 'BOX',
    CAR = 'CAR',
    VENDING_MACHINE = 'VENDING_MACHINE',
    /**
     * Forestry objects.
     */
    TREE = 'TREE',
    STICK = 'STICK',
    WOOD = 'WOOD',
    AXE = 'AXE',
    CHAINSAW = 'CHAINSAW',
    /**
     * Pottery objects.
     */
    POND = 'POND',
    MUD = 'MUD',
    CLAY = 'CLAY',
    REED = 'REED',
    /**
     * Agriculture objects.
     */
    PLOT = 'PLOT',
    WHEAT = 'WHEAT',
    FLOUR = 'FLOUR',
    BREAD = 'BREAD',
    CORN = 'CORN',
    RICE = 'RICE',
    HOE = 'HOE',
    SEED = 'SEED',
    CHICKEN = 'CHICKEN',
    EGG = 'EGG',
    COW = 'COW',
    MILK = 'MILK',
    CHEESE = 'CHEESE',
    PIG = 'PIG',
    FISH = 'FISH',
    MEAT = 'MEAT',
    /**
     * Mining objects.
     */
    ROCK = 'ROCK',
    STONE = 'STONE',
    IRON = 'IRON',
    COAL = 'COAL',
    /*
     * Petroleum objects.
     */
    PUMP_JACK = 'PUMP_JACK',
    OIL = 'OIL',
    GAS_WELL = 'GAS_WELL',
    PROPANE = 'PROPANE',
    HELIUM = 'HELIUM',
    /**
     * Construction objects.
     */
    WATTLE_WALL = 'WATTLE_WALL',
    TWO_BY_FOUR = 'TWO_BY_FOUR',
    PLANK = 'PLANK',
    BRICK = 'BRICK',
}

/**
 * The grouping of object types.
 */
export enum ENetworkObjectGroup {
    NATURAL_RESOURCE = 'NATURAL_RESOURCE',
    BUILDING = 'BUILDING',
    PERSON = 'PERSON',
    FURNITURE = 'FURNITURE',
    STORAGE = 'STORAGE',
    VEHICLE = 'VEHICLE',
    TOOL = 'TOOL',
    ANIMAL = 'ANIMAL',
    /**
     * The item is a raw resource. Only allow raw resource into the stockpile.
     */
    RESOURCE = 'RESOURCE',
    /**
     * The item is food. It can be eaten. Only allow food into the stockpile.
     */
    FOOD = 'FOOD',
    /**
     * The item is construction material. Only allow construction material into
     * the stockpile.
     */
    CONSTRUCTION = 'CONSTRUCTION',
}

export interface INetworkObjectTypeData {
    group: ENetworkObjectGroup;
    name: string;
    description: string;
}
const networkObjectTypeData: { [type: string]: INetworkObjectTypeData } = {
    [ENetworkObjectType.STOCKPILE]: {
        group: ENetworkObjectGroup.BUILDING,
        name: 'Stockpile',
        description: 'Store items in bulk.',
    },
    [ENetworkObjectType.PERSON]: {
        group: ENetworkObjectGroup.PERSON,
        name: 'Person',
        description: 'Able to perform work',
    },
    [ENetworkObjectType.CHAIR]: {
        group: ENetworkObjectGroup.FURNITURE,
        name: 'Chair',
        description: 'Used for relaxing',
    },
    [ENetworkObjectType.TABLE]: {
        group: ENetworkObjectGroup.FURNITURE,
        name: 'Table',
        description: 'Used for placing small items onto and eating',
    },
    [ENetworkObjectType.BOX]: {
        group: ENetworkObjectGroup.STORAGE,
        name: 'Box',
        description: 'Used for storing small items',
    },
    [ENetworkObjectType.CAR]: {
        group: ENetworkObjectGroup.VEHICLE,
        name: 'Car',
        description: 'Used for traveling faster',
    },
    [ENetworkObjectType.VENDING_MACHINE]: {
        group: ENetworkObjectGroup.FURNITURE,
        name: 'Vending Machine',
        description: 'Used for selling items',
    },
    [ENetworkObjectType.TREE]: {
        group: ENetworkObjectGroup.NATURAL_RESOURCE,
        name: 'Tree',
        description: 'Used for gathering wood',
    },
    [ENetworkObjectType.STICK]: {
        group: ENetworkObjectGroup.RESOURCE,
        name: 'Stick',
        description: 'Used for producing stick houses and fire',
    },
    [ENetworkObjectType.WOOD]: {
        group: ENetworkObjectGroup.RESOURCE,
        name: 'Wood',
        description: 'Used for producing furniture and more expensive housing',
    },
    [ENetworkObjectType.AXE]: {
        group: ENetworkObjectGroup.TOOL,
        name: 'Axe',
        description: 'Used for harvesting wood from trees',
    },
    [ENetworkObjectType.CHAINSAW]: {
        group: ENetworkObjectGroup.TOOL,
        name: 'Chainsaw',
        description: 'Used for harvesting more wood faster',
    },
    [ENetworkObjectType.POND]: {
        group: ENetworkObjectGroup.NATURAL_RESOURCE,
        name: 'Pond',
        description: 'Used for harvesting mud and clay for bricks',
    },
    [ENetworkObjectType.MUD]: {
        group: ENetworkObjectGroup.RESOURCE,
        name: 'Mud',
        description: 'Used for filling in stick walls and producing cheap bricks',
    },
    [ENetworkObjectType.CLAY]: {
        group: ENetworkObjectGroup.RESOURCE,
        name: 'Clay',
        description: 'Used for producing pottery',
    },
    [ENetworkObjectType.REED]: {
        group: ENetworkObjectGroup.RESOURCE,
        name: 'Reed',
        description: 'Used for producing baskets',
    },
    [ENetworkObjectType.PLOT]: {
        group: ENetworkObjectGroup.BUILDING,
        name: 'Plot',
        description: 'Used for producing food',
    },
    [ENetworkObjectType.WHEAT]: {
        group: ENetworkObjectGroup.RESOURCE,
        name: 'Wheat',
        description: 'Used for producing bread',
    },
    [ENetworkObjectType.CORN]: {
        group: ENetworkObjectGroup.RESOURCE,
        name: 'Corn',
        description: 'Used for eating',
    },
    [ENetworkObjectType.FLOUR]: {
        group: ENetworkObjectGroup.RESOURCE,
        name: 'Flour',
        description: 'Used for producing bread and soup',
    },
    [ENetworkObjectType.BREAD]: {
        group: ENetworkObjectGroup.RESOURCE,
        name: 'Bread',
        description: 'Used for eating',
    },
    [ENetworkObjectType.RICE]: {
        group: ENetworkObjectGroup.RESOURCE,
        name: 'Rice',
        description: 'Used for eating',
    },
    [ENetworkObjectType.HOE]: {
        group: ENetworkObjectGroup.TOOL,
        name: 'Hoe',
        description: 'Used for plowing plots for farming',
    },
    [ENetworkObjectType.SEED]: {
        group: ENetworkObjectGroup.RESOURCE,
        name: 'Seed',
        description: 'Used for producing plants',
    },
    [ENetworkObjectType.CHICKEN]: {
        group: ENetworkObjectGroup.ANIMAL,
        name: 'Chicken',
        description: 'Used for meat and eggs',
    },
    [ENetworkObjectType.EGG]: {
        group: ENetworkObjectGroup.FOOD,
        name: 'Egg',
        description: 'Used for eating',
    },
    [ENetworkObjectType.COW]: {
        group: ENetworkObjectGroup.ANIMAL,
        name: 'Cow',
        description: 'Used for meat and milk',
    },
    [ENetworkObjectType.MILK]: {
        group: ENetworkObjectGroup.FOOD,
        name: 'Milk',
        description: 'Used for eating and cheese',
    },
    [ENetworkObjectType.CHEESE]: {
        group: ENetworkObjectGroup.FOOD,
        name: 'Cheese',
        description: 'Used for eating',
    },
    [ENetworkObjectType.PIG]: {
        group: ENetworkObjectGroup.ANIMAL,
        name: 'Pig',
        description: 'Used for meat',
    },
    [ENetworkObjectType.FISH]: {
        group: ENetworkObjectGroup.ANIMAL,
        name: 'Fish',
        description: 'Used for meat',
    },
    [ENetworkObjectType.MEAT]: {
        group: ENetworkObjectGroup.FOOD,
        name: 'Meat',
        description: 'Used for eating',
    },
    [ENetworkObjectType.ROCK]: {
        group: ENetworkObjectGroup.NATURAL_RESOURCE,
        name: 'Rock',
        description: 'Used for producing stone and ore',
    },
    [ENetworkObjectType.STONE]: {
        group: ENetworkObjectGroup.RESOURCE,
        name: 'Stone',
        description: 'Used for producing tools',
    },
    [ENetworkObjectType.IRON]: {
        group: ENetworkObjectGroup.RESOURCE,
        name: 'Iron',
        description: 'Used for producing advanced tools',
    },
    [ENetworkObjectType.COAL]: {
        group: ENetworkObjectGroup.RESOURCE,
        name: 'Coal',
        description: 'Used for producing advanced tools',
    },
    [ENetworkObjectType.PUMP_JACK]: {
        group: ENetworkObjectGroup.BUILDING,
        name: 'Pump Jack',
        description: 'Used for drilling oil',
    },
    [ENetworkObjectType.OIL]: {
        group: ENetworkObjectGroup.RESOURCE,
        name: 'Oil',
        description: 'Used for producing advanced materials',
    },
    [ENetworkObjectType.GAS_WELL]: {
        group: ENetworkObjectGroup.BUILDING,
        name: 'Gas Well',
        description: 'Used for producing propane and helium',
    },
    [ENetworkObjectType.PROPANE]: {
        group: ENetworkObjectGroup.RESOURCE,
        name: 'Propane',
        description: 'Used for cooking',
    },
    [ENetworkObjectType.HELIUM]: {
        group: ENetworkObjectGroup.RESOURCE,
        name: 'Helium',
        description: 'Used for inflatable objects',
    },
    [ENetworkObjectType.WATTLE_WALL]: {
        group: ENetworkObjectGroup.CONSTRUCTION,
        name: 'Wattle',
        description: 'Used for producing mud huts',
    },
    [ENetworkObjectType.TWO_BY_FOUR]: {
        group: ENetworkObjectGroup.CONSTRUCTION,
        name: '2x4',
        description: 'Used for producing wooden house frames',
    },
    [ENetworkObjectType.PLANK]: {
        group: ENetworkObjectGroup.CONSTRUCTION,
        name: 'Plank',
        description: 'Used for producing wooden floors and walls',
    },
    [ENetworkObjectType.BRICK]: {
        group: ENetworkObjectGroup.CONSTRUCTION,
        name: 'Brick',
        description: 'Used for producing brick houses',
    },
};

export const getNetworkObjectTypeGroup = (type: ENetworkObjectType): ENetworkObjectGroup => {
    if (networkObjectTypeData[type]) {
        return networkObjectTypeData[type].group;
    } else {
        throw new Error('No data for ENetworkObjectType');
    }
};
export const getNetworkObjectTypeName = (type: ENetworkObjectType): string => {
    if (networkObjectTypeData[type]) {
        return networkObjectTypeData[type].name;
    } else {
        throw new Error('No data for ENetworkObjectType');
    }
};
export const getNetworkObjectTypeDescription = (type: ENetworkObjectType): string => {
    if (networkObjectTypeData[type]) {
        return networkObjectTypeData[type].description;
    } else {
        throw new Error('No data for ENetworkObjectType');
    }
};

/**
 * Contains all health related information for an object.
 */
export interface IObjectHealth {
    /**
     * The current amount of health.
     */
    value: number;
    /**
     * The maximum amount of health.
     */
    max: number;
    /**
     * The rate of healing per server tick.
     */
    rate: number;
}

/**
 * Contain state changes of the object throughout it's lifetime.
 */
export interface INetworkObjectState<T extends INetworkObjectBase> {
    time: string;
    state: Partial<T>;
}

export interface INetworkObjectBase extends IObject {
    /**
     * The randomly generated unique id of the person. Each person has a unique id for selecting and controlling them.
     */
    id: string;
    /**
     * The type of network object.
     */
    objectType: ENetworkObjectType;
    /**
     * When the person was last updated. Used to keep track of which version of the person data is more up to date. The
     * local copy sometimes can be more up to date than the network copy, so the network copy has to be modified with
     * local data. If the person moves, they will send their current position to the server. They will continue moving,
     * making the sent position out of date. The server will confirm the position update then send back the old position.
     * This field allows the game to reject old copies of position, favoring the newer local position. Without this, the
     * person will teleport backwards, causing a constant teleport backwards glitch.
     */
    lastUpdate: string;
    /**
     * Contains the health related information of the object.
     */
    health: IObjectHealth;
    /**
     * The cell position id of the object. Each object is divided into cells
     * for quicker database lookups. Instead of searching all possible objects,
     * you can filter only objects that match a specific cell id.
     */
    cell: string;
    /**
     * The cell version of the object. There can be multiple versions of the
     * same object, a [[ICellLock]] document and a [[ICellVersion]] document is
     * used to reference the network object. A single CellLock per cell is
     * used to create and destroy CellVersions which reference network objects.
     */
    version: number;
}

export interface INetworkObject extends INetworkObjectBase {
    /**
     * How many copies of an item is in this stack of items.
     */
    amount: number;
    /**
     * If the object exists.
     */
    exist: boolean;
    /**
     * A list of state changes on the object through time.
     */
    state: INetworkObjectState<INetworkObject>[];
    /**
     * This object is being grabbed by this person. The object will follow the person.
     */
    grabbedByPersonId: string | null;
    /**
     * This object is being grabbed by an NPC. The object will follow the npc.
     */
    grabbedByNpcId: string | null;
    /**
     * This object is inside of a stockpile.
     */
    insideStockpile: string | null;
    /**
     * This object is inside an inventory, it should not be rendered in the world.
     */
    isInInventory: boolean;
}

/**
 * A person's inventory.
 */
export interface IPersonsInventory {
    rows: number;
    columns: number;
    slots: INetworkObject[];
}

/**
 * An object or person which contains an inventory.
 */
export interface IInventoryHolder extends INetworkObjectBase {
    /**
     * The inventory for the person.
     */
    inventory: IPersonsInventory;
    /**
     * Crafting Seed for crafted item ids.
     */
    craftingSeed: string;
    /**
     * The state of the crafting item id rng.
     */
    craftingState: seedrandom.State | true;
}

/**
 * The base interface for all people in the game.
 */
export interface IPerson extends INetworkObjectBase, IInventoryHolder {
    /**
     * The customizable shirt color of the person.
     */
    shirtColor: string;
    /**
     * The customizable pant color of the person.
     */
    pantColor: string;
    /**
     * The car the person is currently in.
     */
    carId: string | null;
    /**
     * The amount of money the person has.
     */
    cash: number;
    /**
     * The amount of credit the person has.
     */
    creditLimit: number;
    /**
     * The person is a person type.
     */
    objectType: ENetworkObjectType.PERSON;
}

/**
 * A possible resource spawn.
 */
export interface IResourceSpawn {
    /**
     * The type of object to spawn.
     */
    type: ENetworkObjectType;
    /**
     * The probability of the object spawning.
     */
    probability: number;
    /**
     * The amount of milliseconds for the resource to spawn again.
     */
    spawnTime: number;
}

/**
 * Represent a resource that can generate items when clicked. An example is a tree which spawns wood or a rock that spawns
 * stone.
 */
export interface IResource extends INetworkObjectBase {
    /**
     * A string that is used in a random number generator to generate the probability of a spawn.
     */
    spawnSeed: string;
    /**
     * A list of different spawns and their probability.
     */
    spawns: IResourceSpawn[];
    /**
     * The current state of the random number generator.
     */
    spawnState: seedrandom.State | true;
    /**
     * If the resource is depleted.
     */
    depleted: boolean;
    /**
     * The time of the resource being ready.
     */
    readyTime: string;
    /**
     * A list of state changes on the object through time.
     */
    state: INetworkObjectState<IResource>[];
    /**
     * The terrain tile the resource is located within.
     */
    terrainTile: string;
}

/**
 * A tree that can spawn wood.
 */
export interface ITree extends IResource {
    /**
     * The seed that changes the look of a tree.
     */
    treeSeed: string;
    /**
     * The tree is of object type tree.
     */
    objectType: ENetworkObjectType.TREE;
}

/**
 * Represent a terrain tile position.
 */
export interface ITerrainTilePosition {
    tileX: number;
    tileY: number;
}

/**
 * Represent an area tile position.
 */
export interface IAreaTilePosition {
    tileX: number;
    tileY: number;
}

/**
 * Represent a biome tile position.
 */
export interface IBiomeTilePosition {
    tileX: number;
    tileY: number;
}

/**
 * Represent a continent tile position.
 */
export interface IContinentTilePosition {
    tileX: number;
    tileY: number;
}

/**
 * Represent one of the terrain tile positions.
 */
export type TTerrainTilePosition =
    | ITerrainTilePosition
    | IAreaTilePosition
    | IBiomeTilePosition
    | IContinentTilePosition;

/**
 * Represent a continental shelf which produces land or ocean depending on if they move toward or away from another continent.
 */
export interface IContinentalShelf extends IObject {
    xDirection: number;
    yDirection: number;
    corners: IObject[];
    neighbors: IObject[];
}

export enum EBiomeType {
    BEACH = 'BEACH',
    DESERT = 'DESERT',
    PLAIN = 'PLAIN',
    FOREST = 'FOREST',
    JUNGLE = 'JUNGLE',
}

/**
 * The different altitudes of continents.
 */
export enum EAltitudeType {
    /**
     * 0 Altitude, open ocean.
     */
    OCEAN = 'OCEAN',
    /**
     * The terrain is low land which is swampy, lots of pond and mud.
     */
    SWAMP = 'SWAMP',
    /**
     * The altitude is medium height and dry, lots of trees.
     */
    PLAIN = 'PLAIN',
    /**
     * The altitude is medium and the land is hilly, some trees.
     */
    HILL = 'HILL',
    /**
     * The altitude is high and there are lots of rocks, some trees and some ponds.
     */
    MOUNTAIN = 'MOUNTAIN',
    /**
     * The altitude is very high, there are only rocks.
     */
    ROCKY = 'ROCKY',
}

/**
 * The land is a continent which contains the altitude portion of the biome. Different altitudes will produce different
 * lands.
 */
export interface IContinent extends IObject {
    altitudeType: EAltitudeType;
    corners: IObject[];
}

export interface IBiome extends IObject {
    altitudeType: EAltitudeType;
    corners: IObject[];
}

export interface IArea extends IObject {
    altitudeType: EAltitudeType;
    biomeType: EBiomeType;
    corners: IObject[];
}

/**
 * Represent a data structure for a voronoi diagram.
 */
export interface IVoronoi {
    /**
     * The point of the voronoi diagram.
     */
    point: IObject;
    /**
     * The points that are adjacent to [[point]].
     */
    corners: IObject[];
    /**
     * A list of neighboring points.
     */
    neighbors: IObject[];
}

/**
 * An item in the inventory list of a [[IVendor]].
 */
export interface IVendorInventoryItem {
    /**
     * The type of object being sold.
     */
    objectType: ENetworkObjectType;
    /**
     * The price of the object.
     */
    price: number;
}

/**
 * An object that sells other objects.
 */
export interface IVendor extends INetworkObjectBase {
    inventory: IVendorInventoryItem[];
}

/**
 * The type of owner of a building.
 */
export enum EOwnerType {
    // the owner is a person
    PERSON = 'PERSON',
    // the owner is a npc
    NPC = 'NPC',
}

/**
 * The object which represents an owner of a wall, floor, or house.
 */
export interface IOwner {
    ownerType: EOwnerType;
    ownerId: string;
}

/**
 * The type of building. Different buildings will produce different jobs.
 */
export enum EBuildingDesignation {
    /**
     * The building is a home of an npc. The npc will perform basic tasks such
     * as gathering, basic crafting, and hauling materials.
     */
    HOUSE = 'HOUSE',
    /**
     * The building is a trade depot which will post items within nearby stockpiles
     * for sale. Trade depot will have large ranges, it can access stockpiles within
     * a 3 cell radius or 1 minute walking radius. It will sell to other trade
     * depots within a 15 cell radius or 5 minute walking radius.
     */
    TRADE_DEPOT = 'TRADE_DEPOT',
    /**
     * The building will contain advanced tools used for producing items. It will
     * access stockpiles within the same cell to craft items using machines.
     */
    FACTORY = 'FACTORY',
}

/**
 * Houses provide a location for NPCs to store things, work from, and sleep.
 */
export interface IHouse extends INetworkObjectBase, IOwner {
    /**
     * The npc id of the NPC that lives in the house.
     */
    npcId: string;
    /**
     * The type of building.
     */
    buildingDesignation: EBuildingDesignation;
}

/**
 * A building or land area which can store items.
 */
export interface IStockpile extends INetworkObjectBase, IOwner, IInventoryHolder {
    /**
     * The inventory of the stockpile.
     */
    inventory: IPersonsInventory;
    /**
     * The stockpile is object type stockpile.
     */
    objectType: ENetworkObjectType.STOCKPILE;
    /**
     * The state changes of the inventory over time.
     */
    inventoryState: IInventoryState[];
    /**
     * A list of accepted item groups within the stockpile.
     */
    acceptedNetworkObjectGroups: ENetworkObjectGroup[];
}

/**
 * A tile or 200 by 200 pixel area on the ground, related to a stockpile.
 */
export interface IStockpileTile extends INetworkObjectBase, IOwner {
    /**
     * The id of the stockpile the stockpile tile is related to.
     */
    stockpileId: string;
    /**
     * The index into the stockpile inventory. Used to render slices of the stockpile.
     */
    stockpileIndex: number;
}

/**
 * The direction of the wall.
 */
export enum EWallDirection {
    HORIZONTAL = 'HORIZONTAL',
    VERTICAL = 'VERTICAL',
}

/**
 * The pattern of the wall.
 */
export enum EWallPattern {
    WATTLE = 'WATTLE',
}

/**
 * A wall instance which represent a wall tile of a house.
 */
export interface IWall extends INetworkObjectBase, IOwner {
    direction: EWallDirection;
    wallPattern: EWallPattern;
}

/**
 * Patterns for the floor.
 */
export enum EFloorPattern {
    DIRT = 'DIRT',
}

/**
 * A floor tile for a house.
 */
export interface IFloor extends INetworkObjectBase, IOwner {
    /**
     * The pattern of the floor.
     */
    floorPattern: EFloorPattern;
    /**
     * The house id that the floor is related to.
     */
    houseId: string;
}

/**
 * The type of [[IDrawable object]].
 */
export enum EDrawableType {
    /**
     * When rendering people, people are drawn on top of objects at the same screen height.
     */
    PERSON = 'PERSON',
    /**
     * The [[IDrawable]] is a normal object.
     */
    OBJECT = 'OBJECT',
    /**
     * A Tag is UI element which should appear on top of everything.
     */
    TAG = 'TAG',
}

/**
 * There are different types of industrial specializations.
 */
export enum ELotZoneIndustrialType {
    /**
     * The first four industries are primary industries (they generate all of the resources). The resources can then be
     * sold and shipped to secondary industries which will craft more complex objects.
     */
    /**
     * Specialize in the production of wood products. Used for construction, furniture and early energy production.
     */
    FORESTRY = 'FORESTRY',
    /**
     * Specialize in the production of food and animal products. NPCs will buy a specific amount of food every day and
     * Persons can eat food to heal.
     */
    AGRICULTURE = 'AGRICULTURE',
    /*
    Specialize in the production of stone and iron. Stone and iron is used for construction, furniture and cars. Coal
    is used for middle energy production.
     */
    MINING = 'MINING',
    /**
     * Specialize in the production of oil and natural gas. Oil is used for plastics (cheap consumer goods), cars, and
     * energy production. Natural gas is used for middle energy production.
     */
    PETROLEUM = 'PETROLEUM',
    /**
     * Specialize in the production of complex objects such as tools, furniture, cars, and goods.
     */
    MANUFACTURING = 'MANUFACTURING',
    /**
     * Specialize in the storing and shipping of resources and objects.
     */
    LOGISTICS = 'LOGISTICS',
}

/**
 * The type of the lot.
 */
export enum ELotZone {
    RESIDENTIAL = 'RESIDENTIAL',
    COMMERCIAL = 'COMMERCIAL',
    INDUSTRIAL = 'INDUSTRIAL',
}

/**
 * A city is made of lots. Each lot has locations to place houses, roads, and stores.
 */
export interface ILot extends IObject {
    id: string;
    owner: string | null;
    format: string | null;
    width: number;
    height: number;
    zone: ELotZone;
    buyOffers: IApiLotsBuyPost[] | null;
    sellOffers: IApiLotsSellPost[] | null;
}

/**
 * Represent a change in the number of workers over time. An array of worker shifts can be interpolated to guess which
 * workers will be available at a moment in time.
 */
export interface IWorkerShift {
    /**
     * The id of the working npc.
     */
    npcId: string;
    /**
     * The start time of the NPC.
     */
    startTime: string;
    /**
     * The end time of the NPC.
     */
    endTime: string;
}

/**
 * A lot that specializes in the production of goods.
 */
export interface ILotIndustrial extends ILot {
    zone: ELotZone.INDUSTRIAL;
    industryType: ELotZoneIndustrialType;
    /**
     * A list of present workers.
     */
    workers: string[];
    /**
     * A list of worker shift changes. Used to compute [[workers]] for any moment in time.
     */
    workersOverTime: IWorkerShift[];
    /**
     * A list of inventory for sale by the industrial lot.
     */
    inventory: ILogisticsInventoryItem[];
    toolsUsed: ENetworkObjectType[];
}

/**
 * An industrial lot that specializes in producing wood.
 */
export interface ILotForestry extends ILotIndustrial {
    zone: ELotZone.INDUSTRIAL;
    industryType: ELotZoneIndustrialType.FORESTRY;
}

/**
 * The type of agriculture the lot engages in.
 */
export enum EAgricultureType {
    WHEAT = 'WHEAT',
    CORN = 'CORN',
    RICE = 'RICE',
    CHICKEN = 'CHICKEN',
    COW = 'COW',
    PIG = 'PIG',
    FISH = 'FISH',
}

/**
 * An industrial lot that specializes in producing food.
 */
export interface ILotAgriculture extends ILotIndustrial {
    zone: ELotZone.INDUSTRIAL;
    industryType: ELotZoneIndustrialType.AGRICULTURE;
    agricultureType: EAgricultureType;
}

/**
 * An industrial lot that specializes in producing stone and iron.
 */
export interface ILotMining extends ILotIndustrial {
    zone: ELotZone.INDUSTRIAL;
    industryType: ELotZoneIndustrialType.MINING;
}

/**
 * An industrial lot that specializes in producing oil and natural gas.
 */
export interface ILotPetroleum extends ILotIndustrial {
    zone: ELotZone.INDUSTRIAL;
    industryType: ELotZoneIndustrialType.PETROLEUM;
}

/**
 * An item that is part of a crafting recipe.
 */
export interface ICraftingRecipeItem {
    /**
     * The item needed.
     */
    item: ENetworkObjectType;
    /**
     * The quantity of the item.
     */
    quantity: number;
}

/**
 * A crafting recipe uses multiple items and convert them into one final item.
 */
export interface ICraftingRecipe {
    /**
     * The result of the recipe.
     */
    product: ENetworkObjectType;
    /**
     * The amount of product to produce.
     */
    amount: number;
    /**
     * The inputs of the recipe.
     */
    items: ICraftingRecipeItem[];
    /**
     * The recipe can be done by hand. No crafting table required.
     */
    byHand: boolean;
}

/**
 * An industrial lot that specializes in producing complex objects.
 */
export interface ILotManufacturing extends ILotIndustrial {
    zone: ELotZone.INDUSTRIAL;
    industryType: ELotZoneIndustrialType.MANUFACTURING;
    /**
     * The final products of the manufacturer.
     */
    products: ENetworkObjectType[];
    /**
     * A list of crafting recipes that the manufacturer will use.
     */
    craftingRecipes: ICraftingRecipe[];
}

/**
 * An inventory slot of a logistics company.
 */
export interface ILogisticsInventoryItem {
    /**
     * The item being sold.
     */
    item: ENetworkObjectType;
    /**
     * The number of items available.
     */
    quantity: number;
    /**
     * The price of the items.
     */
    price: number;
}

/**
 * An industrial lot that specializes in trading and shipping resources and objects.
 */
export interface ILotLogistics extends ILotIndustrial {
    zone: ELotZone.INDUSTRIAL;
    industryType: ELotZoneIndustrialType.LOGISTICS;
}

/**
 * The type of lot expansion to perform.
 */
export enum ELotExpandType {
    NONE = 'NONE',
    RIGHT = 'RIGHT',
    BOTTOM = 'BOTTOM',
    RIGHT_AND_BOTTOM = 'RIGHT_AND_BOTTOM',
}

/**
 * The affected lots and lot expand type.
 */
export interface ILotExpandTypeAndAffectedLocations {
    lotExpandType: ELotExpandType;
    affectedLots: ILot[];
}

/**
 * The type of the road.
 */
export enum ERoadType {
    TWO_LANE = 'TWO_LANE',
    ONE_WAY = 'ONE_WAY',
    INTERSECTION = 'INTERSECTION',
}

/**
 * The direction of the road.
 */
export enum ERoadDirection {
    INTERSECTION = 'INTERSECTION',
    NORTH = 'NORTH',
    SOUTH = 'SOUTH',
    EAST = 'EAST',
    WEST = 'WEST',
    HORIZONTAL = 'HORIZONTAL',
    VERTICAL = 'VERTICAL',
}

/**
 * Stores four directions that are nearby.
 */
export interface IWhichDirectionIsNearby {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
}

/**
 * A city has roads to travel between buildings.
 */
export interface IRoad extends IObject {
    /**
     * The id of the road.
     */
    id: string;
    /**
     * The type of road.
     */
    type: ERoadType;
    /**
     * The direction of the road.
     */
    direction: ERoadDirection;
    /**
     * Which side of the road is connected.
     */
    connected: IWhichDirectionIsNearby;
}

/**
 * A city is a combination of lots and roads.
 */
export interface ICity {
    /**
     * A list of lots in the city.
     */
    lots: ILot[];
    /**
     * A list of roads in the city.
     */
    roads: IRoad[];
    /**
     * A list of objects in the city.
     */
    objects: INetworkObject[];
}

/**
 * The direction a car is facing.
 */
export enum ECarDirection {
    UP = 'UP',
    DOWN = 'DOWN',
    LEFT = 'LEFT',
    RIGHT = 'RIGHT',
}

/**
 * A car that can contain people who can drive around.
 */
export interface ICar extends INetworkObjectBase {
    /**
     * The direction the car is facing.
     */
    direction: ECarDirection;
    /**
     * The car is a car type.
     */
    objectType: ENetworkObjectType.CAR;
    /**
     * Path is used to animate smoke trails and semi truck trailers.
     */
    path: INpcPathPoint[];
}

/**
 * An object which can be sorted for rendering a scene. It can be a person, a chair, a table, or walls. Each [[IDrawable]]
 * is then sorted by height so [[IDrawable]]s on the bottom of the screen will overlap the [[IDrawable]]s above them.
 * This gives the appearance of a 2D Stereographic Projection using overlapped images.
 */
export interface IDrawable extends IObject {
    /**
     * A function that renders the drawable object.
     */
    draw(this: IDrawable): any;

    /**
     * The type of drawable. [[EDrawableType.PERSON]] and [[EDrawableType.OBJECT]] are sorted differently before drawing.
     */
    type: EDrawableType;
}

/**
 * A key down interval handler. Pressing a key down will begin a setInterval which will run every 100 milliseconds. This
 * creates a smooth animation of movement. A person will move 10 pixels every 100 milliseconds until the key up event.
 */
export interface IKeyDownHandler {
    /**
     * The key that triggered the handler. Used by the key up handler to cancel [[interval]] then to remove the [[IKeyDownHandler]].
     */
    key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'w' | 'a' | 's' | 'd';
    /**
     * The setTimeout interval which performs the movement or action at a steady rate.
     */
    interval: any;
}

/**
 * The intermediate world cell type.
 */
export interface INetworkObjectCellPosition {
    /**
     * X axis cell number.
     */
    x: number;
    /**
     * Y axis cell number.
     */
    y: number;
}

/**
 * Stop all npc actions within a cell for a moment in time while a player changes
 * things within the cell.
 *
 * The database will store multiple versions of objects for each cell for large
 * transactions. The firebase transaction  limit is 500 documents. To change
 * more than 500 documents, the current version integer is used to compute the
 * next version integer, which is used to create the new documents, then the
 * original version integer is updated to the next version integer. The cloud
 * function can make large edits of more than 500 documents under the next
 * version integer and a small transaction can be used to change the version
 * integer to point to the new documents.
 *
 * 1) The first step is to lock the cell and create a previous cell version document
 * in one transaction. The previous cell version flag will be set to creating which
 * means the cell version is being created.
 *
 * If the transaction failed to lock [[ICellLock]], it will throw an error on
 * player actions and it will loop on automatic computer cell updates until
 * a successful lock.
 *
 * 2) Once the cell is locked, the new documents will be created.
 *
 * 3) Once the documents are created, the cell lock is unlocked and the previous
 * cell version document flag will be changed from creating to created. The
 * original cell version document flag will be changed to destroying.
 *
 * If the cloud function timed out after 60 seconds before unlocking the cell,
 * The next cloud function will automatically lock the lock. The previous cell
 * version document with the creating flag will exist in the database for
 * future deletion. A function will check every minute for existing previous cell
 * version documents with the creating flag and delete the zombie documents, once
 * the documents are deleted, the previous cell version document will also be
 * deleted.
 *
 * 4) If the cloud function completed it's update, it will destroy the original
 * cell version documents.
 *
 * If the cloud function timed out after 60 seconds before destroying the
 * original cell version documents. It will be caught by a scheduled function
 * checking for the destroying flag with destruction started more than 60
 * seconds ago. The scheduled function will catch zombie documents.
 */
export interface ICellLock {
    /**
     * The time that the cell will be paused, no further npc actions.
     */
    pauseDate: string;
    /**
     * The cell is locked by a cloud function.
     */
    lock: boolean;
    /**
     * The cell was edited by a player and a cloud function has not locked the
     * cell yet.
     */
    playerEdit: boolean;
    /**
     * The cell id that was paused.
     */
    cell: string;
    /**
     * The current version of the cell.
     */
    version: number;
    /**
     * The incremented version of the cell. Used to make unique cell versions.
     */
    versionCounter: number;
}

/**
 * A record storing a version of a cell, used to delete the cell version later.
 */
export interface ICellVersion {
    /**
     * The cell version is in the creating state. If set to true and the
     * cell has timed out, it will be caught by a scheduled cloud function.
     */
    creating: boolean;
    /**
     * The cell version is in the created state.
     */
    created: boolean;
    /**
     * The cell version is in the destroying state. If set to true and the cell
     * has timed out, it will be caught by a scheduled cloud function.
     */
    destroying: boolean;
    /**
     * The date the cell version begun creation to determine timed out while
     * creating previous cell version documents.
     */
    dateBegunCreate: string;
    /**
     * The date the cell version begun destruction to determine timed out while
     * destroying previous cell version documents.
     */
    dateBegunDestroy: string;
    /**
     * The cell id.
     */
    cell: string;
    /**
     * The version number;
     */
    version: number;
}

/**
 * The HTTP GET /persons response.
 */
export interface IApiPersonsGetResponse {
    /**
     * The id of the person to follow.
     */
    currentPersonId: string | null;
    /**
     * The id of the npc to follow.
     */
    currentNpcId: string | null;
    loadedCells: INetworkObjectCellPosition[];
    loadedTerrainTiles: ITerrainTilePosition[];
    cellLocks: ICellLock[];
    persons: IPerson[];
    npcs: INpc[];
    cars: ICar[];
    objects: INetworkObject[];
    resources: IResource[];
    stockpiles: IStockpile[];
    stockpileTiles: IStockpileTile[];
    lots: ILot[];
    houses: IHouse[];
    walls: IWall[];
    floors: IFloor[];
    roads: IRoad[];
    /**
     * A list of voice messages.
     */
    voiceMessages: {
        /**
         * A list of new WebRTC ICE candidates to share voice data.
         */
        candidates: IApiPersonsVoiceCandidateMessage[];
        /**
         * A list of offers.
         */
        offers: IApiPersonsVoiceOfferMessage[];
        /**
         * A list of answers.
         */
        answers: IApiPersonsVoiceAnswerMessage[];
    };
}

/**
 * The login method.
 */
export interface IApiPersonsLoginPost {
    /**
     * The id of the person to login as.
     */
    id: string;
    /**
     * The password of the person to login as.
     */
    password: string;
}

/**
 * The vend method.
 */
export interface IApiPersonsVendPost {
    /**
     * The price of the item being vended.
     */
    price: number;
    /**
     * The type of item being vended.
     */
    objectType: ENetworkObjectType;
    /**
     * The id of the person buying the item.
     */
    personId: string;
}

/**
 * The HTTP PUT /persons response.
 */
export interface IApiPersonsPut {
    /**
     * A list of people.
     */
    persons: IPerson[];
    /**
     * A list of cars.
     */
    cars: ICar[];
    /**
     * A list of objects.
     */
    objects: INetworkObject[];
}

/**
 * The HTTP /persons/object/pickup post request.
 */
export interface IApiPersonsObjectPickUpPost {
    personId: string;
    objectId: string;
}

/**
 * The HTTP /persons/object/drop post request.
 */
export interface IApiPersonsObjectDropPost {
    personId: string;
    objectId: string;
}

/**
 * The HTTP /persons/object/craft post request.
 */
export interface IApiPersonsObjectCraftPost {
    personId: string;
    recipeProduct: ENetworkObjectType;
}

/**
 * The HTTP /persons/npc/job post request.
 * Used to set the npc's job.
 */
export interface IApiPersonsNpcJobPost {
    personId: string;
    npcId: string;
    job: INpcJob;
}

/**
 * The HTTP /persons/stockpile/withdraw post request.
 */
export interface IApiPersonsStockpileWithdrawPost {
    personId: string;
    objectId: string;
    stockpileId: string;
    amount: number;
}

/**
 * The HTTP /persons/stockpile/deposit post request.
 */
export interface IApiPersonsStockpileDepositPost {
    personId: string;
    objectId: string;
    stockpileId: string;
}

/**
 * The HTTP /persons/construction post request.
 */
export interface IApiPersonsConstructionPost {
    personId: string;
    location: IObject;
}

/**
 * The HTTP /persons/construction/stockpile post request.
 */
export interface IApiPersonsConstructionStockpilePost {
    personId: string;
    location: IObject;
}

/**
 * Base voice message format.
 */
export interface IApiVoiceMessage {
    /**
     * Sending WebRTC data from person.
     */
    from: string;
    /**
     * Sending WebRTC data to person.
     */
    to: string;
}

/**
 * The Voice Candidate message format.
 */
export interface IApiPersonsVoiceCandidateMessage extends IApiVoiceMessage {
    /**
     * The candidate information.
     */
    candidate: any;
}

/**
 * The HTTP POST /persons/voice/candidate request.
 */
export interface IApiPersonsVoiceCandidatePost extends IApiVoiceMessage {
    /**
     * The candidate information.
     */
    candidate: any;
}

/**
 * The HTTP POST /persons/voice/offer request.
 */
export interface IApiPersonsVoiceOfferMessage extends IApiVoiceMessage {
    /**
     * The socket description information.
     */
    description: any;
}

/**
 * The HTTP POST /persons/voice/offer request.
 */
export interface IApiPersonsVoiceOfferPost extends IApiVoiceMessage {
    /**
     * The socket description information.
     */
    description: any;
}

/**
 * The HTTP POST /persons/voice/answer request.
 */
export interface IApiPersonsVoiceAnswerMessage extends IApiVoiceMessage {
    /**
     * The socket description information.
     */
    description: any;
}

/**
 * The HTTP POST /persons/voice/answer request.
 */
export interface IApiPersonsVoiceAnswerPost extends IApiVoiceMessage {
    /**
     * The socket description information.
     */
    description: any;
}

/**
 * The HTTP POST /lots/buy request. Used to ask for a buying price of a lot.
 */
export interface IApiLotsBuyPost {
    lotId: string;
    price: number;
    personId: string;
}

/**
 * The HTTP POST /lots/sell request. Used to put a lot up for sale.
 */
export interface IApiLotsSellPost {
    lotId: string;
    price: number;
    personId: string;
}

/**
 * The HTTP POST /persons/resource/harvest request. Used to harvest a resource on the map.
 */
export interface IApiPersonsResourceHarvestPost {
    resourceId: string;
}

/**
 * A list of game tutorials that should be shown.
 */
export interface IGameTutorials {
    /**
     * If the walking tutorial should be shown.
     */
    walking: {
        /**
         * Was the W key pressed yet.
         */
        w: boolean;
        /**
         * Was the A key pressed yet.
         */
        a: boolean;
        /**
         * Was the S key pressed yet.
         */
        s: boolean;
        /**
         * Was the D key pressed yet.
         */
        d: boolean;
    };
    /**
     * If the driving tutorial should be shown.
     */
    driving: boolean;
    /**
     * If the grabbing tutorial should be shown.
     */
    grabbing: boolean;
}

/**
 * A path point of an [[INpc]] character that moves along a path.
 */
export interface INpcPathPoint {
    /**
     * The time of the Path point.
     */
    time: string;
    /**
     * The location of the path point.
     */
    location: IObject;
}

/**
 * A time slot in a NPC schedule to do a specific action between two points of time.
 */
export interface INpcSchedule {
    /**
     * A time of day that an activity begins.
     */
    startTime: TDayNightTime;
    /**
     * A time of day that an activity ends.
     */
    endTime: TDayNightTime;
    /**
     * The location that the NPC should be in.
     */
    to: IObject;
}

/**
 * Represent a change in inventory over time. NPCs will have multiple inventory state changes as they pick up items
 * in between 1 minute npc ticks.
 */
export interface IInventoryState {
    time: string;
    add: INetworkObject[];
    remove: string[];
    modified: INetworkObject[];
    rows?: number;
    columns?: number;
}

/**
 * The different type of jobs an NPC can have.
 */
export enum ENpcJobType {
    /**
     * The NPC will gather all resources within the environment. The default job for an npc. The gatherer will not use tools.
     */
    GATHER = 'GATHER',
    /**
     * The NPC will craft simple items such as wattles, baskets, and bricks using materials within a stockpile.
     */
    CRAFT = 'CRAFT',
    /**
     * The hauler will move items between stockpiles. Haulers can travel for long distances (15 tiles or 5 minutes) between
     * stockpiles. The hauler will move rare resources from special biomes to the current person.
     */
    HAUL = 'HAUL',
}

/**
 * The base interface for all NPC jobs.
 */
export interface INpcJob {
    type: ENpcJobType;
}

/**
 * The gathering job of an npc.
 */
export interface INpcJobGathering {
    type: ENpcJobType.GATHER;
    /**
     * The type of resources to gather from.
     */
    resources: ENetworkObjectType[];
}

/**
 * The crafting job of an npc.
 */
export interface INpcJobCrafting {
    type: ENpcJobType.CRAFT;
    /**
     * A list of products to craft.
     */
    products: ENetworkObjectType[];
}

/**
 * A non playable character that moves along preplanned routes.
 */
export interface INpc extends IPerson {
    /**
     * The preplanned route of movement through the server.
     */
    path: INpcPathPoint[];
    /**
     * A list of actions to perform every 4 hours.
     */
    schedule: INpcSchedule[];
    /**
     * An ISO Date string of when the NPC is ready for the next task.
     */
    readyTime: string;
    /**
     * Represent the change to npc inventory over time.
     */
    inventoryState: IInventoryState[];
    /**
     * The job assigned to the npc.
     */
    job: INpcJob;
}
