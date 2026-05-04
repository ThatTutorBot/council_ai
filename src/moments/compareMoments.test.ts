import { describe, expect, it } from 'vitest';
import type { MomentPost } from '../types';
import {
  compareMomentPostsNewestFirst,
  compareMomentPostsOldestFirst,
  monthSortRankNewest,
  monthSortRankOldest,
  sortMomentPosts,
} from './compareMoments';
import { groupSortedMomentPosts } from './groupMoments';

describe('month sort ranks', () => {
  it('oldest-first: unknown after December', () => {
    expect(monthSortRankOldest(12)).toBe(12);
    expect(monthSortRankOldest(undefined)).toBe(13);
  });

  it('newest-first: unknown last within a year', () => {
    expect(monthSortRankNewest(12)).toBe(12);
    expect(monthSortRankNewest(undefined)).toBe(0);
  });
});

describe('compareMomentPostsNewestFirst', () => {
  it('orders later id after earlier when same month tie', () => {
    const a: MomentPost = {
      id: 'b',
      authorId: 'cao-cao',
      year: 200,
      month: 1,
      content: 'a',
      translation: 'a',
    };
    const b: MomentPost = {
      id: 'a',
      authorId: 'cao-cao',
      year: 200,
      month: 1,
      content: 'a',
      translation: 'a',
    };
    expect(compareMomentPostsNewestFirst(a, b)).toBeGreaterThan(0);
  });

  it('puts June before year-only in same year (newer event above)', () => {
    const u: MomentPost = { id: 'u', authorId: 'a', year: 200, content: 'c', translation: 'c' };
    const m: MomentPost = { id: 'm', authorId: 'a', year: 200, month: 6, content: 'c', translation: 'c' };
    expect(compareMomentPostsNewestFirst(m, u)).toBeLessThan(0);
  });

  it('puts later year first', () => {
    const old: MomentPost = { id: 'o', authorId: 'a', year: 100, content: 'x', translation: 'x' };
    const newer: MomentPost = { id: 'n', authorId: 'a', year: 200, content: 'x', translation: 'x' };
    expect(compareMomentPostsNewestFirst(newer, old)).toBeLessThan(0);
  });
});

describe('compareMomentPostsOldestFirst', () => {
  it('still supports historical forward comparison', () => {
    const old: MomentPost = { id: 'o', authorId: 'a', year: 100, content: 'x', translation: 'x' };
    const newer: MomentPost = { id: 'n', authorId: 'a', year: 200, content: 'x', translation: 'x' };
    expect(compareMomentPostsOldestFirst(old, newer)).toBeLessThan(0);
  });
});

describe('groupSortedMomentPosts (newest-first feed)', () => {
  it('buckets months February, January, then unknown within a year', () => {
    const posts: MomentPost[] = sortMomentPosts([
      { id: '1', authorId: 'a', year: 100, month: 2, content: 'x', translation: 'x' },
      { id: '2', authorId: 'a', year: 100, content: 'x', translation: 'x' },
      { id: '3', authorId: 'a', year: 100, month: 1, content: 'x', translation: 'x' },
    ]);
    const g = groupSortedMomentPosts(posts);
    expect(g).toHaveLength(1);
    expect(g[0].months).toHaveLength(3);
    expect(g[0].months[0].monthKey).toBe(2);
    expect(g[0].months[1].monthKey).toBe(1);
    expect(g[0].months[2].monthKey).toBe('unknown');
  });
});
