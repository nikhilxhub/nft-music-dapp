"use client";


import Link from "next/link";


;
import { useEffect, useState } from "react";
import { ModeToggle } from "@/components/ui/ModeToggle";
import Connect from "./Connect";




function useHasMounted() {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);
  return hasMounted;
}


export function NavBar() {
  
  const hasMounted = useHasMounted();
  if (!hasMounted) return null;


  return (
    <header className="sticky top-0 z-50 w-full border-b ">
      <div className="container flex h-16 items-center">
        {/* App Logo/Name */}
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">Music dApp</span>
          </Link>
        </div>

        {/* Right side of Navbar */}
        <div className="flex flex-1 items-center justify-end space-x-4">

          <Connect />

            <ModeToggle />
        </div>
      </div>
    </header>
  );
}