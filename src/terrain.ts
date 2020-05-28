import { ENetworkObjectType, IObject, IResource, IResourceSpawn, ITree } from './types/GameTypes';

interface IResourceSpawnData {
    objectType: ENetworkObjectType;
    spawns: IResourceSpawn[];
}
const resourceSpawnData: IResourceSpawnData[] = [
    {
        objectType: ENetworkObjectType.TREE,
        spawns: [
            {
                type: ENetworkObjectType.STICK,
                probability: 95,
                spawnTime: 60000,
            },
            {
                type: ENetworkObjectType.WOOD,
                probability: 5,
                spawnTime: 60000,
            },
        ],
    },
    {
        objectType: ENetworkObjectType.ROCK,
        spawns: [
            {
                type: ENetworkObjectType.STONE,
                probability: 70,
                spawnTime: 60000,
            },
            {
                type: ENetworkObjectType.COAL,
                probability: 20,
                spawnTime: 120000,
            },
            {
                type: ENetworkObjectType.IRON,
                probability: 10,
                spawnTime: 180000,
            },
        ],
    },
    {
        objectType: ENetworkObjectType.POND,
        spawns: [
            {
                type: ENetworkObjectType.MUD,
                probability: 80,
                spawnTime: 10000,
            },
            {
                type: ENetworkObjectType.CLAY,
                probability: 15,
                spawnTime: 10000,
            },
            {
                type: ENetworkObjectType.REED,
                probability: 5,
                spawnTime: 10000,
            },
        ],
    },
];

export const createResource = (point: IObject, objectType: ENetworkObjectType): IResource => {
    const { x, y } = point;
    const spawnData = resourceSpawnData.find((data) => data.objectType === objectType);
    const spawns: IResourceSpawn[] = spawnData ? spawnData.spawns : [];
    const resource: IResource = {
        id: `resource(${x},${y})`,
        x,
        y,
        objectType,
        spawnSeed: `resource(${x},${y})`,
        spawns,
        lastUpdate: new Date().toISOString(),
        grabbedByPersonId: null,
        grabbedByNpcId: null,
        isInInventory: false,
        health: {
            rate: 0,
            max: 10,
            value: 10,
        },
        depleted: false,
        readyTime: new Date().toISOString(),
        spawnState: true,
        amount: 1,
        exist: true,
        state: [],
    };
    if (objectType === ENetworkObjectType.TREE) {
        const tree: ITree = {
            ...(resource as ITree),
            treeSeed: `tree(${x},${y})`,
        };
        return { ...tree };
    } else {
        return resource;
    }
};
