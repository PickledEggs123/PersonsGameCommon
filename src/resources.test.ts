import 'jest';
import { HarvestResourceController } from './resources';
import { ENetworkObjectType, INetworkObject, IObject, IResource } from './types/GameTypes';
import { createResource } from './terrain';

describe('HarvestResourceController', () => {
    const point: IObject = {
        x: 0,
        y: 0,
    };
    /**
     * Test a resource node for spawning properties.
     * @param resource The resource to test.
     */
    const testResource = (resource: IResource) => {
        /**
         * spawn n unique items.
         * @param controller The controller instance which can spawn items.
         * @param n The number of items to spawn.
         */
        const spawnNItems = (controller: HarvestResourceController, n: number): INetworkObject[] => {
            const spawns: INetworkObject[] = new Array(n).fill(0).map(() => controller.spawn().spawn);
            for (const spawn of spawns) {
                // should have unique id
                const otherSpawns = spawns.filter((s) => s.id !== spawn.id);
                expect(otherSpawns.length).toBe(spawns.length - 1);

                // should be near the resource
                expect(Math.abs(spawn.x - resource.x)).toBeLessThanOrEqual(100);
                expect(Math.abs(spawn.y - resource.y)).toBeLessThanOrEqual(100);
            }
            return spawns;
        };
        it('should create HarvestResourceController', () => {
            const controller = new HarvestResourceController(resource);
            expect(controller).toBeTruthy();
        });
        it('should get postData', () => {
            const controller = new HarvestResourceController(resource);
            expect(controller.getPostData()).toEqual({
                resourceId: resource.id,
            });
        });
        it('should spawn 100 different items', () => {
            const controller = new HarvestResourceController(resource);
            spawnNItems(controller, 100);
        });
        it('should spawn 1000 different items', () => {
            const controller = new HarvestResourceController(resource);
            spawnNItems(controller, 1000);
        });
        it('should spawn items with a close ratio to probability', () => {
            const controller = new HarvestResourceController(resource);
            const spawns = spawnNItems(controller, 100);

            // expect at least 70 percent of the probability of spawning a resource
            for (const resourceSpawn of resource.spawns) {
                expect(spawns.filter((spawn) => spawn.objectType === resourceSpawn.type).length).toBeGreaterThanOrEqual(
                    Math.floor(resourceSpawn.probability * 0.7),
                );
            }
        });
        it('should resume rng cycle using saveState()', () => {
            const controller1 = new HarvestResourceController(resource);
            spawnNItems(controller1, 5);
            const state1 = controller1.saveState();
            const spawns1 = spawnNItems(controller1, 5);

            const controller2 = new HarvestResourceController({
                ...resource,
                spawnState: {
                    ...state1,
                },
            });
            const spawns2 = spawnNItems(controller2, 5);

            expect(
                spawns1.map((spawn) => ({
                    ...spawn,
                    lastUpdate: undefined,
                })),
            ).toEqual(
                spawns2.map((spawn) => ({
                    ...spawn,
                    lastUpdate: undefined,
                })),
            );
        });
    };
    describe('Tree resource node', () => testResource(createResource(point, ENetworkObjectType.TREE)));
    describe('Rock resource node', () => testResource(createResource(point, ENetworkObjectType.ROCK)));
});
