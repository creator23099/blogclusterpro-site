// src/components/Section.tsx
import React from "react";
import { cn } from "@/lib/cn";

type Props = {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  id?: string;
  as?: React.ElementType; // <- no JSX namespace
};

export default function Section({
  children,
  className,
  containerClassName,
  id,
  as: Tag = "section",
}: Props) {
  const Comp = Tag as React.ElementType;
  return (
    <Comp id={id} className={cn("w-full", className)}>
      <div className={cn("mx-auto w-full max-w-7xl px-5 md:px-8", containerClassName)}>
        {children}
      </div>
    </Comp>
  );
}