"use client";

import { NavBar } from 'app/MyComponents/NavBar';
import { SongList } from 'app/MyComponents/SongList';

export default function HomePage() {
  return (
    <div>
      <NavBar />
      <main className="container py-8">
        <h1 className="text-4xl font-bold mb-2">Discover Music</h1>
        <p className="text-muted-foreground mb-8">
          Explore and stream music NFTs from independent artists.
        </p>
        <SongList />
      </main>
    </div>
  );
}