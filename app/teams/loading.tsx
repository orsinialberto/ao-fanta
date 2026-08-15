import PageHeader from "@/app/components/PageHeader";
import { Skeleton } from "@/app/components/Skeleton";

export default function Loading() {
  return (
    <>
      <PageHeader title="Squadre" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-80 w-full rounded-lg" />
        ))}
      </div>
    </>
  );
}
