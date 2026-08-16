import PageHeader from "@/app/components/PageHeader";
import { Skeleton, SkeletonRows } from "@/app/components/Skeleton";

export default function Loading() {
  return (
    <>
      <PageHeader title="Asta" />
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_296px]">
        <div>
          <Skeleton className="h-14 w-full rounded-lg" />
          <div className="mt-6">
            <SkeletonRows count={6} />
          </div>
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </>
  );
}
