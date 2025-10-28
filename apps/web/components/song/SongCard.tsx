"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import React from "react";

interface SongCardProps {
  image: string;
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}

export function SongCard({ image, title, subtitle, children }: SongCardProps) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="relative overflow-hidden rounded-2xl bg-[#0B0B10]/90 ring-1 ring-white/10 shadow-xl">
        <div className="absolute inset-0 -z-10">
          <Image
            src={image}
            alt={title}
            fill
            className="h-64 w-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-[#0B0B10]/95" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="p-6"
        >
          <div className="mb-4">
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              {title}
            </h1>
            <p className="mt-1 text-sm text-white/60">{subtitle}</p>
          </div>

          <div className="rounded-xl bg-black/30 p-4 backdrop-blur supports-[backdrop-filter]:bg-black/20 ring-1 ring-white/10">
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
