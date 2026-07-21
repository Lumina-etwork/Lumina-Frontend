import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          "bg-zinc-900 text-zinc-50 hover:bg-zinc-800",
          "dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200",
          "h-10 px-4 py-2",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
