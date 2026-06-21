import React from "react";
import { cn } from "@/lib/utils"; // utility for classNames if exists

// Reusable glass‑morphic card with soft shadow and hover lift
export const FloatingCard: React.FC<React.PropsWithChildren<{
  className?: string;
}>> = ({ children, className }) => {
  return (
    <div className={cn("saas-card relative overflow-hidden", className)}>
      {children}
    </div>
  );
};
