"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
// import { SiteHeader } from "@/components/SiteHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink } from "lucide-react";
import { NavBar } from "../MyComponents/NavBar";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { blink } from "../utils/blinks";

// --- Data Types ---
// Matches your StreamLog Mongoose schema
interface StreamLog {
  _id: string; // Used for keys
  songMint: string;
  txHash: string;
  amountLamports: number;
  timestamp: string;
}

// Simplified type for Helius getAssetsByOwner response
// Your component EXPECTS this, but your API is NOT sending it.
interface NftAsset {
  id: string; // This is the mint address
  content: {
    metadata: {
      name: string;
      symbol: string;
    };
    links: {
      image: string;
    };
  };
  // This is what your API is *actually* sending
  // This is just for explanation, don't mix types like this.
  // mint: string;
  // artist: string;
  // metadataUri: string;
}

// --- Main Component ---
export default function ProfilePage() {
  const { publicKey, connected } = useWallet();
  const [streamHistory, setStreamHistory] = useState<StreamLog[]>([]);
  const [earnings, setEarnings] = useState<StreamLog[]>([]);

  // Your state is typed as NftAsset[], but your API sends database objects.
  // This is the source of the problem. We'll use `any[]` for now.
  const [myNfts, setMyNfts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch if the wallet is connected
    if (!publicKey) {
      if (connected) setLoading(false); // Wallet connected but key not ready yet
      return;
    }

    const fetchProfileData = async () => {
      setLoading(true);

      const userAddress = publicKey.toBase58();
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

      try {
        // parallel fetching
        const [streamsRes, earningsRes, nftsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/streams?payer=${userAddress}`),
          fetch(`${API_BASE_URL}/streams?destination=${userAddress}`),
          fetch(`${API_BASE_URL}/user-assets?owner=${userAddress}`),
        ]);

        // If any fetch failed, throw error
        if (!streamsRes.ok || !earningsRes.ok || !nftsRes.ok) {
          console.warn("One or more profile fetches failed");
          toast.error("Some profile data failed to load");
          return;
        }

        // Parse all JSON results
        const [streamsData, earningsData, nftsData] = await Promise.all([
          streamsRes.json(),
          earningsRes.json(),
          nftsRes.json(),
        ]);

        console.log("nfts daata:::", nftsData); // <-- CHECK THIS LOG in your browser

        // ✅ 1. Set stream history (as listener)
        setStreamHistory(
          Array.isArray(streamsData)
            ? streamsData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            : []
        );

        // ✅ 2. Set earnings (as artist)
        setEarnings(
          Array.isArray(earningsData)
            ? earningsData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            : []
        );

        // ✅ 3. Set owned NFTs
        setMyNfts(Array.isArray(nftsData) ? nftsData : []);

      } catch (error) {
        console.error("Failed to fetch profile data:", error);
        toast.error("Failed to fetch profile data");
      } finally {
        setLoading(false);
      }
    };


    fetchProfileData();
  }, [publicKey, connected]);

  if (!connected) {
    return (
      <>
        <NavBar />
        <div className="container flex h-[calc(100vh-4rem)] items-center justify-center">
          <p className="text-muted-foreground">Please connect your wallet to view your profile.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <div className="container py-8">


        <h1 className="text-3xl font-bold mb-6">My Profile</h1>
        <Link href="/upload">

          <Button>Upload song</Button>
        </Link>
        <Tabs defaultValue="streams" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="streams">My Streams ({loading ? '...' : streamHistory.length})</TabsTrigger>
            <TabsTrigger value="nfts">My Songs (NFTs) ({loading ? '...' : myNfts.length})</TabsTrigger>
            <TabsTrigger value="earnings">My Earnings ({loading ? '...' : earnings.length})</TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="mt-4">
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <>
              <TabsContent value="streams">
                <Card>
                  <CardHeader>
                    <CardTitle>Stream History</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {streamHistory.length > 0 ? (
                      streamHistory.map((log) => (
                        <div key={log._id} className="flex justify-between items-center p-2 border rounded-md">
                          <div>
                            <p className="font-mono text-sm">Song Mint: {log.songMint.slice(0, 10)}...</p>
                            <p className="text-xs text-muted-foreground">
                              Paid {(log.amountLamports / 1e9).toFixed(6)} SOL on {new Date(log.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                          <a href={`https://solscan.io/tx/${log.txHash}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline">
                            View Tx <ExternalLink className="inline h-3 w-3" />
                          </a>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">You haven't streamed any songs yet.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="nfts">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {myNfts.map((nft) => {
                    // This code is TRYING to read a Helius object
                    const imageUrl = nft.content?.links?.image ?? "/placeholder.png";
                    const name = nft.content?.metadata?.name ?? "Unknown";
                    const symbol = nft.content?.metadata?.symbol ?? "";


                    return (
                      // FIX 1 (BAND-AID): Use `nft.mint` or `nft._id` for the key.
                      // Your DB object has `mint`, not `id`. This fixes the crash.
                      <Card key={nft.id}>
                        <CardHeader>
                          <img
                            src={imageUrl} // Still broken (shows placeholder)
                            alt={name}     // Still broken (shows "Unknown")
                            className="aspect-square w-full rounded-md object-cover"
                          />
                        </CardHeader>
                        <CardContent>
                          <p className="font-semibold">{name}</p>
                          <p className="text-sm text-muted-foreground">{symbol}</p>
                        </CardContent>
                        <CardFooter>
                          <Button onClick={() => blink()}>Share via Blink</Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="earnings">
                <Card>
                  <CardHeader>
                    <CardTitle>Earnings History</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {earnings.length > 0 ? (
                      earnings.map((log) => (
                        <div key={log._id} className="flex justify-between items-center p-2 border rounded-md">
                          <div>
                            <p className="font-mono text-sm">From Song: {log.songMint.slice(0, 10)}...</p>
                            <p className="text-xs text-muted-foreground">
                              Received {(log.amountLamports / 1e9).toFixed(6)} SOL on {new Date(log.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                          <a href={`https://solscan.io/tx/${log.txHash}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline">
                            View Tx <ExternalLink className="inline h-3 w-3" />
                          </a>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">You haven't received any earnings yet.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
        </Tabs>


      </div>
    </>
  );
}