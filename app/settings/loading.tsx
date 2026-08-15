import PageHeader from "@/app/components/PageHeader";
import { Skeleton } from "@/app/components/Skeleton";

export default function Loading() {
  return (
    <>
      <PageHeader title="Impostazioni" />
      <div className="flex max-w-[640px] flex-col gap-10">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    </>
  );
}
