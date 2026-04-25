import * as React from "react"

import { cn } from "@/lib/utils"

type ModalProps = React.HTMLAttributes<HTMLDivElement> & {
  open: boolean
}

export function Modal({ open, className, children, ...props }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6">
      <div
        className={cn(
          "premium-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  )
}
