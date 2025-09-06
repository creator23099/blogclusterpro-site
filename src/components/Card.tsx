// src/components/Card.tsx
import React from "react";
import { cn } from "@/lib/cn";

type CardProps = {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;   // <- no JSX namespace
  hover?: boolean;
  padded?: boolean;
};

export function Card({
  children,
  className,
  as: Tag = "div",
  hover = true,
  padded = true,
}: CardProps) {
  const Comp = Tag as React.ElementType;
  return (
    <Comp
      className={cn(
        "rounded-xl2 border border-slate-200/70 bg-white shadow-card",
        hover && "transition hover:shadow-card-lg",
        padded && "p-6",
        className
      )}
    >
      {children}
    </Comp>
  );
}

type HeaderProps = {
  title?: string;
  subtitle?: string;
  className?: string;
  children?: React.ReactNode;
};

export function CardHeader({ title, subtitle, className, children }: HeaderProps) {
  return (
    <div className={cn("mb-3", className)}>
      {title && <h3 className="text-lg font-semibold">{title}</h3>}
      {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      {children}
    </div>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-3", className)}>{children}</div>;
}

export function CardFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("mt-4", className)}>{children}</div>;
}