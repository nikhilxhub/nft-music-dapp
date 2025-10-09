"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
// import { SiteHeader } from "@/components/SiteHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink } from "lucide-react";
import { NavBar } from "../MyComponents/NavBar";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// --- Data Types ---
// Matches your StreamLog Mongoose schema
interface StreamLog {
  _id: string;
  songMint: string;
  txHash: string;
  amountLamports: number;
  timestamp: string;
}

// Simplified type for Helius getAssetsByOwner response
interface NftAsset {
  id: string;
  content: {
    metadata: {
      name: string;
      symbol: string;
    };
    links: {
      image: string;
    };
  };
}

// --- Main Component ---
export default function ProfilePage() {
  const { publicKey, connected } = useWallet();
  const [streamHistory, setStreamHistory] = useState<StreamLog[]>([]);
  const [earnings, setEarnings] = useState<StreamLog[]>([]);
  const [myNfts, setMyNfts] = useState<NftAsset[]>([]);
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
      // Replace with your actual backend URL
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

      try {
        const [streamsRes, earningsRes, nftsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/streams?payer=${userAddress}`),
          fetch(`${API_BASE_URL}/streams?destination=${userAddress}`),
          fetch(`${API_BASE_URL}/user-assets?owner=${userAddress}`),
        ]);

        if (!streamsRes.ok || !earningsRes.ok || !nftsRes.ok) {
          console.warn("One or more profile fetches failed");

          return;
        }

        setStreamHistory(await streamsRes.json());
        setEarnings(await earningsRes.json());
        const nftsData = await nftsRes.json();
        setMyNfts(nftsData.items || []);
      } catch (error) {
        console.error("Failed to fetch profile data:", error);
        // You can add a toast notification here for the user

        toast.error("Failed Fetching Data")
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
        <Link href= "/upload">
        
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
                  {myNfts.length > 0 ? (
                    myNfts.map((nft) => (
                      <Card key={nft.id}>
                        <CardHeader>
                          <img src={nft.content.links.image} alt={nft.content.metadata.name} className="aspect-square w-full rounded-md object-cover" />
                        </CardHeader>
                        <CardContent>
                          <p className="font-semibold">{nft.content.metadata.name}</p>
                          <p className="text-sm text-muted-foreground">{nft.content.metadata.symbol}</p>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <p className="text-muted-foreground col-span-full">You don't own any song NFTs from this platform.</p>
                  )}
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