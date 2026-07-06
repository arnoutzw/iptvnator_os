/**
 * Pure geometry for TV-remote spatial navigation: given the focused element's
 * rectangle and the rectangles of all focusable candidates, pick the best
 * candidate in an arrow-key direction. Kept DOM-free so it is unit-testable.
 */
export type SpatialDirection = 'up' | 'down' | 'left' | 'right';

export interface SpatialRect {
    top: number;
    left: number;
    bottom: number;
    right: number;
}

interface ScoredCandidate<T> {
    item: T;
    score: number;
}

const ORTHOGONAL_GAP_WEIGHT = 3;
const ORTHOGONAL_CENTER_WEIGHT = 0.3;

function centerX(rect: SpatialRect): number {
    return (rect.left + rect.right) / 2;
}

function centerY(rect: SpatialRect): number {
    return (rect.top + rect.bottom) / 2;
}

/**
 * A candidate counts as "in direction" when its center has made progress along
 * the primary axis. Center-based comparison keeps large overlapping containers
 * from shadowing their neighbors.
 */
export function isInDirection(
    current: SpatialRect,
    candidate: SpatialRect,
    direction: SpatialDirection
): boolean {
    switch (direction) {
        case 'up':
            return centerY(candidate) < centerY(current) - 1;
        case 'down':
            return centerY(candidate) > centerY(current) + 1;
        case 'left':
            return centerX(candidate) < centerX(current) - 1;
        case 'right':
            return centerX(candidate) > centerX(current) + 1;
    }
}

function axisOverlap(
    aStart: number,
    aEnd: number,
    bStart: number,
    bEnd: number
): number {
    return Math.min(aEnd, bEnd) - Math.max(aStart, bStart);
}

/**
 * Score a candidate for a move in `direction` — lower is better. The score is
 * the primary-axis center distance plus a heavy penalty when the candidate
 * does not overlap the current element on the cross axis (so "right" prefers
 * elements in the same row over closer elements in another row), plus a light
 * cross-axis centering term to break ties deterministically.
 */
export function scoreCandidate(
    current: SpatialRect,
    candidate: SpatialRect,
    direction: SpatialDirection
): number {
    const horizontal = direction === 'left' || direction === 'right';

    const primaryDistance = horizontal
        ? Math.abs(centerX(candidate) - centerX(current))
        : Math.abs(centerY(candidate) - centerY(current));

    const overlap = horizontal
        ? axisOverlap(
              current.top,
              current.bottom,
              candidate.top,
              candidate.bottom
          )
        : axisOverlap(
              current.left,
              current.right,
              candidate.left,
              candidate.right
          );

    const orthogonalGap = overlap > 0 ? 0 : -overlap;
    const orthogonalCenterOffset = horizontal
        ? Math.abs(centerY(candidate) - centerY(current))
        : Math.abs(centerX(candidate) - centerX(current));

    return (
        primaryDistance +
        orthogonalGap * ORTHOGONAL_GAP_WEIGHT +
        orthogonalCenterOffset * ORTHOGONAL_CENTER_WEIGHT
    );
}

/**
 * Pick the best candidate in `direction`, or null when nothing lies that way.
 */
export function findBestSpatialCandidate<T>(
    current: SpatialRect,
    candidates: readonly { item: T; rect: SpatialRect }[],
    direction: SpatialDirection
): T | null {
    let best: ScoredCandidate<T> | null = null;

    for (const candidate of candidates) {
        if (!isInDirection(current, candidate.rect, direction)) {
            continue;
        }

        const score = scoreCandidate(current, candidate.rect, direction);
        if (!best || score < best.score) {
            best = { item: candidate.item, score };
        }
    }

    return best?.item ?? null;
}

/**
 * Entry point when nothing is focused yet: pick the candidate closest to the
 * viewport's top-left corner (reading order), so the first arrow press lands
 * somewhere predictable.
 */
export function findInitialSpatialCandidate<T>(
    candidates: readonly { item: T; rect: SpatialRect }[]
): T | null {
    let best: ScoredCandidate<T> | null = null;

    for (const candidate of candidates) {
        const { rect } = candidate;
        if (rect.bottom < 0 || rect.right < 0) {
            continue;
        }

        const score = Math.hypot(Math.max(0, rect.left), Math.max(0, rect.top));
        if (!best || score < best.score) {
            best = { item: candidate.item, score };
        }
    }

    return best?.item ?? null;
}
