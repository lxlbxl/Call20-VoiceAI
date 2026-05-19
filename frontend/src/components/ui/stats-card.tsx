import * as React from "react"
import { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: { value: number; isPositive: boolean }
  description?: string
  className?: string
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  description,
  className,
}: StatsCardProps) {
  return (
    <Card className={cn("transition-all duration-200 hover:shadow-lg", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--muted-foreground)]">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {trend && (
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium",
                trend.isPositive ? "text-emerald-600" : "text-red-600"
              )}>
                <span>{trend.isPositive ? "↑" : "↓"}</span>
                <span>{Math.abs(trend.value)}%</span>
                <span className="text-[var(--muted-foreground)]">vs last week</span>
              </div>
            )}
            {description && (
              <p className="text-xs text-[var(--muted-foreground)]">{description}</p>
            )}
          </div>
          <div className="flex size-12 items-center justify-center rounded-lg bg-[var(--primary)]/10">
            <Icon className="size-6 text-[var(--primary)]" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}