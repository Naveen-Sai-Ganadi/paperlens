"use client";

import type { ReactNode } from "react";

export function Card({ title, icon, children, tone }: { title?: string; icon?: ReactNode; children: ReactNode; tone?: "accent" | "blue" }) {
  const toneCls = tone === "accent" ? "border-accent/40 bg-accent-soft/40" : tone === "blue" ? "border-blue/30 bg-blue-soft/50" : "border-line bg-card";
  return (
    <section className={`rounded-xl border p-5 ${toneCls}`}>
      {title && (
        <h3 className="mb-3 flex items-center gap-2 font-serif text-lg font-semibold">
          {icon}
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}

export function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-[0.95rem] leading-relaxed">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

export function Skeleton({ lines = 6 }: { lines?: number }) {
  return (
    <div className="space-y-5">
      {Array.from({ length: Math.ceil(lines / 3) }).map((_, b) => (
        <div key={b} className="space-y-2.5 rounded-xl border border-line bg-card p-5">
          <div className="skeleton h-5 w-1/3" />
          <div className="skeleton h-3.5 w-full" />
          <div className="skeleton h-3.5 w-11/12" />
          <div className="skeleton h-3.5 w-4/5" />
        </div>
      ))}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "outline";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const styles = {
    primary: "bg-ink text-paper hover:opacity-90",
    outline: "border border-line bg-card hover:bg-sunk",
    ghost: "hover:bg-sunk",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}
