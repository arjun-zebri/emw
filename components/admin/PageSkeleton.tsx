import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Any admin or portal page the moment its link is clicked, before the page has drawn its own
 * skeleton: the title, the line under it, the tabs, and the panel beneath.
 */
export function PageSkeleton() {
  return (
    <div aria-busy="true">
      <div className="mb-8 md:mb-10">
        <Skeleton className="h-[clamp(1.875rem,3vw,2.5rem)] w-56" />
        <Skeleton className="mt-3 h-[0.875rem] w-80 max-w-full" />
        <div className="mt-8 flex gap-6 border-b hairline pb-3.5">
          {[2, 4.5, 5, 4].map((w, i) => (
            <Skeleton key={i} className="h-[0.875rem]" style={{ width: `${w}rem` }} />
          ))}
        </div>
      </div>
      <div className="bg-surface">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-ink/[0.06] px-5 py-3 sm:px-6">
            <Skeleton className="size-14 shrink-0" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-[0.9375rem] w-48 max-w-full" />
              <Skeleton className="mt-2 h-[0.75rem] w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
