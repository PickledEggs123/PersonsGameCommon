import 'jest';
import {
    ENetworkObjectType,
    getNetworkObjectTypeDescription,
    getNetworkObjectTypeGroup,
    getNetworkObjectTypeName,
} from './GameTypes';

describe('GetNetworkObjectTypeData', () => {
    it('getNetworkObjectTypeGroup', () => {
        for (const type of Object.values(ENetworkObjectType)) {
            expect(getNetworkObjectTypeGroup(type)).toEqual(expect.any(String));
        }
        expect(() => getNetworkObjectTypeGroup('RANDOM' as ENetworkObjectType)).toThrow();
    });
    it('getNetworkObjectTypeName', () => {
        for (const type of Object.values(ENetworkObjectType)) {
            expect(getNetworkObjectTypeName(type)).toEqual(expect.any(String));
        }
        expect(() => getNetworkObjectTypeName('RANDOM' as ENetworkObjectType)).toThrow();
    });
    it('getNetworkObjectTypeDescription', () => {
        for (const type of Object.values(ENetworkObjectType)) {
            expect(getNetworkObjectTypeDescription(type)).toEqual(expect.any(String));
        }
        expect(() => getNetworkObjectTypeDescription('RANDOM' as ENetworkObjectType)).toThrow();
    });
});
