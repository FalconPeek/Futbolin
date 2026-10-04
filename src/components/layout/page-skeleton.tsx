import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface PageSkeletonProps {
  rows?: number
}

export function PageSkeleton({ rows = 3 }: PageSkeletonProps) {
  return (
    <div className={cn("flex flex-col gap-3 py-4 px-4")}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-lg w-full" />
      ))}
    </div>
  )
}
