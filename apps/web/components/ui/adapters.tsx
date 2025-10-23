'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function GrainBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none fixed inset-0',
        'bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.018),transparent_60%)]',
        className
      )}
    />
  );
}

export function GlowCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative rounded-2xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm',
        'shadow-[0_0_32px_-18px_rgba(255,255,255,0.25)]',
        className
      )}
    >
      {children}
    </div>
  );
}

export function BadgePill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-neutral-800 bg-neutral-900/60',
        'px-3 py-1 text-xs text-neutral-400',
        className
      )}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'lg',
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizes = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-5 text-base',
  }[size];
  const variants = {
    primary:
      'bg-[oklch(70%_0.12_255)] text-neutral-900 hover:bg-[oklch(72%_0.12_255)] focus:ring-neutral-700',
    ghost: 'border border-neutral-800 text-neutral-200 hover:bg-neutral-800/40',
    secondary:
      'bg-neutral-800 text-neutral-100 hover:bg-neutral-700 border border-neutral-700',
  }[variant];
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        sizes,
        variants,
        className
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export const MotionFadeIn: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
  >
    {children}
  </motion.div>
);

export const MotionItem: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25, ease: 'easeOut' }}
  >
    {children}
  </motion.div>
);

export const HoverLift: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <motion.div
    className={cn('rounded-2xl', className)}
    whileHover={{ y: -2, scale: 1.01 }}
    transition={{ type: 'spring', stiffness: 240, damping: 22 }}
  >
    {children}
  </motion.div>
);
