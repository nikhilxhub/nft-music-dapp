"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Define the shape of a song's metadata
interface NftMetadata {
  name: string;
  image: string;
  properties: {
    category: string;
    files: { type: string; uri: string }[];
  };
}

// Define the shape of the song data coming from our database
interface Song {
  mint: string;
  artist: string;
  metadataUri: string;
}

export function SongCard({ song }: { song: Song }) {
  const [metadata, setMetadata] = useState<NftMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // useEffect(() => {
  //   async function fetchMetadata() {
  //     if (!song.metadataUri) {
  //       setIsLoading(false);
  //       setError(true);
  //       return;
  //     }
  //     try {
  //       const response = await fetch(song.metadataUri);
  //       if (!response.ok) throw new Error("Failed to fetch metadata");
  //       const data: NftMetadata = await response.json();
  //       setMetadata(data);
  //     } catch (err) {
  //       console.error("Failed to fetch metadata for song:", song.mint, err);
  //       setError(true);
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   }
  //   fetchMetadata();
  // }, [song.metadataUri, song.mint]);

  // In app/MyComponents/SongCard.tsx

useEffect(() => {
    async function fetchMetadata() {
      if (!song.metadataUri) {
        setIsLoading(false);
        setError(true);
        return;
      }
      try {
        // Your backend API URL
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        
        // CONSTRUCT THE PROXY URL
        // We encode the metadataUri to ensure it's a valid URL parameter
        const proxyUrl = `${API_BASE_URL}/metadata?url=${encodeURIComponent(song.metadataUri)}`;

        // FETCH FROM YOUR BACKEND INSTEAD OF PINATA
        const response = await fetch(proxyUrl);

        if (!response.ok) throw new Error("Failed to fetch metadata via proxy");
        
        const data: NftMetadata = await response.json();
        setMetadata(data);
      } catch (err) {
        console.error("Failed to fetch metadata for song:", song.mint, err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    }
    fetchMetadata();
  }, [song.metadataUri, song.mint]);

  // If loading, show a skeleton placeholder
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-[125px] w-full rounded-xl" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-4/5" />
        </CardContent>
        <CardFooter>
          <Skeleton className="h-4 w-2/5" />
        </CardFooter>
      </Card>
    );
  }

  // If there was an error or no metadata, show a fallback
  if (error || !metadata) {
    return (
      <Card className="border-red-500">
        <CardHeader>
          <p>Could not load song</p>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{song.mint}</p>
        </CardContent>
      </Card>
    );
  }

  // Once loaded, display the song card
  return (
    <Link href={`/song/${song.mint}`}>
      <Card className="hover:border-primary transition-colors duration-200">
        <CardHeader className="p-0">
          <img
            src={metadata.image}
            alt={metadata.name}
            className="w-full h-40 object-cover rounded-t-lg"
          />
        </CardHeader>
        <CardContent className="pt-4">
          <h3 className="font-semibold text-lg truncate">{metadata.name}</h3>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground truncate">By: {song.artist}</p>
        </CardFooter>
      </Card>
    </Link>
  );
}