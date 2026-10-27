import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-sm border border-transparent font-sans text-sm font-normal whitespace-nowrap select-none disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // The editorial button: a hairline outline, a quiet fill on hover.
        default: "border-rule-strong bg-transparent text-text hover:bg-highlight-low aria-expanded:bg-highlight-low",
        solid: "bg-primary text-primary-foreground hover:bg-primary/85",
        secondary: "bg-secondary text-secondary-foreground hover:bg-highlight-med",
        ghost: "text-meta hover:bg-highlight-low hover:text-text aria-expanded:bg-highlight-low aria-expanded:text-text",
        destructive: "text-destructive hover:bg-highlight-low",
        link: "text-text underline decoration-accent underline-offset-4 hover:decoration-2",
      },
      size: {
        default: "h-9 px-3.5",
        xs: "h-6 px-2 text-xs",
        sm: "h-8 px-3",
        lg: "h-10 px-5",
        icon: "size-9",
        "icon-xs": "size-6",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
 className,
 variant = "default",
 size = "default",
 asChild = false,
 ...props
}: React.ComponentProps<"button"> &
 VariantProps<typeof buttonVariants> & {
 asChild?: boolean
 }) {
 const Comp = asChild ? Slot.Root : "button"

 return (
 <Comp
 data-slot="button"
 data-variant={variant}
 data-size={size}
 className={cn(buttonVariants({ variant, size, className }))}
 {...props}
 />
 )
}

export { Button, buttonVariants }
