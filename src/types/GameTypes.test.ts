import 'jest';
import { ENetworkObjectType, getCurrentTDayNightTime, getMaxStackSize } from './GameTypes';

describe('GameTypes Functions', () => {
    describe('getMaxStackSize', () => {
        const cases: Array<{
            objectType: ENetworkObjectType;
            stackSize: number;
        }> = [
            {
                objectType: ENetworkObjectType.STICK,
                stackSize: 10,
            },
            {
                objectType: ENetworkObjectType.WATTLE_WALL,
                stackSize: 4,
            },
            {
                objectType: ENetworkObjectType.WOOD,
                stackSize: 1,
            },
        ];

        for (const c of cases) {
            const { objectType, stackSize } = c;
            it(`should get ${objectType}`, () => {
                expect(getMaxStackSize(objectType)).toBe(stackSize);
            });
        }
    });
    describe('getTimeOfDay', () => {
        it('should get 12:00 am', () => {
            expect(getCurrentTDayNightTime(new Date(Date.UTC(2020, 0, 1, 0, 0)))).toBe(0);
        });
        it('should get 1:00 am', () => {
            expect(getCurrentTDayNightTime(new Date(Date.UTC(2020, 0, 1, 0, 10)))).toBe(600000);
        });
        it('should get 6:00 am', () => {
            expect(getCurrentTDayNightTime(new Date(Date.UTC(2020, 0, 1, 1, 0)))).toBe(3600000);
        });
        it('should get 12:00 pm', () => {
            expect(getCurrentTDayNightTime(new Date(Date.UTC(2020, 0, 1, 2, 0)))).toBe(7200000);
        });
        it('should get 6:00 pm', () => {
            expect(getCurrentTDayNightTime(new Date(Date.UTC(2020, 0, 1, 3, 0)))).toBe(10800000);
        });
        it('should get 11:00 pm', () => {
            expect(getCurrentTDayNightTime(new Date(Date.UTC(2020, 0, 1, 3, 50)))).toBe(13800000);
        });
    });
});
