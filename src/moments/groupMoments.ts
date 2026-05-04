import type { MomentPost } from '../types';

export type MonthBucketKey = number | 'unknown';

export interface MomentMonthBucket {
  monthKey: MonthBucketKey;
  /** e.g. "March" or "Unknown month" */
  label: string;
  posts: MomentPost[];
}

export interface MomentYearGroup {
  year: number;
  /** Display line for the year header (handles BCE). */
  yearLabel: string;
  months: MomentMonthBucket[];
}

export function formatYearLabel(year: number): string {
  if (year < 0) return `${Math.abs(year)} BCE`;
  return String(year);
}

export function formatMonthLabel(month: number): string {
  return new Date(2000, month - 1, 15).toLocaleString('en-US', { month: 'long' });
}

/**
 * `posts` must already be sorted **newest first** (`compareMomentPostsNewestFirst` / `sortMomentPosts`).
 */
export function groupSortedMomentPosts(posts: MomentPost[]): MomentYearGroup[] {
  if (posts.length === 0) return [];

  const years = new Map<number, MomentPost[]>();
  for (const p of posts) {
    const list = years.get(p.year);
    if (list) list.push(p);
    else years.set(p.year, [p]);
  }

  const yearNums = [...years.keys()].sort((a, b) => b - a);
  const result: MomentYearGroup[] = [];

  for (const year of yearNums) {
    const yearPosts = years.get(year)!;
    const months: MomentMonthBucket[] = [];
    let bucket: MomentPost[] = [];
    let currentKey: MonthBucketKey | null = null;

    const flush = () => {
      if (bucket.length === 0 || currentKey === null) return;
      const label =
        currentKey === 'unknown'
          ? 'Unknown month'
          : formatMonthLabel(currentKey);
      months.push({ monthKey: currentKey, label, posts: bucket });
      bucket = [];
    };

    for (const p of yearPosts) {
      const key: MonthBucketKey = p.month !== undefined ? p.month : 'unknown';
      if (currentKey !== key) {
        flush();
        currentKey = key;
      }
      bucket.push(p);
    }
    flush();

    result.push({
      year,
      yearLabel: formatYearLabel(year),
      months,
    });
  }

  return result;
}
