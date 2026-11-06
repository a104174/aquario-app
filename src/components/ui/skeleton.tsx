import { cx } from "@/lib/cx";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} />;
}

/** Skeleton de um cartão de aquário. */
export function SkeletonCartao() {
  return (
    <div className="rounded-[18px] bg-surface p-4 shadow-[var(--shadow-card)]">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="mt-2 h-4 w-1/3" />
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    </div>
  );
}

export function SkeletonLista({ linhas = 5 }: { linhas?: number }) {
  return (
    <div className="overflow-hidden rounded-[14px] bg-surface">
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-separator px-4 py-3 last:border-b-0">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="mt-1.5 h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
