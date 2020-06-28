import {
    EAltitudeType,
    EBiomeType,
    ENetworkObjectType,
    IArea,
    IAreaTilePosition,
    IBiome,
    IBiomeTilePosition,
    IContinent,
    IContinentalShelf,
    IContinentTilePosition,
    IObject,
    IResource,
    IResourceSpawn,
    ITerrainTilePosition,
    ITree,
    IVoronoi,
    TTerrainTilePosition,
} from './types/GameTypes';
import * as delaunay from 'd3-delaunay';
import * as d3Polygon from 'd3-polygon';
import * as seedrandom from 'seedrandom';
import * as shajs from 'sha.js';
import * as polygonClipping from 'polygon-clipping';

const mapHash = '11';
export const terrainTileSize = 1000;
export const areaTileSize = 6 * terrainTileSize;
export const biomeTileSize = 2.5 * 6 * terrainTileSize;
export const continentTileSize = 5 * 6 * terrainTileSize;

/**
 * Convert terrain tile to an id.
 * @param terrainTile
 */
export const terrainTileToId = (terrainTile: ITerrainTilePosition): string =>
    `terrainTile(${terrainTile.tileX},${terrainTile.tileY})`;
export const areaTileToId = (areaTile: IAreaTilePosition): string => `areaTile(${areaTile.tileX},${areaTile.tileY})`;
export const biomeTileToId = (biomeTile: IBiomeTilePosition): string =>
    `biomeTile(${biomeTile.tileX},${biomeTile.tileY})`;
export const continentTileToId = (continentTile: IContinentTilePosition): string =>
    `continentTile(${continentTile.tileX},${continentTile.tileY})`;

/**
 * Compute the voronoi diagram for a set of points.
 * @param points The input points.
 * @param bounds The bounds of the voronoi map.
 */
const computeVoronoi = (points: IObject[], bounds: delaunay.Delaunay.Bounds): IVoronoi[] => {
    const diagram = delaunay.Delaunay.from(
        points.map(
            (p: IObject): delaunay.Delaunay.Point => {
                return [p.x, p.y];
            },
        ),
    ).voronoi(bounds);

    return Array.from(diagram.cellPolygons()).map(
        (cell, index): IVoronoi => {
            const point = {
                x: diagram.delaunay.points[index * 2],
                y: diagram.delaunay.points[index * 2 + 1],
            };
            const corners = cell.map(
                (c): IObject => {
                    return {
                        x: c[0],
                        y: c[1],
                    };
                },
            );
            const neighbors = Array.from(diagram.delaunay.neighbors(index)).map(
                (neighborIndex): IObject => {
                    return {
                        x: diagram.delaunay.points[neighborIndex * 2],
                        y: diagram.delaunay.points[neighborIndex * 2 + 1],
                    };
                },
            );
            return {
                point,
                corners,
                neighbors,
            };
        },
    );
};

/**
 * Spread out voronoi cells evenly by removing tight knit clusters of random points.
 * @param voronois A random set of points with voronoi information included.
 */
const lloydRelaxation = (voronois: IVoronoi[]): IObject[] => {
    // move each point towards the centroid of the voronoi cell.
    return voronois.map(
        (voronoi): IObject => {
            const centroid = d3Polygon.polygonCentroid(
                voronoi.corners.map((corner: IObject): [number, number] => {
                    return [corner.x, corner.y];
                }),
            );
            return {
                x: centroid[0],
                y: centroid[1],
            };
        },
    );
};

/**
 * The size of a terrain tile. This is the smallest unit of terrain generation.
 */
const generateTilePoints = (tileX: number, tileY: number, min: number, max: number, tileSize: number): IObject[] => {
    const sha = new shajs.sha256().update(`${mapHash}-terrain-${tileX}-${tileY}`).digest('base64');
    const rng: seedrandom.prng = seedrandom.alea(sha);
    const numberOfPoints = Math.floor(rng.double() * (max - min)) + min;
    return new Array(numberOfPoints).fill(0).map(() => ({
        x: rng.double() * tileSize + tileX * tileSize,
        y: rng.double() * tileSize + tileY * tileSize,
    }));
};

const internalTilePosition = <T extends TTerrainTilePosition>(offset: IObject, tileSize: number): T => {
    const tileX = Math.floor(offset.x / tileSize);
    const tileY = Math.floor(offset.y / tileSize);
    return {
        tileX,
        tileY,
    } as T;
};

