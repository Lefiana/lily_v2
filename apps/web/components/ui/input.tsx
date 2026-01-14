import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
    className={cn(
        "flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2",
        "!text-white placeholder:text-zinc-500", // Forced white text
        "focus:outline-none focus:ring-2 focus:ring-purple-500/50",
        "glass-input",
        className
      )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }