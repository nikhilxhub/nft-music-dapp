"use client"; // Required because it uses browser APIs (clipboard) and toast

import { toast } from "sonner";
interface SongDetails {
  mint: string;
  artist: string;
  curator: string; // Needed for contract calls
  metadataUri: string;
  streamLamports: number; // This is the pay-per-stream price
  buyLamports: number;    // This is the permanent buy price
}

/**
 * Copies a "Buy Song" Blink URL to the clipboard.
 * @param mint The mint address of the song to create a link for.
 */
export const blink = (songDetails:SongDetails) => {
  if (!songDetails) {
    toast.error("Song is still loading, please wait.");
    return;
  }
  
  // This is the API link we will build in the next step
  const blinkUrl = `${window.location.origin}/api/blink/buy/${songDetails.mint}`;

  // Copy the link to the user's clipboard
  navigator.clipboard.writeText(blinkUrl).then(
    () => {
      toast.success("Blink link copied to clipboard! Share it.");
    },
    (err) => {
      console.error("Clipboard copy failed:", err);
      toast.error("Failed to copy link.");
    }
  );
};