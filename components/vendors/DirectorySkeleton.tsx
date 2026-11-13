import { Skeleton } from "@/components/ui/Skeleton";

/** The directory while its search and filters wake up: the category bar, the count, and a page of cards. */
export function DirectorySkeleton() {
  return (
    <div aria-busy="true">
      <div className="flex flex-col gap-5 border-b hairline pb-5 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-7 overflow-hidden">
          {[1.5, 4.5, 5, 6.5, 6.5, 3.5].map((w, i) => (
            <Skeleton key={i} className="h-[1.1rem] shrink-0" style={{ width: `${w}rem` }} />
          ))}
        </div>
        <div className="flex gap-6">
          <Skeleton className="h-[1.1rem] w-48 md:w-60" />
          <Skeleton className="h-[1.1rem] w-16" />
        </div>
      </div>
      <div className="flex min-h-14 items-center py-4">
        <Skeleton className="h-[0.9rem] w-20" />
      </div>
      <ul className="grid grid-cols-1 gap-x-[clamp(1rem,1.6vw,1.5rem)] gap-y-10 pt-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i}>
            <VendorCardSkeleton aspect="aspect-[3/2] sm:aspect-[4/5]" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One vendor card: the photo at its ratio, the name, the discipline, the languages. */
export function VendorCardSkeleton({ aspect = "aspect-[4/5]" }: { aspect?: string }) {
  return (
    <div aria-hidden>
      <Skeleton className={`${aspect} w-full`} />
      <Skeleton className="mt-4 h-[1.35rem] w-3/4" />
      <Skeleton className="mt-2.5 h-[0.85rem] w-1/2" />
      <Skeleton className="mt-1.5 h-[0.85rem] w-2/5" />
    </div>
  );
}
