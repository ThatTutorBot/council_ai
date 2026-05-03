/**
 * Moments data: edit the JSON files in `src/data/moments/` directly (one file per advisor id).
 * This module only imports, validates with Zod, and merges—there is no codegen or secondary script.
 */
import type { MomentPost } from '../types';
import { advisorMomentsFileSchema } from './momentSchemas';
import { sortMomentPosts } from './compareMoments';

import zhugeLiang from '../data/moments/zhuge-liang.json';
import caoCao from '../data/moments/cao-cao.json';
import marcusAurelius from '../data/moments/marcus-aurelius.json';
import sunTzu from '../data/moments/sun-tzu.json';
import leonardoDaVinci from '../data/moments/leonardo-da-vinci.json';
import confucius from '../data/moments/confucius.json';
import napoleon from '../data/moments/napoleon.json';
import machiavelli from '../data/moments/machiavelli.json';
import einstein from '../data/moments/einstein.json';

function parseFile(raw: unknown, authorId: string): MomentPost[] {
  const parsed = advisorMomentsFileSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(`Invalid Moments JSON for ${authorId}`, parsed.error.flatten());
    throw new Error(`Invalid Moments data: ${authorId}`);
  }
  return parsed.data.posts.map((p) => ({ ...p, authorId }));
}

function buildAll(): MomentPost[] {
  const merged: MomentPost[] = [
    ...parseFile(zhugeLiang, 'zhuge-liang'),
    ...parseFile(caoCao, 'cao-cao'),
    ...parseFile(marcusAurelius, 'marcus-aurelius'),
    ...parseFile(sunTzu, 'sun-tzu'),
    ...parseFile(leonardoDaVinci, 'leonardo-da-vinci'),
    ...parseFile(confucius, 'confucius'),
    ...parseFile(napoleon, 'napoleon'),
    ...parseFile(machiavelli, 'machiavelli'),
    ...parseFile(einstein, 'einstein'),
  ];
  return sortMomentPosts(merged);
}

/** Every advisor Moments JSON merged and sorted for the global timeline. */
export const ALL_MOMENT_POSTS: MomentPost[] = buildAll();
