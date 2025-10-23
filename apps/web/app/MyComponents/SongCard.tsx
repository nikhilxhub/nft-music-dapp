'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { GlowCard, HoverLift } from '@/components/ui/adapters';
import { Skeleton } from '@/components/ui/skeleton';

interface NftMetadata {
  name: string;
  image: string;
  properties: {
    category: string;
    files: { type: string; uri: string }[];
  };
}

interface Song {
  mint: string;
  artist: string;
  metadataUri: string;
}

export function SongCard({ song }: { song: Song }) {
  const [metadata, setMetadata] = useState<NftMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchMetadata() {
      if (!song.metadataUri) {
        setIsLoading(false);
        setError(true);
        return;
      }
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const proxyUrl = `${API_BASE_URL}/metadata?url=${encodeURIComponent(song.metadataUri)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Failed to fetch metadata via proxy');
        const data: NftMetadata = await response.json();
        setMetadata(data);
      } catch (err) {
        console.error('Failed to fetch metadata for song:', song.mint, err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    }
    fetchMetadata();
  }, [song.metadataUri, song.mint]);

  if (isLoading) {
    return (
      <GlowCard className="p-3">
        <div className="space-y-3">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-2/5" />
        </div>
      </GlowCard>
    );
  }

  if (error || !metadata) {
    return (
      <GlowCard className="p-4 border-red-600/40">
        <p className="text-sm font-medium">Could not load song</p>
        <p className="text-xs text-muted-foreground mt-1">{song.mint}</p>
      </GlowCard>
    );
  }

  // Optionally normalize ipfs:// to gateway at backend for Next/Image
  const coverSrc = metadata.image;

  return (
    <Link href={`/song/${song.mint}`} className="block focus:outline-none focus:ring-2 focus:ring-neutral-700 rounded-2xl">
      <HoverLift>
        <GlowCard className="overflow-hidden">
          <div className="relative w-full h-40">
            <div className="relative w-full h-40 rounded-t-lg overflow-hidden">
  <Image
    src={metadata.image}
    alt={metadata.name}
    fill
    className="object-cover"
  />
</div>

          </div>

          <div className="p-4">
            <h3 className="font-semibold text-base md:text-lg truncate">{metadata.name}</h3>
            <p className="text-sm text-muted-foreground truncate mt-1">By: {song.artist}</p>
          </div>
        </GlowCard>
      </HoverLift>
    </Link>
  );
}