export const getTerrainTilePosition = (offset: IObject): ITerrainTilePosition => {
    return internalTilePosition(offset, terrainTileSize);
};
export const getAreaTilePosition = (offset: IObject): IAreaTilePosition => {
    return internalTilePosition(offset, areaTileSize);
};
export const getBiomeTilePosition = (offset: IObject): IBiomeTilePosition => {
    return internalTilePosition(offset, biomeTileSize);
};
export const getContinentTilePosition = (offset: IObject): IContinentTilePosition => {
    return internalTilePosition(offset, continentTileSize);
};

/**
 * Generate points for terrain objects such as trees and rocks.
 * @param tileX The x axis of the terrain tile position.
 * @param tileY The y axis of the terrain tile position.
 * @param tileSize The size of the tile of points.
 * @param minPoints The minimum amount of points in the cell.
 * @param maxPoints The maximum amount of points in the cell.
 * @param maxBounds The point generation should use the full bounds for the final result.
 * @param numEdgeTiles The number of edge tiles to place around the tile. More edge tiles will produce smoother transitions.
 */
const generateTerrainPoints = <T extends TTerrainTilePosition>(
    { tileX, tileY }: T,
    {
        tileSize,
        minPoints,
        maxPoints,
        maxBounds,
        numEdgeTiles,
    }: {
        tileSize: number;
        minPoints: number;
        maxPoints: number;
        maxBounds?: boolean;
        numEdgeTiles: number;
    },
): IVoronoi[] => {
    // generate random points for the center tile and the surrounding tiles
    // surrounding tiles are required to smoothly generate random points between the edges of each tile
    let points: IObject[] = [];
    for (let i = -numEdgeTiles; i <= numEdgeTiles; i++) {
        for (let j = -numEdgeTiles; j <= numEdgeTiles; j++) {
            points.push(...generateTilePoints(tileX + i, tileY + i, minPoints, maxPoints, tileSize));
        }
    }

    // bounds for voronoi generation
    const fullBounds = [
        (tileX - numEdgeTiles) * tileSize,
        (tileY - numEdgeTiles) * tileSize,
        (tileX + numEdgeTiles + 1) * tileSize,
        (tileY + numEdgeTiles + 1) * tileSize,
    ];
    const smallBounds = [tileX * tileSize, tileY * tileSize, (tileX + 1) * tileSize, (tileY + 1) * tileSize];

    // for five steps, use lloyd's relaxation to smooth out the random points
    for (let step = 0; step < 5; step++) {
        const voronois = computeVoronoi(points, fullBounds);
        points = lloydRelaxation(voronois);
    }

    // keep only points that are in the current tile
    const filteredPoints = points
        .filter((point) => {
            const pointTileX = Math.floor(point.x / tileSize);
            const pointTileY = Math.floor(point.y / tileSize);
            return tileX === pointTileX && tileY === pointTileY;
        })
        .map((point) => {
            // round position to the nearest 10 to align with the grid
            return {
                x: Math.floor(point.x / 10) * 10,
                y: Math.floor(point.y / 10) * 10,
            };
        })
        .reduce((acc: IObject[], point: IObject): IObject[] => {
            // if point is unique, not in array
            if (acc.every((p) => p.x !== point.x && p.y !== point.y)) {
                // add unique point
                return [...acc, point];
            } else {
                // do not add duplicate point
                return acc;
            }
        }, []);

    return computeVoronoi(filteredPoints, maxBounds ? fullBounds : smallBounds);
};

/**
 * Terrain tiles that should be loaded given a terrain tile position.
 * @param tileX Terrain tile position on the x axis.
 * @param tileY Terrain tile position on the y axis.
 */
export const terrainTilesThatShouldBeLoaded = <T extends TTerrainTilePosition>({ tileX, tileY }: T): T[] => {
    const tiles = [];
    for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
            tiles.push({
                tileX: tileX + i,
                tileY: tileY + j,
            } as T);
        }
    }
    return tiles;
};

