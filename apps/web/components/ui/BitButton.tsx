"use client";

import { motion } from "framer-motion";
import React from "react";
import clsx from "clsx";

interface BitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  full?: boolean;
}

export function BitButton({
  variant = "primary",
  loading,
  full,
  className,
  children,
  ...props
}: BitButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-3 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40";
  const styles = {
    primary:
      "bg-emerald-500 text-black hover:bg-emerald-400 disabled:bg-gray-600",
    secondary:
      "bg-blue-500 text-black hover:bg-blue-400 disabled:bg-gray-600",
    ghost:
      "bg-white/10 text-white hover:bg-white/15 ring-1 ring-white/10 disabled:bg-gray-700",
  }[variant];

  return (
    // @ts-ignore
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={clsx(base, styles, full && "w-full", className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span className="relative">
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-transparent" />
          Processing...
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
}
