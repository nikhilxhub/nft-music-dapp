"use client";

import { useEffect, useState } from "react";
import { SongCard } from "./SongCard";

// Define the shape of the song data coming from our database
interface Song {
  _id: string; // MongoDB adds this
  mint: string;
  artist: string;
  metadataUri: string;
}

export function SongList() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSongs() {
      // Your backend URL
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      try {
        const response = await fetch(`${API_BASE_URL}/songs`);
        const data: Song[] = await response.json();
        setSongs(data);
      } catch (error) {
        console.error("Failed to fetch songs:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSongs();
  }, []);

  if (isLoading) {
    return <p className="text-center">Loading music...</p>;
  }

  if (songs.length === 0) {
    return <p className="text-center">No songs have been uploaded yet.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {songs.map((song) => (
        <SongCard key={song._id} song={song} />
      ))}
    </div>
  );
}