interface ITerrainResourceData {
    objectType: ENetworkObjectType;
    probability: number;
}
interface IAreaResourceData {
    altitudeType?: EAltitudeType;
    biomeType?: EBiomeType;
    spawns: ITerrainResourceData[];
    cumulativeSpawns: ITerrainResourceData[];
    cumulativeSum: number;
    minResources: number;
    maxResources: number;
}
const areaBiomeSpawns: IAreaResourceData[] = [
    {
        biomeType: EBiomeType.BEACH,
        spawns: [],
        cumulativeSpawns: [],
        cumulativeSum: 0,
        minResources: 0,
        maxResources: 0,
    },
    {
        altitudeType: EAltitudeType.SWAMP,
        spawns: [
            {
                objectType: ENetworkObjectType.TREE,
                probability: 25,
            },
            {
                objectType: ENetworkObjectType.ROCK,
                probability: 5,
            },
            {
                objectType: ENetworkObjectType.POND,
                probability: 70,
            },
        ],
        cumulativeSpawns: [],
        cumulativeSum: 0,
        minResources: 10,
        maxResources: 50,
    },
    {
        altitudeType: EAltitudeType.PLAIN,
        spawns: [
            {
                objectType: ENetworkObjectType.TREE,
                probability: 70,
            },
            {
                objectType: ENetworkObjectType.ROCK,
                probability: 10,
            },
            {
                objectType: ENetworkObjectType.POND,
                probability: 20,
            },
        ],
        cumulativeSpawns: [],
        cumulativeSum: 0,
        minResources: 10,
        maxResources: 50,
    },
    {
        altitudeType: EAltitudeType.HILL,
        spawns: [
            {
                objectType: ENetworkObjectType.TREE,
                probability: 60,
            },
            {
                objectType: ENetworkObjectType.ROCK,
                probability: 20,
            },
            {
                objectType: ENetworkObjectType.POND,
                probability: 20,
            },
        ],
        cumulativeSpawns: [],
        cumulativeSum: 0,
        minResources: 5,
        maxResources: 25,
    },
    {
        altitudeType: EAltitudeType.MOUNTAIN,
        spawns: [
            {
                objectType: ENetworkObjectType.TREE,
                probability: 50,
            },
            {
                objectType: ENetworkObjectType.ROCK,
                probability: 30,
            },
            {
                objectType: ENetworkObjectType.POND,
                probability: 20,
            },
        ],
        cumulativeSpawns: [],
        cumulativeSum: 0,
        minResources: 5,
        maxResources: 15,
    },
    {
        altitudeType: EAltitudeType.ROCKY,
        spawns: [
            {
                objectType: ENetworkObjectType.TREE,
                probability: 5,
            },
            {
                objectType: ENetworkObjectType.ROCK,
                probability: 80,
            },
            {
                objectType: ENetworkObjectType.POND,
                probability: 15,
            },
        ],
        cumulativeSpawns: [],
        cumulativeSum: 0,
        minResources: 20,
        maxResources: 50,
    },
    {
        altitudeType: EAltitudeType.OCEAN,
        spawns: [],
        cumulativeSpawns: [],
        cumulativeSum: 0,
        minResources: 0,
        maxResources: 0,
    },
].map((data: IAreaResourceData) => {
    const cumulativeSum = data.spawns.reduce((acc: number, data2: ITerrainResourceData): number => {
        return acc + data2.probability;
    }, 0);
    const cumulativeSpawns = data.spawns
        .map((data2, index, arr) => {
            return {
                ...data2,
                probability: arr.slice(0, index).reduce((acc: number, data3: ITerrainResourceData): number => {
                    return acc + data3.probability;
                }, 0),
            };
        })
        .reverse();
    return {
        ...data,
        cumulativeSum,
        cumulativeSpawns,
    };
});

const getMatchingAreaData = (area: IArea): IAreaResourceData => {
    const data = areaBiomeSpawns.find((item) => {
        if (item.altitudeType) {
            return item.altitudeType === area.altitudeType;
        } else if (item.biomeType) {
            return item.biomeType === area.biomeType;
        } else {
            throw new Error('Area Biome Spawn Data does not have altitude or biome, cannot compare');
        }
    });
    if (data) {
        return data;
    } else {
        throw new Error('Did not find matching area biome for spawning resources');
    }
};

/**
 * Generate a continent tile.
 * @param tilePosition
 */
