"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  ListMusic,
  Music,
  DollarSign,
  Play,
  Upload,
  LucideIcon,
} from "lucide-react";
import { NavBar } from "../MyComponents/NavBar";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
// import { blink } from "../utils/blinks"; // Your blink utility

// --- Data Types ---

// 1. Matches your StreamLog Mongoose schema
interface StreamLog {
  _id: string;
  songMint: string;
  txHash: string;
  amountLamports: number;
  timestamp: string;
}

// 2. *** FIX ***
// This is the Helius `NftAsset` type that your /user-assets
// endpoint is confirmed to be sending.
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
}

// --- Main Component ---
export default function ProfilePage() {
  const { publicKey, connected } = useWallet();
  const [streamHistory, setStreamHistory] = useState<StreamLog[]>([]);
  const [earnings, setEarnings] = useState<StreamLog[]>([]);

  // *** FIX ***
  // Correctly typed state to match the API response
  const [myNfts, setMyNfts] = useState<NftAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!publicKey) {
      if (connected) setLoading(false);
      return;
    }

    const fetchProfileData = async () => {
      setLoading(true);
      const userAddress = publicKey.toBase58();
      const API_BASE_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

      try {
        const [streamsRes, earningsRes, nftsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/streams?payer=${userAddress}`),
          fetch(`${API_BASE_URL}/streams?destination=${userAddress}`),
          fetch(`${API_BASE_URL}/user-assets?owner=${userAddress}`),
        ]);

        // Handle responses individually to allow partial data
        const streamsData = streamsRes.ok
          ? await streamsRes.json()
          : (console.warn("Stream history fetch failed"), []);
        const earningsData = earningsRes.ok
          ? await earningsRes.json()
          : (console.warn("Earnings fetch failed"), []);
        const nftsData = nftsRes.ok
          ? await nftsRes.json()
          : (console.warn("NFTs fetch failed"), []);

        if (!streamsRes.ok || !earningsRes.ok || !nftsRes.ok) {
          toast.error("Some profile data failed to load");
        }

        console.log("nfts data from API:::", nftsData); // <-- CHECK THIS LOG

        setStreamHistory(
          Array.isArray(streamsData)
            ? streamsData.sort(
                (a, b) =>
                  new Date(b.timestamp).getTime() -
                  new Date(a.timestamp).getTime()
              )
            : []
        );

        setEarnings(
          Array.isArray(earningsData)
            ? earningsData.sort(
                (a, b) =>
                  new Date(b.timestamp).getTime() -
                  new Date(a.timestamp).getTime()
              )
            : []
        );

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
        <div className="container flex h-[calc(100vh-4rem)] max-w-lg items-center justify-center">
          <Card className="w-full text-center">
            <CardHeader>
              <CardTitle>Connect Your Wallet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Please connect your wallet to view your profile and song
                library.
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <div className="container mx-auto max-w-6xl py-10 px-4">
        {/* === Page Header === */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          </div>
          <Button asChild>
            <Link href="/upload">
              <Upload className="mr-2 h-4 w-4" />
              Upload a New Song
            </Link>
          </Button>
        </div>

        {/* === Tabs === */}
        <Tabs defaultValue="nfts" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="nfts">
              <Music className="mr-2 h-4 w-4" />
              My Songs ({loading ? "..." : myNfts.length})
            </TabsTrigger>
            <TabsTrigger value="streams">
              <ListMusic className="mr-2 h-4 w-4" />
              My Streams ({loading ? "..." : streamHistory.length})
            </TabsTrigger>
            <TabsTrigger value="earnings">
              <DollarSign className="mr-2 h-4 w-4" />
              My Earnings ({loading ? "..." : earnings.length})
            </TabsTrigger>
          </TabsList>

          {/* === 1. My Songs (NFTs) Tab === */}
          <TabsContent value="nfts" className="mt-6">
            {loading ? (
              <NftGridSkeleton />
            ) : myNfts.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {myNfts.map((nft) => {
                  // *** FIX ***
                  // Read data from the Helius object structure
                  const imageUrl =
                    nft.content?.links?.image ?? "/placeholder.png";
                  const name = nft.content?.metadata?.name ?? "Unknown Song";
                  const symbol = nft.content?.metadata?.symbol ?? "???";
                  const mint = nft.id; // Use the Helius ID (which is the mint) for the key

                  return (
                    <Link
                      href={`/song/${mint}`} // Link to the song page
                      key={mint}
                      className="group"
                    >
                      <Card className="overflow-hidden transition-shadow duration-200 hover:shadow-md">
                        <div className="relative aspect-square w-full">
                          <Image
                            src={imageUrl}
                            alt={name}
                            className="h-full w-full object-cover"
                          />
                          {/* Stylish Hover Effect (Aceternity-inspired) */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                            <Play className="h-10 w-10 fill-white text-white" />
                          </div>
                        </div>
                        <CardContent className="p-3">
                          <p className="truncate font-semibold">{name}</p>
                          <p className="truncate text-sm text-muted-foreground">
                            {symbol}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <EmptyState
                    icon={Music}
                    title="No Songs Found"
                    description="You haven't uploaded or collected any songs yet."
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* === 2. My Streams Tab === */}
          <TabsContent value="streams" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Stream History</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <TableSkeleton />
                ) : streamHistory.length > 0 ? (
                  <HistoryTable logs={streamHistory} type="paid" />
                ) : (
                  <EmptyState
                    icon={ListMusic}
                    title="No Stream History"
                    description="You haven't streamed any songs yet."
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* === 3. My Earnings Tab === */}
          <TabsContent value="earnings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Earnings History</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <TableSkeleton />
                ) : earnings.length > 0 ? (
                  <HistoryTable logs={earnings} type="received" />
                ) : (
                  <EmptyState
                    icon={DollarSign}
                    title="No Earnings"
                    description="You haven't received any earnings yet."
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

// --- Reusable Helper Components ---

/**
 * Reusable Table for Stream and Earnings History
 */
const HistoryTable = ({
  logs,
  type,
}: {
  logs: StreamLog[];
  type: "paid" | "received";
}) => {
  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Song Mint</TableHead>
            <TableHead>Amount (SOL)</TableHead>
            <TableHead className="hidden sm:table-cell">Date</TableHead>
            <TableHead className="text-right">Transaction</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log._id}>
              <TableCell>
                <span className="font-mono text-sm">
                  {log.songMint.slice(0, 10)}...
                </span>
              </TableCell>
              <TableCell
                className={`font-medium ${
                  type === "paid" ? "text-red-600" : "text-green-600"
                }`}
              >
                {type === "paid" ? "-" : "+"}
                {(log.amountLamports / 1e9).toFixed(6)}
              </TableCell>
              <TableCell className="hidden text-muted-foreground sm:table-cell">
                {new Date(log.timestamp).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`https://solscan.io/tx/${log.txHash}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View <ExternalLink className="ml-1.5 h-3 w-3" />
                  </a>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

/**
 * Loading Skeleton for NFT Grid
 */
const NftGridSkeleton = () => (
  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex flex-col space-y-3">
        <Skeleton className="aspect-square w-full rounded-lg" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    ))}
  </div>
);

/**
 * Loading Skeleton for Table Rows
 */
const TableSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="flex items-center justify-between space-x-4 p-2">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/4" />
        </div>
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    ))}
  </div>
);

/**
 * Reusable Empty State Component
 */
const EmptyState = ({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) => (
  <div className="flex flex-col items-center justify-center space-y-3 py-10 text-center">
    <div className="rounded-full bg-muted p-3">
      <Icon className="h-6 w-6 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-semibold">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);