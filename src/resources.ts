import { IApiPersonsResourceHarvestPost, INetworkObject, IObject, IResource, IResourceSpawn } from './types/GameTypes';
import * as seedrandom from 'seedrandom';
import { getNetworkObjectCellString } from './cell';

/**
 * The return of the spawn function of HarvestResourceController.
 */
export interface IHarvestResourceSpawn {
    /**
     * The item that was spawned.
     */
    spawn: INetworkObject;
    /**
     * How long it will take before spawning the next item.
     */
    respawnTime: number;
}

/**
 * A controller that will handle the spawning of resources on both the client and the server. Both the client and the server
 * need to know what item will spawn next and the next rng state after spawning an item.
 */
export class HarvestResourceController {
    /**
     * The data to send in the post request. Used by the client to initiate a harvest resource request, used to spawn
     * an item on the server.
     */
    private readonly postData: IApiPersonsResourceHarvestPost;

    /**
     * The random number generator used to pick random spawns of the resource node. Spawning items twice but simultaneously
     * with the same state will produce one item. Spawning items sequentially with different state will produce different items.
     * The rng is used to guess the item on the client before the server can process the item. This should allow for the
     * instant generation of the item on the client, even before the item will exist on the server.
     */
    private rng: seedrandom.prng;

    /**
     * The sum of all spawning probabilities. Used to compute a random spawn a random spawn with different probabilities.
     */
    private readonly sumCumulativeProbability: number;

    /**
     * A list of spawns, incrementing in cumulative probability. Used to compute a random spawn with different probabilities.
     */
    private spawnsCumulativeProbability: IResourceSpawn[];

    /**
     * Generate a controller for calculating future spawns and the future state of the resource node.
     * @param resource The resource node to calculate spawns for.
     */
    constructor(private resource: IResource) {
        // the harvest resource API request.
        this.postData = {
            resourceId: resource.id,
        };

        // initialize the random number generator for creating new spawns.
        this.rng = seedrandom.alea(resource.spawnState === true ? resource.spawnSeed : '', {
            state: resource.spawnState,
        });

        // it is invalid for a resource to have no spawns
        if (resource.spawns.length === 0) {
            throw new Error('Resource with an empty spawn list');
        }

        // the total cumulative probability, multiplied against random to get a value between 0 and sum cumulative probability.
        this.sumCumulativeProbability = resource.spawns.reduce((acc: number, s: IResourceSpawn): number => {
            return acc + s.probability;
        }, 0);

        // convert spawns array to cumulative probabilities
        this.spawnsCumulativeProbability = resource.spawns
            .map((s, index, arr) => {
                const sumWeightsBelow = arr.slice(0, index).reduce((acc: number, s1: IResourceSpawn): number => {
                    return acc + s1.probability;
                }, 0);
                return {
                    ...s,
                    probability: sumWeightsBelow,
                };
            })
            .reverse();
    }

    /**
     * Calculate the next spawn.
     */
    public spawn(): IHarvestResourceSpawn {
        // compute a random cumulative probability to pick a random item
        const cumulativeProbability = this.rng.quick() * this.sumCumulativeProbability;
        // pick a random item using cumulative probability
        const spawn: IResourceSpawn = this.spawnsCumulativeProbability.find(
            (s) => s.probability < cumulativeProbability,
        ) as IResourceSpawn;
        const spawnPosition: IObject = {
            x: this.resource.x + Math.floor(this.rng.quick() * 200) - 100,
            y: this.resource.y + Math.floor(this.rng.quick() * 200) - 100,
        };
        // add new wood on the ground
        const spawnItem: INetworkObject = {
            x: spawnPosition.x,
            y: spawnPosition.y,
            objectType: spawn.type,
            lastUpdate: new Date().toISOString(),
            health: {
                rate: 0,
                max: 1,
                value: 1,
            },
            id: `object-${this.rng.int32()}`,
            grabbedByPersonId: null,
            grabbedByNpcId: null,
            insideStockpile: null,
            isInInventory: false,
            amount: 1,
            exist: true,
            state: [],
            cell: getNetworkObjectCellString(spawnPosition),
            version: 0,
        };
        // calculate respawn time, should be from 0.5 to 1.5 times the value in milliseconds.
        const respawnTime = Math.ceil(this.rng.quick() * spawn.spawnTime + spawn.spawnTime * 0.5);

        return {
            spawn: spawnItem,
            respawnTime,
        };
    }

    /**
     * The state of the current rng.
     */
    public saveState(): seedrandom.State {
        return this.rng.state();
    }

    /**
     * The API request for harvesting the resource.
     */
    public getPostData(): IApiPersonsResourceHarvestPost {
        return this.postData;
    }
}