export const generateContinentTile = (tilePosition: IContinentTilePosition): IContinent[] => {
    const continents = generateTerrainPoints(tilePosition, {
        tileSize: continentTileSize,
        minPoints: 16,
        maxPoints: 16,
        numEdgeTiles: 1,
    })
        .reduce((acc: IVoronoi[], voronoi: IVoronoi) => {
            // filter out duplicate voronois
            if (!acc.some((v) => v.point.x === voronoi.point.x && v.point.y === voronoi.point.y)) {
                return [...acc, voronoi];
            } else {
                return acc;
            }
        }, [])
        .map(
            (voronoi): IContinentalShelf => {
                // generate continental shelves which produce mountains and oceans.
                // When two shelves move towards each other, they produce mountains.
                // When two shelves move away from each other, they produce oceans.
                const { point, corners, neighbors } = voronoi;
                const rng: seedrandom.prng = seedrandom.alea(`continent(${point.x},${point.y})`);
                const magnitude = rng.double() * 0.71;
                const angle = rng.double() * Math.PI * 2;
                return {
                    x: point.x,
                    y: point.y,
                    xDirection: Math.cos(angle) * magnitude,
                    yDirection: Math.sin(angle) * magnitude,
                    corners,
                    neighbors,
                };
            },
        )
        .reduce(
            (
                acc: IContinent[],
                continentalShelf: IContinentalShelf,
                index: number,
                arr: IContinentalShelf[],
            ): IContinent[] => {
                // Generate continents from the movement of continental shelves relative to their neighbors.
                const newContinents: IContinent[] = [];
                for (const neighborPoint of continentalShelf.neighbors) {
                    const neighbor = arr.find((c) => c.x === neighborPoint.x && c.y === neighborPoint.y);
                    if (neighbor) {
                        // find new middle point between two continents
                        const middlePoint: IObject = {
                            x: (neighbor.x + continentalShelf.x) / 2,
                            y: (neighbor.y + continentalShelf.y) / 2,
                        };

                        // determine if the two continents are moving towards or away from each other
                        const distance = (a: IObject, b: IObject): number => {
                            return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
                        };
                        const continentDelta =
                            distance(continentalShelf, middlePoint) -
                            distance(
                                {
                                    x: continentalShelf.x + continentalShelf.xDirection * 100,
                                    y: continentalShelf.y + continentalShelf.yDirection * 100,
                                },
                                middlePoint,
                            );
                        const neighborDelta =
                            distance(neighbor, middlePoint) -
                            distance(
                                {
                                    x: neighbor.x + neighbor.xDirection * 100,
                                    y: neighbor.y + neighbor.yDirection * 100,
                                },
                                middlePoint,
                            );
                        const middleDelta = continentDelta + neighborDelta;

                        // moving towards produce high altitude land
                        // moving away produce ocean
                        let continentType: EAltitudeType;
                        if (middleDelta >= 70) {
                            continentType = EAltitudeType.ROCKY;
                        } else if (middleDelta >= 50) {
                            continentType = EAltitudeType.MOUNTAIN;
                        } else if (middleDelta >= 25) {
                            continentType = EAltitudeType.HILL;
                        } else if (middleDelta >= 0) {
                            continentType = EAltitudeType.PLAIN;
                        } else if (middleDelta >= -10) {
                            continentType = EAltitudeType.SWAMP;
                        } else {
                            continentType = EAltitudeType.OCEAN;
                        }

                        const continent: IContinent = {
                            x: middlePoint.x,
                            y: middlePoint.y,
                            altitudeType: continentType,
                            corners: [],
                        };
                        newContinents.push(continent);
                    }
                }
                return [...acc, ...newContinents];
            },
            [],
        );

    const smallBounds = [
        tilePosition.tileX * continentTileSize,
        tilePosition.tileY * continentTileSize,
        (tilePosition.tileX + 1) * continentTileSize,
        (tilePosition.tileY + 1) * continentTileSize,
    ];
    let voronois = computeVoronoi(continents, smallBounds);
    for (let step = 0; step < 5; step++) {
        const points = lloydRelaxation(voronois);
        voronois = computeVoronoi(points, smallBounds);
    }
    return voronois.reduce((acc: IContinent[], voronoi: IVoronoi) => {
        // map voronoi polygon to continent
        const distance = (a: IObject, b: IObject): number => {
            return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
        };
        const continent = continents.sort((a: IContinent, b: IContinent): number => {
            return distance(a, voronoi.point) - distance(b, voronoi.point);
        })[0];
        if (continent) {
            const newContinent: IContinent = {
                x: voronoi.point.x,
                y: voronoi.point.y,
                altitudeType: continent.altitudeType,
                corners: voronoi.corners,
            };
            return [...acc, newContinent];
        } else {
            throw new Error('Cannot find continent after voronoi generation');
        }
    }, []);
};

