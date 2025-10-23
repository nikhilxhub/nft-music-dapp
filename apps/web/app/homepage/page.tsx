'use client';

import {  GrainBackground, GlowCard, BadgePill, Button, MotionFadeIn} from '@/components/ui/adapters';
import { NavBar } from 'app/MyComponents/NavBar';
import { SongList } from 'app/MyComponents/SongList';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[color:var(--bg)] text-[color:var(--fg)]">
      <GrainBackground />
      <NavBar />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <section className="max-w-6xl mx-auto">
          <MotionFadeIn>
            <BadgePill className="mb-3">NFT music • Stream • Own</BadgePill>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2">
              Discover music
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mb-8">
              Explore and stream music NFTs from independent artists.
            </p>
          </MotionFadeIn>

          <GlowCard className="p-4 sm:p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <p className="text-neutral-400">
                Upload a track, mint on-chain, share on X with a blink.
              </p>
              <div className="flex gap-3">
                <Button variant="primary" size="lg" onClick={() => router.push('/upload')}>
                  Upload song
                </Button>
                <Button variant="ghost" size="lg" onClick={() => router.push('/explore')}>
                  Explore more
                </Button>
              </div>
            </div>
          </GlowCard>

          <SongList />
        </section>
      </main>
    </div>
  );
}
