import { useMemo } from 'react';
import { MoreHorizontal } from 'lucide-react';

import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ADVISORS, type MomentPost } from '../types';
import { ALL_MOMENT_POSTS } from '../moments/loadMoments';
import { groupSortedMomentPosts } from '../moments/groupMoments';

function MomentImages({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;
  if (urls.length === 1) {
    return (
      <img
        src={urls[0]}
        alt=""
        className="rounded-lg max-h-56 w-full max-w-sm object-cover border border-council-hairline/40 shadow-sm"
      />
    );
  }
  const cols = urls.length === 2 ? 'grid-cols-2' : 'grid-cols-3';
  return (
    <div className={cn('grid gap-1 max-w-[280px]', cols)}>
      {urls.map((src) => (
        <img
          key={src}
          src={src}
          alt=""
          className="rounded aspect-square object-cover w-full bg-council-canvas border border-council-hairline/30"
        />
      ))}
    </div>
  );
}

function MomentCard({ post }: { post: MomentPost }) {
  const advisor = ADVISORS.find((a) => a.id === post.authorId);
  const images = post.images ?? [];

  return (
    <div className="flex gap-4 border-b border-council-hairline/60 pb-8 last:border-0">
      <Avatar className="w-10 h-10 rounded shrink-0">
        <AvatarImage src={advisor?.avatar} className="rounded" />
      </Avatar>
      <div className="flex-1 space-y-2 min-w-0">
        <h3 className="text-council-moments-link font-bold text-[15px] tracking-tight">{advisor?.name}</h3>
        <p className="text-[16px] leading-relaxed font-medium text-foreground">{post.content}</p>
        {post.translation && (
          <div className="text-[12px] font-medium text-council-text-soft border-t border-black/[0.07] pt-2.5">
            {post.translation}
          </div>
        )}
        {images.length > 0 && (
          <div className="pt-1">
            <MomentImages urls={images} />
          </div>
        )}
        <div className="flex justify-between items-center pt-2">
          <span className="text-[11px] text-council-text-muted">
            {post.month !== undefined
              ? `${new Date(2000, post.month - 1, 15).toLocaleString('en-US', { month: 'long' })} · ${post.year < 0 ? `${Math.abs(post.year)} BCE` : post.year}`
              : `Unknown month · ${post.year < 0 ? `${Math.abs(post.year)} BCE` : post.year}`}
          </span>
          <div className="bg-council-canvas p-1 rounded-lg cursor-pointer hover:bg-council-row-hover motion-safe:transition-colors shrink-0">
            <MoreHorizontal className="w-4 h-4 text-council-moments-link" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MomentsFeed() {
  const groups = useMemo(() => groupSortedMomentPosts(ALL_MOMENT_POSTS), []);

  return (
    <div className="space-y-14">
      {groups.map((y) => (
        <section key={y.year} className="space-y-8">
          <h2 className="text-lg font-semibold tracking-tight text-foreground border-b border-council-hairline/80 pb-2">
            {y.yearLabel}
          </h2>
          {y.months.map((m) => (
            <div key={`${y.year}-${String(m.monthKey)}`} className="space-y-6">
              <h3 className="text-[13px] font-semibold uppercase tracking-wide text-council-text-muted">{m.label}</h3>
              <div className="space-y-10">
                {m.posts.map((post) => (
                  <div key={`${post.authorId}-${post.id}`}>
                    <MomentCard post={post} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