export const generateBiomeTile = (continents: IContinent[], tilePosition: IBiomeTilePosition): IBiome[] => {
    const diagram = delaunay.Delaunay.from(continents.map(({ x, y }) => [x, y]));
    return generateTerrainPoints(tilePosition, {
        tileSize: biomeTileSize,
        minPoints: 16,
        maxPoints: 16,
        numEdgeTiles: 1,
    }).map(
        (voronoi): IBiome => {
            const continentIndex = diagram.find(voronoi.point.x, voronoi.point.y);
            const continent = continents[continentIndex];
            return {
                x: voronoi.point.x,
                y: voronoi.point.y,
                altitudeType: continent.altitudeType,
                corners: voronoi.corners,
            };
        },
    );
};

export const generateAreaTile = (biomes: IBiome[], tilePosition: IAreaTilePosition): IArea[] => {
    const diagram = delaunay.Delaunay.from(biomes.map(({ x, y }) => [x, y]));
    return generateTerrainPoints(tilePosition, {
        tileSize: areaTileSize,
        minPoints: 100,
        maxPoints: 100,
        numEdgeTiles: 1,
    }).map(
        (voronoi): IArea => {
            const biomeIndex = diagram.find(voronoi.point.x, voronoi.point.y);
            const firstBiome = biomes[biomeIndex];
            const neighborBiomeIndices = Array.from(diagram.neighbors(biomeIndex));
            const neighborBiomes = neighborBiomeIndices.map((index) => biomes[index]);
            const distance = (a: IObject, b: IObject): number => {
                return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
            };
            const sortedNeighborBiomes = neighborBiomes.sort((a, b) => {
                return distance(voronoi.point, a) - distance(voronoi.point, b);
            });
            const secondBiome = sortedNeighborBiomes[0];
            if (firstBiome && secondBiome) {
                const altitudeType = firstBiome.altitudeType;
                const firstBiomeDistance = distance(firstBiome, voronoi.point);
                const secondBiomeDistance = distance(secondBiome, voronoi.point);
                const distanceRatio = (secondBiomeDistance - firstBiomeDistance) / secondBiomeDistance;
                let biomeType: EBiomeType;
                if (
                    distanceRatio <= 0.35 &&
                    firstBiome.altitudeType !== EAltitudeType.OCEAN &&
                    secondBiome.altitudeType === EAltitudeType.OCEAN
                ) {
                    biomeType = EBiomeType.BEACH;
                } else {
                    biomeType = EBiomeType.FOREST;
                }

                return {
                    x: voronoi.point.x,
                    y: voronoi.point.y,
                    corners: voronoi.corners,
                    altitudeType,
                    biomeType,
                };
            } else {
                throw new Error('Cannot find continent to apply altitude');
            }
        },
    );
};

