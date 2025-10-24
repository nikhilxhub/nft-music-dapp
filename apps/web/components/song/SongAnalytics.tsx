"use client";
import { motion } from "framer-motion";

export function SongAnalytics({
  totalPurchases,
  totalStreams,
  loading,
}: {
  totalPurchases: number;
  totalStreams: number;
  loading?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-2 gap-4"
    >
      <div className="rounded-xl bg-white/5 p-4 text-center ring-1 ring-white/10">
        {loading ? (
          <div className="h-6 w-10 mx-auto animate-pulse rounded bg-white/20" />
        ) : (
          <p className="text-2xl font-semibold text-emerald-400">{totalPurchases}</p>
        )}
        <p className="text-sm text-white/60">Unique Purchases</p>
      </div>
      <div className="rounded-xl bg-white/5 p-4 text-center ring-1 ring-white/10">
        {loading ? (
          <div className="h-6 w-10 mx-auto animate-pulse rounded bg-white/20" />
        ) : (
          <p className="text-2xl font-semibold text-blue-400">{totalStreams}</p>
        )}
        <p className="text-sm text-white/60">Total Streams</p>
      </div>
    </motion.div>
  );
}
