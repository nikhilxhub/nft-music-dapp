'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import CircularText from '@/components/react-bits/CircularText';
import SpotlightCard from '@/components/react-bits/SpotlightCard';
import Aurora from '@/components/react-bits/Aurora';
import Beams from '@/components/react-bits/Beams';

import Connect from './Connect';

// If using reactbits: import components directly after installation
// import { CircularText } from 'react-bits/text-animations';
// import { SpotlightCard } from 'react-bits/components';
// import { Aurora, Beams } from 'react-bits/backgrounds';

const features = [
  { title: 'Upload', desc: 'Artist uploads song. We normalize metadata.' },
  { title: 'Mint NFT', desc: 'Auto-mint with royalty splits + on-chain metadata.' },
  { title: 'Stream or Buy', desc: '30s preview free. Pay-per-stream or purchase.' },
  { title: 'Share Blink', desc: 'One-tap X share: stream + buy from the post.' },
];

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Background layers: beams + aurora (replace with reactbits components if installed) */}
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <Beams />
        {/* <Aurora /> */}
        {/* <div className="bg-gradient-to-b from-[#0f0f1a] via-black to-black w-full h-full" /> */}
      </div>

      {/* Top nav */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Image src="/logo.svg" alt="SkyTunes" width={28} height={28} />
          <span className="text-sm tracking-widest uppercase text-neutral-300">SkyTunes</span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            className="hover:bg-white/10 transition-colors"
            onClick={() => router.push('/homepage')}
          >
            Get Started
          </Button>
          {/* <Button className="bg-white text-black hover:bg-neutral-200 transition-colors"> */}
            <Connect />
          {/* </Button> */}
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-6 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-6xl font-semibold leading-tight">
              Ownable music.
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-300">
                Stream & collect.
              </span>
            </h1>
            <p className="mt-5 text-neutral-300 max-w-xl">
              Artists mint songs as NFTs. Fans stream previews, pay-per-stream, or buy once
              and listen forever. Share as Blinks on X with one-tap actions.
            </p>
            <div className="mt-8 flex gap-4">
              <Button
                className=" hover:bg-purple-400 transition-colors"
                onClick={() => router.push('/upload')}
              >
                Upload a song
              </Button>
              <Button
                variant="ghost"
                className="hover:bg-white/10 transition-colors"
                onClick={() => router.push('/explore')}
              >
                Explore tracks
              </Button>
            </div>

            {/* Circular text accent (swap to React Bits CircularText when installed) */}
            <div className="mt-10 inline-flex items-center justify-center relative">
              <CircularText text=" Nikhilx • COLOSSEUM • MUSIC • BLINKS •" spinDuration={20} onHover="speedUp" />
              {/* <div className="w-36 h-36 rounded-full border border-white/20 grid place-items-center">
                <span className="text-xs text-neutral-400 tracking-widest">
                  WEB3 • COLOSSEUM • NFT • MUSIC • BLINKS
                </span>
              </div> */}
            </div>
          </div>

          {/* Spotlight card preview (replace with React Bits SpotlightCard) */}
          <div className="relative">
            <SpotlightCard className="rounded-xl overflow-hidden">
            <div className="rounded-xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm">
              <div className="aspect-video bg-black/50 relative">
                <Image
                  src="/covers/sample-track.jpg"
                  alt="Featured Track"
                  fill
                  className="object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-xl font-medium">Neon Skyline — @artist</h3>
                  <p className="text-sm text-neutral-300">Minted NFT • 30s preview</p>
                  <div className="mt-3 flex gap-3">
                    <Button className="bg-cyan-400 text-black hover:bg-cyan-300">Play preview</Button>
                    <Button variant="ghost" className="hover:bg-white/10">Buy NFT</Button>
                    <Button variant="ghost" className="hover:bg-white/10">Share Blink</Button>
                  </div>
                </div>
              </div>
            </div>
            </SpotlightCard>
          </div>
        </div>
      </section>

      {/* Bento features */}
      <section className="relative z-10 px-6 pb-16 md:pb-24">
        <div className="grid md:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 hover:border-white/20 hover:bg-white/10 transition-all"
            >
              <h4 className="text-lg font-semibold">{f.title}</h4>
              <p className="mt-2 text-sm text-neutral-300">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trending songs grid */}
      <section className="relative z-10 px-6 pb-24">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl md:text-3xl font-semibold">Trending</h2>
          <Button variant="ghost" className="hover:bg-white/10" onClick={() => router.push('/explore')}>
            View all
          </Button>
        </div>
        <div className="mt-6 grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div
              key={n}
              className="group rounded-xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm"
            >
              <div className="aspect-square relative">
                <Image
                  src={`/covers/sample-${(n % 4) + 1}.jpg`}
                  alt={`Track ${n}`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-2">
                    <Button className="bg-white text-black hover:bg-neutral-200 h-8 px-3">Preview</Button>
                    <Button variant="ghost" className="hover:bg-white/10 h-8 px-3">Buy</Button>
                    <Button variant="ghost" className="hover:bg-white/10 h-8 px-3">Blink</Button>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm text-neutral-300">Artist • Track name</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer marquee */}
      <footer className="relative z-10 px-6 pb-16">
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
          <p className="text-center text-neutral-300">
            “Pay artists fairly. Let fans truly own music.” • Share blinks. Make noise.
          </p>
        </div>
      </footer>
    </div>
  );
}