interface ITriangleInPolygon {
    points: IObject[];
    area: number;
    weight: number;
}
const randomPointInPolygonTriangle = (triangle: ITriangleInPolygon, rng: seedrandom.prng): IObject => {
    const a = triangle.points[0];
    const b = triangle.points[1];
    const c = triangle.points[2];
    const bottom = {
        x: b.x - a.x,
        y: b.y - a.y,
    };
    const side = {
        x: c.x - a.x,
        y: c.y - a.y,
    };

    // pick a random point on the unit triangle [0, 1)
    let bottomWeight = rng.double();
    let sideWeight = rng.double();

    // reflect weights
    if (bottomWeight + sideWeight > 1) {
        const normal: IObject = {
            x: 1,
            y: -1,
        };
        const x0: IObject = {
            x: 0,
            y: 1,
        };
        const x1: IObject = {
            x: bottomWeight,
            y: sideWeight,
        };
        const xDiff: IObject = {
            x: bottomWeight - x0.x,
            y: bottomWeight - x0.y,
        };
        const scalarNormal = xDiff.x * normal.x + xDiff.y * normal.y;
        const finalNormal: IObject = {
            x: normal.x * scalarNormal,
            y: normal.y * scalarNormal,
        };
        const x1Final: IObject = {
            x: -x1.x + 2 * x0.x + 2 * finalNormal.x,
            y: -x1.y + 2 * x0.y + 2 * finalNormal.y,
        };
        bottomWeight = x1Final.x;
        sideWeight = x1Final.y;
    }

    // pick random point inside triangle
    return {
        x: bottomWeight * bottom.x + a.x,
        y: sideWeight * side.y + a.y,
    };
};
const randomPointInPolygon = (polygon: IObject[], rng: seedrandom.prng): IObject => {
    let triangles: ITriangleInPolygon[] = [];

    // split polygon into multiple triangles using the fan method
    for (let i = 0; i < polygon.length - 2; i++) {
        const a = polygon[i];
        const b = polygon[i + 1];
        const c = polygon[i + 2];
        const bottom = {
            x: b.x - a.x,
            y: b.y - a.y,
        };
        const side = {
            x: c.x - a.x,
            y: c.y - a.y,
        };
        const crossProduct: IObject = {
            x: bottom.x * side.y,
            y: -bottom.y * side.x,
        };
        const area = Math.sqrt(Math.pow(crossProduct.x, 2) + Math.pow(crossProduct.y, 2));
        const newTriangle: ITriangleInPolygon = {
            points: [a, b, c],
            area,
            weight: triangles.reduce((acc: number, t): number => {
                return acc + t.area;
            }, area),
        };
        triangles.push(newTriangle);
    }
    triangles = triangles.reverse();

    // pick a random triangle proportional to triangle area using cumulative probability
    const cumulativeSum = triangles.reduce((acc: number, t): number => {
        return acc + t.area;
    }, 0);
    const randomWeight = cumulativeSum * rng.double();
    const triangle = triangles.find((t) => randomWeight <= t.weight);
    if (!triangle) {
        throw new Error('Could not find random triangle');
    } else {
        return randomPointInPolygonTriangle(triangle, rng);
    }
};

export interface IGeneratedResources {
    areaId: string;
    resources: IResource[];
}

/**
 * Generate a terrain tile.
 * @param areas A list of area tiles which contain different biomes which spawn different resources.
 * @param tilePosition The tile position to generate.
 */
export const generateTerrainTile = (areas: IArea[], tilePosition: ITerrainTilePosition): IGeneratedResources[] => {
    const terrainTileVoronoiBounds = [
        tilePosition.tileX * terrainTileSize,
        tilePosition.tileY * terrainTileSize,
        (tilePosition.tileX + 1) * terrainTileSize,
        (tilePosition.tileY + 1) * terrainTileSize,
    ];
    const diagram = delaunay.Delaunay.from(areas.map(({ x, y }) => [x, y])).voronoi(terrainTileVoronoiBounds);

    const areasInTile: IArea[] = [];
    for (let i = 0; i < areas.length; i++) {
        if (diagram.cellPolygon(i)) {
            areasInTile.push(areas[i]);
        }
    }

    const distance = (a: IObject, b: IObject): number => {
        return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
    };

    return areasInTile.map(
        (area): IGeneratedResources => {
            const areaId: string = `area-tile(${area.x},${area.y})`;
            const areaSpawnData = getMatchingAreaData(area);
            const sha = new shajs.sha256().update(`${mapHash}-area-${area.x}-${area.y}`).digest('base64');
            const rng: seedrandom.prng = seedrandom.alea(sha);
            const numberOfResources = Math.floor(
                rng.double() * (areaSpawnData.maxResources - areaSpawnData.minResources) + areaSpawnData.minResources,
            );

            // generate initial random points inside the polygon
            let points: IObject[] = [];
            for (let i = 0; i < numberOfResources; i++) {
                const point = randomPointInPolygon(area.corners, rng);
                points.push(point);
            }

            // space the points out uniformly using lloyd relaxation
            // notice that the loop below will perform lloyd relaxation within a polygon instead of a rectangular bounding box
            const areaPolygon: [number, number][][] = [
                area.corners.map((corner: IObject): [number, number] => {
                    return [corner.x, corner.y];
                }),
            ];
            for (let step = 0; step < 10; step++) {
                const voronois: IVoronoi[] = computeVoronoi(points, terrainTileVoronoiBounds);
                const polygons: [number, number][][][] = voronois.map((voronoi: IVoronoi): [number, number][][] => {
                    return [
                        voronoi.corners.map((corner: IObject): [number, number] => {
                            return [corner.x, corner.y];
                        }),
                    ];
                });
                const intersectionPolygons: [number, number][][][] = polygons.reduce(
                    (acc: [number, number][][][], polygon) => {
                        const intersection = polygonClipping.intersection(polygon, areaPolygon);
                        if (intersection[0]) {
                            return [...acc, intersection[0]];
                        } else {
                            return acc;
                        }
                    },
                    [],
                );
                const clippedVoronois: IVoronoi[] = intersectionPolygons.reduce(
                    (acc: IVoronoi[], polygon: [number, number][][], i): IVoronoi[] => {
                        const voronoi = voronois[i];
                        const outputVoronoi: IVoronoi = {
                            point: {
                                ...voronoi.point,
                            },
                            corners: polygon[0].map(
                                (point: [number, number]): IObject => ({
                                    x: point[0],
                                    y: point[1],
                                }),
                            ),
                            neighbors: [...voronoi.neighbors],
                        };
                        return [...acc, outputVoronoi];
                    },
                    [],
                );
                points = lloydRelaxation(clippedVoronois);
            }

            // remove points that are too close together and round to nearest 10
            points = points.reduce((acc: IObject[], point: IObject): IObject[] => {
                const roundedPoint: IObject = {
                    x: Math.floor(point.x / 10) * 10,
                    y: Math.floor(point.y / 10) * 10,
                };
                if (acc.every((other) => distance(roundedPoint, other) >= 100)) {
                    return [...acc, roundedPoint];
                } else {
                    return acc;
                }
            }, []);

            const resources: IResource[] = [];
            for (const point of points) {
                const spawnChance = rng.quick() * areaSpawnData.cumulativeSum;
                const spawn = areaSpawnData.cumulativeSpawns.find(
                    (data) => data.probability < spawnChance,
                ) as ITerrainResourceData;
                if (spawn) {
                    const resource: IResource = createResource(point, spawn.objectType);
                    resources.push(resource);
                }
            }
            return {
                areaId,
                resources,
            };
        },
    );
};

