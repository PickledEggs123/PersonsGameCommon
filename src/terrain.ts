import { ENetworkObjectType, IObject, IResource, IResourceSpawn, ITree } from './types/GameTypes';

export const createResource = (point: IObject, objectType: ENetworkObjectType): IResource => {
    const { x, y } = point;
    const spawns: IResourceSpawn[] =
        objectType === ENetworkObjectType.TREE
            ? [
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
              ]
            : [
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
              ];
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
