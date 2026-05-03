import type { MomentPost } from '../types';

/** Oldest-first month key: known 1–12; unknown after December. */
export function monthSortRankOldest(month: number | undefined): number {
  return month ?? 13;
}

/** Newest-first within a year: December→January, then year-only (unknown month last). */
export function monthSortRankNewest(month: number | undefined): number {
  return month ?? 0;
}

/**
 * Oldest → newest (historical forward). Unknown-month posts follow all dated months in that year.
 */
export function compareMomentPostsOldestFirst(a: MomentPost, b: MomentPost): number {
  if (a.year !== b.year) return a.year - b.year;
  const ma = monthSortRankOldest(a.month);
  const mb = monthSortRankOldest(b.month);
  if (ma !== mb) return ma - mb;
  if (a.authorId !== b.authorId) return a.authorId.localeCompare(b.authorId);
  return a.id.localeCompare(b.id);
}

/**
 * Newest → oldest (feed default: latest events at the top). Within a year, later months before earlier ones; year-only posts last.
 */
export function compareMomentPostsNewestFirst(a: MomentPost, b: MomentPost): number {
  if (a.year !== b.year) return b.year - a.year;
  const ma = monthSortRankNewest(a.month);
  const mb = monthSortRankNewest(b.month);
  if (ma !== mb) return mb - ma;
  if (a.authorId !== b.authorId) return a.authorId.localeCompare(b.authorId);
  return a.id.localeCompare(b.id);
}

export function sortMomentPosts(posts: MomentPost[]): MomentPost[] {
  return [...posts].sort(compareMomentPostsNewestFirst);
}
