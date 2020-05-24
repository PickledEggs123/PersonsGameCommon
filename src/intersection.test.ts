import 'jest';
import { dotProduct, intersectionOfVectors, intersectionTime, leftNormal, perpendicularProduct } from './intersection';

describe('Intersections', () => {
    describe('Left Normal', () => {
        it('should calculate left normal (0, 5)', () => {
            expect(leftNormal({ x: 0, y: 5 })).toEqual({ x: -5, y: 0 });
        });
        it('should calculate left normal (5, 0)', () => {
            expect(leftNormal({ x: 5, y: 0 })).toEqual({ x: -0, y: 5 });
        });
        it('should calculate left normal (0, -5)', () => {
            expect(leftNormal({ x: 0, y: -5 })).toEqual({ x: 5, y: 0 });
        });
        it('should calculate left normal (-5, 0)', () => {
            expect(leftNormal({ x: -5, y: 0 })).toEqual({ x: -0, y: -5 });
        });
    });
    describe('Dot Product', () => {
        it('should dot product (1, 1) (2, 3)', () => {
            expect(dotProduct({ x: 1, y: 1 }, { x: 2, y: 3 })).toBe(5);
        });
    });
    describe('Perpendicular Product', () => {
        it('should perpendicular product (1, 1) (2, 3)', () => {
            expect(perpendicularProduct({ x: 1, y: 1 }, { x: 2, y: 3 })).toBe(1);
        });
    });
    describe('Time to intersection', () => {
        it('should calculate t=1', () => {
            expect(intersectionTime({ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: -1 })).toBe(1);
        });
        it('should calculate t=2', () => {
            expect(intersectionTime({ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: -2 })).toBe(2);
        });
        it('should calculate t=3', () => {
            expect(intersectionTime({ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: -3 })).toBe(3);
        });
        it('should calculate t=1 (angled)', () => {
            expect(intersectionTime({ x: 1, y: -1 }, { x: 1, y: 0 }, { x: 0, y: -1 })).toBe(1);
        });
        it('should calculate t=2 (angled)', () => {
            expect(intersectionTime({ x: 1, y: -1 }, { x: 1, y: 0 }, { x: 0, y: -2 })).toBe(2);
        });
        it('should calculate t=3 (angled)', () => {
            expect(intersectionTime({ x: 1, y: -1 }, { x: 1, y: 0 }, { x: 0, y: -3 })).toBe(3);
        });
    });
    describe('Finite segment intersection', () => {
        it('should intersect (start point)', () => {
            expect(intersectionOfVectors({ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 2, y: 0 })).toBe(true);
        });
        it('should intersect (mid point)', () => {
            expect(intersectionOfVectors({ x: 1, y: 0.25 }, { x: 0, y: 1 }, { x: 2, y: 0 })).toBe(true);
        });
        it('should not intersect (end point)', () => {
            expect(intersectionOfVectors({ x: 1, y: 0.5 }, { x: 0, y: 1 }, { x: 2, y: 0 })).toBe(false);
        });
        it('should not intersect (wrong direction)', () => {
            expect(intersectionOfVectors({ x: -1, y: 0 }, { x: 0, y: 1 }, { x: 2, y: 0 })).toBe(false);
        });
        it('should not intersect (parallel)', () => {
            expect(intersectionOfVectors({ x: 0, y: 1 }, { x: 0, y: 1 }, { x: 2, y: 0 })).toBe(false);
        });
    });
});
