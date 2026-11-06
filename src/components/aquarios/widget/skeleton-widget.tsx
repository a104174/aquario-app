/** Skeleton com a forma real do widget (identidade, foto, anel + água, fauna). */
export function SkeletonWidget({ foto }: { foto?: boolean }) {
  return (
    <div className="rounded-[24px] bg-surface p-4 pb-3 shadow-[var(--shadow-card)]" aria-hidden>
      <div className="flex items-start gap-3">
        <div className="skeleton h-10 w-11 rounded-[10px]" />
        <div className="flex-1 space-y-2 pt-0.5">
          <div className="skeleton h-4 w-3/5" />
          <div className="skeleton h-3 w-2/5" />
        </div>
      </div>
      {foto && <div className="skeleton mt-3 aspect-[2/1] w-full rounded-[18px]" />}
      <div className="mt-3.5 flex gap-3 border-t border-separator pt-3.5">
        <div className="skeleton h-[76px] w-[76px] shrink-0 rounded-full" style={{ marginInline: 8 }} />
        <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-3 pt-4">
          <div className="skeleton h-6" />
          <div className="skeleton h-6" />
          <div className="skeleton h-6" />
          <div className="skeleton h-6" />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-separator pt-3">
        <div className="skeleton h-4 w-1/3" />
        <div className="skeleton h-11 w-24 rounded-full" />
      </div>
    </div>
  );
}
