"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ModeToggle } from "@/components/ui/ModeToggle";
import Connect from "./Connect";
import { Music, Menu, X, AudioWaveformIcon, Disc3,  PlayCircle, Headphones } from "lucide-react";

/**
 * Custom hook to check if the component has mounted.
 * This is useful to prevent hydration mismatches, especially when
 * components like ModeToggle might rely on localStorage.
 */
function useHasMounted() {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);
  return hasMounted;
}

export function NavBar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const hasMounted = useHasMounted();

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // Prevent hydration mismatch
  if (!hasMounted) return null;

  return (
    
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Left Side: Logo and Desktop Navigation */}
        <div className="flex items-center gap-6">
          {/* App Logo/Name */}
          <Link href="/" className="flex items-center space-x-2 group" onClick={closeMobileMenu}>
            {/* <Music className="h-6 w-6 text-primary transition-transform group-hover:scale-110" /> */}
            <AudioWaveformIcon />

            <span className="font-semibold text-lg text-primary group-hover:text-primary/90 transition-colors">
              BlinkTune
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex gap-4">
            <Link
              href="/discover"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Discover
            </Link>
            <Link
              href="/profile"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              profile
            </Link>
          </nav>
        </div>

        {/* Right Side: Actions and Mobile Menu Button */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <Connect />
            <ModeToggle />
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-md hover:bg-muted transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-background border-b border-border/40 shadow-lg z-40">
          <nav className="flex flex-col space-y-1 p-4">
            {/* Mobile Nav Links */}
            <Link
              href="/discover"
              className="block px-3 py-2 rounded-md text-base font-medium text-muted-foreground hover:bg-muted hover:text-primary"
              onClick={closeMobileMenu}
            >
              Discover
            </Link>
            <Link
              href="/my-music"
              className="block px-3 py-2 rounded-md text-base font-medium text-muted-foreground hover:bg-muted hover:text-primary"
              onClick={closeMobileMenu}
            >
              My Music
            </Link>
            
            {/* Separator */}
            <div className="pt-4 pb-2">
              <div className="border-t border-border/40" />
            </div>

            {/* Mobile Actions */}
            <div className="flex flex-col gap-4 px-3 pt-2 pb-3">
              <Connect />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Switch Theme
                </span>
                <ModeToggle />
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
