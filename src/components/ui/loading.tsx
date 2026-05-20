import * as React from "react"

export function Loading() {
  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex h-23 w-23 items-center justify-center rounded-lg bg-card border border-border shadow-xl">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    </div>
  )
}
