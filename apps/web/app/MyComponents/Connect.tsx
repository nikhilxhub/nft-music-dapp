"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Upload, User, User2 } from "lucide-react";


// Helper function to truncate wallet address
const truncateWalletAddress = (address: string) => {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};


function useHasMounted() {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);
  return hasMounted;
}

const Connect = () => {
  
        const { connected, publicKey, disconnect } = useWallet();
      
        const hasMounted = useHasMounted();
        if (!hasMounted) return null;
  
    return (
      <div>
          {connected && publicKey ? (
              // --- CONNECTED STATE ---
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary">
            
                    <User2 />
  
  
                    {truncateWalletAddress(publicKey.toBase58())}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link href="/profile">
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/upload">
                    <DropdownMenuItem>
                      <Upload className="mr-2 h-4 w-4" />
                      <span>Upload Song</span>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={disconnect}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Disconnect</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // --- UNCONNECTED STATE ---
              <WalletMultiButton style={{}} />
            )}
  
  
      </div>

        )
}

export default Connect