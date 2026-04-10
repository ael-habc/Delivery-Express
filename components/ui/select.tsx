import * as React from "react";

import { cn } from "@/lib/utils";

function Select({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="group relative w-full">
      <select
        className={cn(
          "flex h-11 w-full appearance-none rounded-xl border border-input/80 bg-linear-to-b from-background to-muted/30 px-3 py-2 pr-10 text-sm shadow-xs transition-all outline-none hover:border-ring/50 hover:bg-background focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground transition-colors group-focus-within:text-foreground">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M6 9L12 15L18 9"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );
}

export { Select };
