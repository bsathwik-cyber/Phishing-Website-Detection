import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-sm font-semibold uppercase tracking-wider transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyber-cyan disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-cyber-cyan/10 hover:bg-cyber-cyan/20 border border-cyber-cyan/40 hover:border-cyber-cyan text-cyber-cyan glow-border-hover",
        destructive:
          "bg-cyber-danger/10 hover:bg-cyber-danger/20 border border-cyber-danger/40 hover:border-cyber-danger text-cyber-danger",
        outline:
          "border border-cyber-border bg-transparent hover:bg-gray-800 text-gray-300",
        secondary:
          "bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700/80",
        ghost: "hover:bg-gray-800 hover:text-gray-200 text-gray-400",
        link: "text-cyber-cyan underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
