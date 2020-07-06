import 'jest';
import {
    areaTileSize,
    areaTileToId,
    biomeTileSize,
    biomeTileToId,
    continentTileSize,
    continentTileToId,
    generateAreaTile,
    generateBiomeTile,
    generateContinentTile,
    generateTerrainForLocation,
    getAreaTilePosition,
    getBiomeTilePosition,
    getContinentTilePosition,
    getTerrainTilePosition,
    terrainTileSize,
    terrainTileToId,
} from './terrain';
import {
    EAltitudeType,
    EBiomeType,
    ENetworkObjectType,
    IArea,
    IAreaTilePosition,
    IBiome,
    IBiomeTilePosition,
    IContinent,
    IContinentTilePosition,
    IObject,
    IResource,
} from './types/GameTypes';
import * as canvas from 'canvas';
import * as fs from 'fs';
import { toMatchImageSnapshot } from 'jest-image-snapshot';
import * as delaunay from 'd3-delaunay';

expect.extend({ toMatchImageSnapshot });

describe('Terrain', () => {
    const continentRadius = 3;
    const biomeRadius = 6;
    const areaRadius = 12;
    const continentTilePositions: IContinentTilePosition[] = [];
    for (let tileX = -continentRadius; tileX < continentRadius; tileX++) {
        for (let tileY = -continentRadius; tileY < continentRadius; tileY++) {
            continentTilePositions.push({
                tileX,
                tileY,
            });
        }
    }
    const biomeTilePositions: IBiomeTilePosition[] = [];
    for (let tileX = -biomeRadius; tileX < biomeRadius; tileX++) {
        for (let tileY = -biomeRadius; tileY < biomeRadius; tileY++) {
            biomeTilePositions.push({
                tileX,
                tileY,
            });
        }
    }
    const areaTilePositions: IAreaTilePosition[] = [];
    for (let tileX = -areaRadius; tileX < areaRadius; tileX++) {
        for (let tileY = -areaRadius; tileY < areaRadius; tileY++) {
            areaTilePositions.push({
                tileX,
                tileY,
            });
        }
    }

    const continents = continentTilePositions.reduce((acc: IContinent[], tilePosition) => {
        return [...acc, ...generateContinentTile(tilePosition)];
    }, []);
    const biomes = biomeTilePositions.reduce((acc: IBiome[], tilePosition) => {
        return [...acc, ...generateBiomeTile(continents, tilePosition)];
    }, []);
    const areas = areaTilePositions.reduce((acc: IArea[], tilePosition) => {
        return [...acc, ...generateAreaTile(biomes, tilePosition)];
    }, []);
    const generatedResources = generateTerrainForLocation(
        {
            tileX: 0,
            tileY: 0,
        },
        {
            x: 0,
            y: 0,
        },
    );
    const resources = generatedResources.reduce((acc: IResource[], generatedResource) => {
        return [...acc, ...generatedResource.resources];
    }, []);
    it('should contain continents', () => {
        expect(continents).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    x: expect.any(Number),
                    y: expect.any(Number),
                    altitudeType: expect.any(String),
                    corners: expect.arrayContaining([
                        expect.objectContaining({
                            x: expect.any(Number),
                            y: expect.any(Number),
                        }),
                    ]),
                }),
            ]),
        );
    });
    const drawCornerObjects = ({
        context,
        tileObject,
        tileSize,
        radius,
        scale,
    }: {
        context: canvas.CanvasRenderingContext2D;
        tileObject: { corners: IObject[] };
        tileSize: number;
        radius: number;
        scale: number;
    }) => {
        let first: boolean = false;
        for (const corner of tileObject.corners) {
            if (first) {
                context.moveTo(
                    Math.floor((corner.x + tileSize * radius) * scale),
                    Math.floor((corner.y + tileSize * radius) * scale),
                );
                first = false;
            } else {
                context.lineTo(
                    Math.floor((corner.x + tileSize * radius) * scale),
                    Math.floor((corner.y + tileSize * radius) * scale),
                );
            }
        }
    };
    it('should match continent png', async () => {
        const size = 3000;
        const scale = size / (continentTileSize * continentRadius * 2);
        const c = canvas.createCanvas(size, size);
        const context = c.getContext('2d');
        for (const continent of continents) {
            // draw continent outline
            context.save();
            context.lineWidth = 2;
            context.beginPath();
            // select tile color based on continent type
            if (continent.altitudeType === EAltitudeType.ROCKY) {
                context.fillStyle = 'white';
            } else if (continent.altitudeType === EAltitudeType.MOUNTAIN) {
                context.fillStyle = 'grey';
            } else if (continent.altitudeType === EAltitudeType.HILL) {
                context.fillStyle = 'brown';
            } else if (continent.altitudeType === EAltitudeType.PLAIN) {
                context.fillStyle = 'green';
            } else if (continent.altitudeType === EAltitudeType.SWAMP) {
                context.fillStyle = '#254117';
            } else if (continent.altitudeType === EAltitudeType.OCEAN) {
                context.fillStyle = 'blue';
            } else {
                throw new Error('Unknown continent type');
            }
            drawCornerObjects({
                context,
                tileSize: continentTileSize,
                radius: continentRadius,
                tileObject: continent,
                scale,
            });
            context.fill();
            context.stroke();
            context.restore();
        }
        const pipingImage = c.createPNGStream().pipe(fs.createWriteStream('terrainImageContinents.png'));
        await new Promise((resolve, reject) => {
            pipingImage.on('finish', () => {
                resolve();
            });
            pipingImage.on('error', () => {
                reject();
            });
        });
        const imageBuffer = await new Promise((resolve, reject) => {
            fs.readFile('terrainImageContinents.png', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
        expect(imageBuffer).toMatchImageSnapshot();
    });
    it('should contain biomes', () => {
        expect(biomes).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    x: expect.any(Number),
                    y: expect.any(Number),
                    altitudeType: expect.any(String),
                    corners: expect.arrayContaining([
                        expect.objectContaining({
                            x: expect.any(Number),
                            y: expect.any(Number),
                        }),
                    ]),
                }),
            ]),
        );
    });
    it('should match biome png', async () => {
        const size = 3000;
        const scale = size / (biomeTileSize * biomeRadius * 2);
        const c = canvas.createCanvas(size, size);
        const context = c.getContext('2d');
        for (const biome of biomes) {
            // draw continent outline
            context.save();
            context.lineWidth = 2;
            context.beginPath();

            // select tile color based on continent type
            if (biome.altitudeType === EAltitudeType.ROCKY) {
                context.fillStyle = 'white';
            } else if (biome.altitudeType === EAltitudeType.MOUNTAIN) {
                context.fillStyle = 'grey';
            } else if (biome.altitudeType === EAltitudeType.HILL) {
                context.fillStyle = 'brown';
            } else if (biome.altitudeType === EAltitudeType.PLAIN) {
                context.fillStyle = 'green';
            } else if (biome.altitudeType === EAltitudeType.SWAMP) {
                context.fillStyle = '#254117';
            } else if (biome.altitudeType === EAltitudeType.OCEAN) {
                context.fillStyle = 'blue';
            } else {
                throw new Error('Unknown biome type');
            }
            drawCornerObjects({
                context,
                tileSize: biomeTileSize,
                radius: biomeRadius,
                tileObject: biome,
                scale,
            });
            context.fill();
            context.stroke();
            context.restore();
        }
        const pipingImage = c.createPNGStream().pipe(fs.createWriteStream('terrainImageBiomes.png'));
        await new Promise((resolve, reject) => {
            pipingImage.on('finish', () => {
                resolve();
            });
            pipingImage.on('error', () => {
                reject();
            });
        });
        const imageBuffer = await new Promise((resolve, reject) => {
            fs.readFile('terrainImageBiomes.png', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
        expect(imageBuffer).toMatchImageSnapshot();
    });
    it('should contain areas', () => {
        expect(areas).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    x: expect.any(Number),
                    y: expect.any(Number),
                    altitudeType: expect.any(String),
                    corners: expect.arrayContaining([
                        expect.objectContaining({
                            x: expect.any(Number),
                            y: expect.any(Number),
                        }),
                    ]),
                }),
            ]),
        );
    });
    const getTileColor = (area: IArea): string => {
        // select tile color based on continent type
        if (area.biomeType === EBiomeType.BEACH) {
            return '#fff38f';
        } else if (area.altitudeType === EAltitudeType.ROCKY) {
            return '#8d8d8d';
        } else if (area.altitudeType === EAltitudeType.MOUNTAIN) {
            return '#573718';
        } else if (area.altitudeType === EAltitudeType.HILL) {
            return '#ffcf2f';
        } else if (area.altitudeType === EAltitudeType.PLAIN) {
            return '#46ff66';
        } else if (area.altitudeType === EAltitudeType.SWAMP) {
            return '#254117';
        } else if (area.altitudeType === EAltitudeType.OCEAN) {
            return '#0900ff';
        } else {
            throw new Error('Unknown area type');
        }
    };
    it('should match area png', async () => {
        const size = 3000;
        const scale = size / (areaTileSize * areaRadius * 2);
        const c = canvas.createCanvas(size, size);
        const context = c.getContext('2d');
        for (const area of areas) {
            // draw continent outline
            context.save();
            context.lineWidth = 2;
            context.beginPath();

            context.fillStyle = getTileColor(area);
            drawCornerObjects({
                context,
                tileSize: areaTileSize,
                radius: areaRadius,
                tileObject: area,
                scale,
            });
            context.fill();
            context.stroke();
            context.restore();
        }
        const pipingImage = c.createPNGStream().pipe(fs.createWriteStream('terrainImageAreas.png'));
        await new Promise((resolve, reject) => {
            pipingImage.on('finish', () => {
                resolve();
            });
            pipingImage.on('error', () => {
                reject();
            });
        });
        const imageBuffer = await new Promise((resolve, reject) => {
            fs.readFile('terrainImageAreas.png', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
        expect(imageBuffer).toMatchImageSnapshot();
    });
    it('should have trees, rocks, and ponds', () => {
        expect(resources).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    objectType: ENetworkObjectType.TREE,
                }),
                expect.objectContaining({
                    objectType: ENetworkObjectType.ROCK,
                }),
                expect.objectContaining({
                    objectType: ENetworkObjectType.POND,
                }),
            ]),
        );
    });
    it('should check generated resources', () => {
        expect(generatedResources).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    areaId: expect.any(String),
                    resources: expect.arrayContaining([expect.anything()]),
                }),
            ]),
        );
    });
    it('should match terrain resources png', async () => {
        const c = canvas.createCanvas(2000, 2000);
        const context = c.getContext('2d');
        for (const resource of resources) {
            context.save();
            if (resource.objectType === ENetworkObjectType.TREE) {
                context.beginPath();
                context.fillStyle = 'green';
                context.arc(resource.x + 1000, resource.y + 1000, 10, 0, Math.PI * 2);
                context.fill();
            } else if (resource.objectType === ENetworkObjectType.ROCK) {
                context.beginPath();
                context.fillStyle = 'grey';
                context.arc(resource.x + 1000, resource.y + 1000, 10, 0, Math.PI * 2);
                context.fill();
            } else if (resource.objectType === ENetworkObjectType.POND) {
                context.beginPath();
                context.fillStyle = 'blue';
                context.arc(resource.x, resource.y, 10, 0, Math.PI * 2);
                context.fill();
            }
            context.restore();
        }
        for (const area of areas) {
            context.save();
            context.beginPath();
            context.strokeStyle = 'black';
            context.lineWidth = 2;
            drawCornerObjects({
                context,
                tileObject: area,
                tileSize: 0,
                radius: 0,
                scale: 1,
            });
            context.stroke();
            context.restore();
        }
        const pipingImage = c.createPNGStream().pipe(fs.createWriteStream('terrainImageResources.png'));
        await new Promise((resolve, reject) => {
            pipingImage.on('finish', () => {
                resolve();
            });
            pipingImage.on('error', () => {
                reject();
            });
        });
        const imageBuffer = await new Promise((resolve, reject) => {
            fs.readFile('terrainImageResources.png', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
        expect(imageBuffer).toMatchImageSnapshot();
    });
    it('should match terrain tile png', async () => {
        const c = canvas.createCanvas(750, 750);
        const context = c.getContext('2d');
        const diagram = delaunay.Delaunay.from(areas.map(({ x, y }) => [x, y]));
        for (let x = -75; x < 75; x++) {
            for (let y = -75; y < 75; y++) {
                const location: IObject = {
                    x: x * terrainTileSize,
                    y: y * terrainTileSize,
                };
                const areaIndex = diagram.find(location.x, location.y);
                const area = areas[areaIndex];
                if (area) {
                    context.save();
                    context.beginPath();
                    context.fillStyle = getTileColor(area);
                    context.rect((x + 75) * 5, (y + 75) * 5, 5, 5);
                    context.fill();
                    context.restore();
                } else {
                    throw new Error('Cannot find area after sorting by closest area');
                }
            }
        }
        const pipingImage = c.createPNGStream().pipe(fs.createWriteStream('terrainImageTiles.png'));
        await new Promise((resolve, reject) => {
            pipingImage.on('finish', () => {
                resolve();
            });
            pipingImage.on('error', () => {
                reject();
            });
        });
        const imageBuffer = await new Promise((resolve, reject) => {
            fs.readFile('terrainImageTiles.png', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
        expect(imageBuffer).toMatchImageSnapshot();
    });
    it('should test terrainTileToId', () => {
        expect(
            terrainTileToId({
                tileX: 0,
                tileY: 0,
            }),
        ).toBe('terrainTile(0,0)');
    });
    it('should test areaTileToId', () => {
        expect(
            areaTileToId({
                tileX: 0,
                tileY: 0,
            }),
        ).toBe('areaTile(0,0)');
    });
    it('should test biomeTileToId', () => {
        expect(
            biomeTileToId({
                tileX: 0,
                tileY: 0,
            }),
        ).toBe('biomeTile(0,0)');
    });
    it('should test continentTileToId', () => {
        expect(
            continentTileToId({
                tileX: 0,
                tileY: 0,
            }),
        ).toBe('continentTile(0,0)');
    });
    it('should test getTerrainTilePosition', () => {
        expect(getTerrainTilePosition({ x: 0, y: 0 })).toEqual({
            tileX: 0,
            tileY: 0,
        });
    });
    it('should test getAreaTilePosition', () => {
        expect(getAreaTilePosition({ x: 0, y: 0 })).toEqual({
            tileX: 0,
            tileY: 0,
        });
    });
    it('should test getBiomeTilePosition', () => {
        expect(getBiomeTilePosition({ x: 0, y: 0 })).toEqual({
            tileX: 0,
            tileY: 0,
        });
    });
    it('should test getContinentTilePosition', () => {
        expect(getContinentTilePosition({ x: 0, y: 0 })).toEqual({
            tileX: 0,
            tileY: 0,
        });
    });
});
