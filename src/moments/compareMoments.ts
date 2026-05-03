import type { MomentPost } from '../types';

/** Sort key for month: known months 1–12; unknown sorts after December. */
export function monthSortRank(month: number | undefined): number {
  return month ?? 13;
}

/**
 * Global timeline order: year → month precision → advisor id → post id.
 * Unknown-month posts follow all dated months within the same year.
 */
export function compareMomentPosts(a: MomentPost, b: MomentPost): number {
  if (a.year !== b.year) return a.year - b.year;
  const ma = monthSortRank(a.month);
  const mb = monthSortRank(b.month);
  if (ma !== mb) return ma - mb;
  if (a.authorId !== b.authorId) return a.authorId.localeCompare(b.authorId);
  return a.id.localeCompare(b.id);
}

export function sortMomentPosts(posts: MomentPost[]): MomentPost[] {
  return [...posts].sort(compareMomentPosts);
}
