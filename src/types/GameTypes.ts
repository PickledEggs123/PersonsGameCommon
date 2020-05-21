import * as seedrandom from 'seedrandom';

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
    WHEAT = 'WHEAT',
    CORN = 'CORN',
    RICE = 'RICE',
    HOE = 'HOE',
    SEED = 'SEED',
    CHICKEN = 'CHICKEN',
    COW = 'COW',
    PIG = 'PIG',
    FISH = 'FISH',
    FLOUR = 'FLOUR',
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
    /**
     * Construction objects.
     */
    WATTLE_WALL = 'WATTLE_WALL',
}

/**
 * A mapping of object type to stack size.
 */
const stackSizes: { [key: string]: number } = {
    [ENetworkObjectType.STICK]: 10,
    [ENetworkObjectType.WATTLE_WALL]: 4,
};
/**
 * The max number of items that can be stored in an object stack.
 * @param objectType
 */
export const getMaxStackSize = (objectType: ENetworkObjectType): number => {
    if (typeof stackSizes[objectType] === 'number') {
        return stackSizes[objectType];
    } else {
        return 1;
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

export interface INetworkObject extends IObject {
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
     * This object is being grabbed by this person. The object will follow the person.
     */
    grabbedByPersonId: string | null;
    /**
     * This object is being grabbed by an NPC. The object will follow the npc.
     */
    grabbedByNpcId: string | null;
    /**
     * This object is inside an inventory, it should not be rendered in the world.
     */
    isInInventory: boolean;
    /**
     * Contains the health related information of the object.
     */
    health: IObjectHealth;
    /**
     * How many copies of an item is in this stack of items.
     */
    amount: number;
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
 * The base interface for all people in the game.
 */
export interface IPerson extends INetworkObject {
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
export interface IResource extends INetworkObject {
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
export interface IVendor extends INetworkObject {
    inventory: IVendorInventoryItem[];
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
     * A wall. Walls are hidden when below the current person and visible when above the current person.
     */
    WALL = 'WALL',
}

/**
 * The type of wall to be drawn.
 */
export enum ERoomWallType {
    WALL = 'WALL',
    DOOR = 'DOOR',
    OPEN = 'OPEN',
    ENTRANCE = 'ENTRANCE',
}

/**
 * The state of the doors in a room.
 */
export interface IRoomDoors {
    /**
     * There is a left door.
     */
    left: ERoomWallType;
    /**
     * There is a right door.
     */
    right: ERoomWallType;
    /**
     * There is a top door.
     */
    top: ERoomWallType;
    /**
     * There is a bottom door.
     */
    bottom: ERoomWallType;
}

/**
 * The different types of room.
 */
export enum ERoomType {
    /**
     * A room that connects together to form a large open space.
     */
    HALLWAY = 'HALLWAY',
    /**
     * A room that is a dead end, useful for rooms that connect to hallways with a door.
     */
    OFFICE = 'OFFICE',
    /**
     * A room that connects hallways to the outside of the house. It contains the mailbox and sale sign of the house.
     */
    ENTRANCE = 'ENTRANCE',
}

/**
 * A room which contains doors and furniture.
 */
export interface IRoom extends IObject {
    /**
     * Unique id of the room.
     */
    id: string;
    /**
     * The doors of the room.
     */
    doors: IRoomDoors;
    /**
     * The type of the room.
     */
    type: ERoomType;
    /**
     * The id of the lot that the room is for. Used by the mailbox to open a menu to edit the lot.
     */
    lotId: string;
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
     * The inputs of the recipe.
     */
    items: ICraftingRecipeItem[];
    /**
     * The recipe can be done by hand. No crafting table required.
     */
    byHand: boolean;
}

export const listOfRecipes: ICraftingRecipe[] = [
    {
        product: ENetworkObjectType.WATTLE_WALL,
        items: [
            {
                item: ENetworkObjectType.STICK,
                quantity: 10,
            },
        ],
        byHand: true,
    },
];

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
export interface ICar extends INetworkObject {
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
 * The HTTP GET /persons response.
 */
export interface IApiPersonsGetResponse {
    persons: IPerson[];
    npcs: INpc[];
    cars: ICar[];
    objects: INetworkObject[];
    resources: IResource[];
    lots: ILot[];
    rooms: IRoom[];
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
 * The game operates on a 4 hour, 240 minutes, 10 minute per hour basis. It is represented by a number that loops back
 * to repeat the entire start of the schedule. It is the number of miliseconds since midnight 12:00 am. Examples:
 *      0 -  60000 12 am to 1 am
 *  60000 - 120000  1 am to 2 am
 * 120000 - 180000  2 am to 3 am
 */
export type TDayNightTime = number;

/**
 * The length of one hour in day night time.
 */
export const TDayNightTimeHour: TDayNightTime = 60 * 10 * 1000;

/**
 * Get the current number of milliseconds from midnight in game time.
 */
export const getCurrentTDayNightTime = (time: Date = new Date()) => {
    const day = TDayNightTimeHour * 24;
    return +time % day;
};

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
 * A non playable character that moves along preplanned routes.
 */
export interface INpc extends IPerson {
    /**
     * The preplanned route of movement through the server.
     */
    path: INpcPathPoint[];
    /**
     * A map of the pathfinding map used by the NPC.
     */
    directionMap: string;
    /**
     * A list of actions to perform every 4 hours.
     */
    schedule: INpcSchedule[];
}
