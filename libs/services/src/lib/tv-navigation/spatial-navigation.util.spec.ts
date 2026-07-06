import {
    findBestSpatialCandidate,
    findInitialSpatialCandidate,
    isInDirection,
    SpatialRect,
} from './spatial-navigation.util';

function rect(
    left: number,
    top: number,
    width = 100,
    height = 40
): SpatialRect {
    return { left, top, right: left + width, bottom: top + height };
}

describe('spatial navigation geometry', () => {
    // A 3×3 grid of 100×40 tiles with 20px gutters:
    //   a b c
    //   d e f
    //   g h i
    const grid = {
        a: rect(0, 0),
        b: rect(120, 0),
        c: rect(240, 0),
        d: rect(0, 60),
        e: rect(120, 60),
        f: rect(240, 60),
        g: rect(0, 120),
        h: rect(120, 120),
        i: rect(240, 120),
    };

    const candidatesExcept = (excluded: keyof typeof grid) =>
        Object.entries(grid)
            .filter(([key]) => key !== excluded)
            .map(([key, r]) => ({ item: key, rect: r }));

    it('moves to the direct neighbor in each direction from the center', () => {
        const from = grid.e;
        const candidates = candidatesExcept('e');

        expect(findBestSpatialCandidate(from, candidates, 'up')).toBe('b');
        expect(findBestSpatialCandidate(from, candidates, 'down')).toBe('h');
        expect(findBestSpatialCandidate(from, candidates, 'left')).toBe('d');
        expect(findBestSpatialCandidate(from, candidates, 'right')).toBe('f');
    });

    it('prefers row alignment over closer diagonal candidates', () => {
        // From "d", moving right must reach "e" (same row), not "b" or "h".
        expect(
            findBestSpatialCandidate(grid.d, candidatesExcept('d'), 'right')
        ).toBe('e');
    });

    it('returns null at the edge of the layout', () => {
        expect(
            findBestSpatialCandidate(grid.a, candidatesExcept('a'), 'up')
        ).toBeNull();
        expect(
            findBestSpatialCandidate(grid.a, candidatesExcept('a'), 'left')
        ).toBeNull();
        expect(
            findBestSpatialCandidate(grid.i, candidatesExcept('i'), 'down')
        ).toBeNull();
    });

    it('crosses a gutter to a misaligned candidate when nothing is aligned', () => {
        const sidebar = rect(0, 0, 100, 300);
        const offsetTile = rect(200, 200);

        expect(
            findBestSpatialCandidate(
                sidebar,
                [{ item: 'tile', rect: offsetTile }],
                'right'
            )
        ).toBe('tile');
    });

    it('treats overlapping centers as not-in-direction', () => {
        const outer = rect(0, 0, 200, 200);
        const sameCenter = rect(50, 50, 100, 100);
        expect(isInDirection(outer, sameCenter, 'right')).toBe(false);
        expect(isInDirection(outer, sameCenter, 'down')).toBe(false);
    });

    it('picks the candidate nearest the viewport origin as the entry point', () => {
        expect(
            findInitialSpatialCandidate([
                { item: 'far', rect: rect(500, 500) },
                { item: 'near', rect: rect(10, 10) },
                { item: 'offscreen', rect: rect(-500, -500, 50, 40) },
            ])
        ).toBe('near');
    });
});
