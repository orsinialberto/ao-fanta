import PageHeader from "@/app/components/PageHeader";
import { Skeleton, SkeletonRows } from "@/app/components/Skeleton";

export default function Loading() {
  return (
    <>
      <PageHeader title="Wishlist" />
      <Skeleton className="h-8 w-full" />
      <div className="mt-4">
        <SkeletonRows count={6} />
      </div>
    </>
  );
}
