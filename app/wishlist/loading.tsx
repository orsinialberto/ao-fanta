import PageHeader from "@/app/components/PageHeader";
import { Skeleton, SkeletonRows } from "@/app/components/Skeleton";
import { TIER_ORDER } from "@/lib/wishlist";

export default function Loading() {
  return (
    <>
      <PageHeader title="Wishlist" />
      <Skeleton className="h-8 w-full" />
      {TIER_ORDER.map((tier) => (
        <div key={tier} className="mt-8">
          <Skeleton className="h-6 w-48" />
          <div className="mt-2">
            <SkeletonRows count={3} />
          </div>
        </div>
      ))}
    </>
  );
}
