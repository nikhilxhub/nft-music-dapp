"use client";

import React from "react";
import { BitButton } from "@/components/ui/BitButton";

interface SongActionsProps {
  buyLabel: string;
  streamLabel: string;
  isProcessing: boolean;
  canTransact: boolean;
  onBuy: () => void;
  onStream: () => void;
  onShare: () => void;
}

export function SongActions({
  buyLabel,
  streamLabel,
  isProcessing,
  canTransact,
  onBuy,
  onStream,
  onShare,
}: SongActionsProps) {
  return (
    <div className="space-y-3">
      <BitButton
        full
        variant="primary"
        onClick={onBuy}
        loading={isProcessing}
        disabled={!canTransact || isProcessing}
      >
        {canTransact ? buyLabel : "Connect wallet to buy"}
      </BitButton>

      <BitButton
        full
        variant="secondary"
        onClick={onStream}
        loading={isProcessing}
        disabled={!canTransact || isProcessing}
      >
        {canTransact ? streamLabel : "Connect wallet to stream"}
      </BitButton>

      <BitButton full variant="ghost" onClick={onShare} disabled={isProcessing}>
        Share via Blink
      </BitButton>

      <p className="text-xs text-white/50">
        Permanent unlock grants full access forever. Stream unlock is single-session.
      </p>
    </div>
  );
}
