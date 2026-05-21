import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  level?: number
}

const levelClasses: Record<number, string> = {
  0: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  1: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  2: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  3: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  // 1: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  // 2: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  // 3: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  // 4: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  // 5: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  // 6: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
  4: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  5: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  6: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  7: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  8: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  9: "bg-red-400/10 text-red-500 dark:text-red-400 border-red-400/20",
  10: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
}

export function Badge({ level = 0, className, children, ...props }: BadgeProps) {
  const clampedLevel = Math.max(0, Math.min(10, Math.round(level)))
  const colorClass = levelClasses[clampedLevel]

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs uppercase font-semibold border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        colorClass,
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
