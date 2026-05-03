import { describe, expect, it } from 'vitest';
import type { MomentPost } from '../types';
import { compareMomentPosts, monthSortRank, sortMomentPosts } from './compareMoments';
import { groupSortedMomentPosts } from './groupMoments';

describe('compareMomentPosts', () => {
  it('monthSortRank puts unknown after December', () => {
    expect(monthSortRank(12)).toBe(12);
    expect(monthSortRank(undefined)).toBe(13);
  });

  it('orders by year, month, authorId, id', () => {
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
    expect(compareMomentPosts(a, b)).toBeGreaterThan(0);
    const u: MomentPost = { id: 'u', authorId: 'a', year: 200, content: 'c', translation: 'c' };
    const m: MomentPost = { id: 'm', authorId: 'a', year: 200, month: 6, content: 'c', translation: 'c' };
    expect(compareMomentPosts(u, m)).toBeGreaterThan(0);
  });
});

describe('groupSortedMomentPosts', () => {
  it('buckets unknown month after known months', () => {
    const posts: MomentPost[] = sortMomentPosts([
      { id: '1', authorId: 'a', year: 100, month: 2, content: 'x', translation: 'x' },
      { id: '2', authorId: 'a', year: 100, content: 'x', translation: 'x' },
      { id: '3', authorId: 'a', year: 100, month: 1, content: 'x', translation: 'x' },
    ]);
    const g = groupSortedMomentPosts(posts);
    expect(g).toHaveLength(1);
    expect(g[0].months).toHaveLength(3);
    expect(g[0].months[0].monthKey).toBe(1);
    expect(g[0].months[1].monthKey).toBe(2);
    expect(g[0].months[2].monthKey).toBe('unknown');
  });
});