export const generateTerrainAreas = (location: IObject): IArea[] => {
    const continentTilePosition: IContinentTilePosition = getContinentTilePosition(location);
    const biomeTilePosition: IBiomeTilePosition = getBiomeTilePosition(location);
    const areaTilePosition: IAreaTilePosition = getAreaTilePosition(location);

    const continents: IContinent[] = terrainTilesThatShouldBeLoaded(continentTilePosition).reduce(
        (acc: IContinent[], position) => {
            return [...acc, ...generateContinentTile(position)];
        },
        [],
    );
    const biomes: IBiome[] = terrainTilesThatShouldBeLoaded(biomeTilePosition).reduce((acc: IBiome[], position) => {
        return [...acc, ...generateBiomeTile(continents, position)];
    }, []);
    return terrainTilesThatShouldBeLoaded(areaTilePosition).reduce((acc: IArea[], position) => {
        return [...acc, ...generateAreaTile(biomes, position)];
    }, []);
};

export const generateTerrainForLocation = (
    tilePosition: ITerrainTilePosition,
    location: IObject,
): IGeneratedResources[] => {
    const terrainTilePosition: ITerrainTilePosition = tilePosition;
    const areas: IArea[] = generateTerrainAreas(location);
    return terrainTilesThatShouldBeLoaded(terrainTilePosition).reduce((acc: IGeneratedResources[], position) => {
        return [...acc, ...generateTerrainTile(areas, position)];
    }, []);
};

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
                spawnTime: 120000,
            },
            {
                type: ENetworkObjectType.WOOD,
                probability: 5,
                spawnTime: 300000,
            },
        ],
    },
    {
        objectType: ENetworkObjectType.ROCK,
        spawns: [
            {
                type: ENetworkObjectType.STONE,
                probability: 70,
                spawnTime: 120000,
            },
            {
                type: ENetworkObjectType.COAL,
                probability: 20,
                spawnTime: 240000,
            },
            {
                type: ENetworkObjectType.IRON,
                probability: 10,
                spawnTime: 240000,
            },
        ],
    },
    {
        objectType: ENetworkObjectType.POND,
        spawns: [
            {
                type: ENetworkObjectType.MUD,
                probability: 80,
                spawnTime: 120000,
            },
            {
                type: ENetworkObjectType.CLAY,
                probability: 15,
                spawnTime: 180000,
            },
            {
                type: ENetworkObjectType.REED,
                probability: 5,
                spawnTime: 120000,
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
        health: {
            rate: 0,
            max: 10,
            value: 10,
        },
        depleted: false,
        readyTime: new Date().toISOString(),
        spawnState: true,
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
