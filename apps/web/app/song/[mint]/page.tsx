"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL, Connection } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { toast } from "sonner";
import idl from "@/../idl.json";
import { createBuySongInstruction } from "@/app/lib/solanaTransaction";
import { blink } from "@/app/utils/blinks";
import { SongCard } from "@/components/song/SongCard";
// import { SongActions } from "@/components/song/SongActions";
import { AudioPlayer } from "@/components/media/AudioPlayer";
import { SongActions } from "@/components/song/SongActions";
import { SongAnalytics } from "@/components/song/SongAnalytics";

const programId = new PublicKey(idl.address);

interface SongDetails {
  mint: string;
  artist: string;
  curator: string;
  metadataUri: string;
  streamLamports: number;
  buyLamports: number;
}

interface NftMetadata {
  name: string;
  image: string;
  properties: {
    files: { type: string; uri: string }[];
  };
}

export default function SongPage() {
  const { mint } = useParams();
  const heliusRpcUrl = "https://devnet.helius-rpc.com/?api-key=fa881eb0-631a-4cc1-a392-7a86e94bf23c";
  const connection = useMemo(() => new Connection(heliusRpcUrl, "confirmed"), [heliusRpcUrl]);
  const { publicKey, sendTransaction } = useWallet();

  const [songDetails, setSongDetails] = useState<SongDetails | null>(null);
  const [metadata, setMetadata] = useState<NftMetadata | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [tempAccess, setTempAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const program = useMemo(() => {
    // @ts-ignore
    return new anchor.Program(idl as anchor.Idl, { connection });
  }, [connection]);
  const [analytics, setAnalytics] = useState<{ totalPurchases: number; totalStreams: number } | null>(null);

  useEffect(() => {
    if (!mint) return;
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/songAnalytics/${mint}`);
        if (res.ok) {
          const data = await res.json();
          setAnalytics({ totalPurchases: data.totalPurchases, totalStreams: data.totalStreams });
        }
      } catch (e) {
        console.error("Failed to fetch analytics", e);
      }
    };
    fetchAnalytics();
  }, [mint]);


  useEffect(() => {
    if (!mint) return;

    const fetchSongData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/song/${mint}`);
        if (!response.ok) throw new Error("Song not found.");
        const data = await response.json();
        setSongDetails(data.song);
        setMetadata(data.metadata);

        if (publicKey) {
          const ownershipResponse = await fetch(
            `${API_BASE_URL}/check-ownership?mint=${mint}&userAddress=${publicKey.toBase58()}`
          );
          const ownershipData = await ownershipResponse.json();
          setHasAccess(ownershipData.hasAccess);
        } else {
          setHasAccess(false);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSongData();
  }, [mint, publicKey, connection]);

  const handleBuySong = async () => {
    if (!publicKey || !songDetails || !program) {
      toast.error("Please connect your wallet and ensure song details are loaded.");
      return;
    }

    setIsProcessing(true);
    try {
      const buyIx = await createBuySongInstruction(
        program,
        songDetails.mint,
        publicKey,
        new PublicKey(songDetails.artist),
        new PublicKey(songDetails.curator)
      );

      const transaction = new Transaction().add(buyIx);
      const {
        context: { slot: minContextSlot },
        value: { blockhash, lastValidBlockHeight },
      } = await connection.getLatestBlockhashAndContext();

      const signature = await sendTransaction(transaction, connection, { minContextSlot });
      await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });

      await fetch(`${API_BASE_URL}/record-purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songMint: songDetails.mint,
          userAddress: publicKey.toBase58(),
          txHash: signature,
          amountLamports: songDetails.buyLamports,
        }),
      });

      toast.success("Purchase successful! You now own this song.");
      setHasAccess(true);
      setTempAccess(false);
    } catch (error: any) {
      console.error("Purchase failed:", error);
      toast.error("Purchase failed", { description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStreamSong = async () => {
    if (!publicKey || !songDetails || !program) {
      toast.error("Please connect your wallet and ensure song details are loaded.");
      return;
    }

    setIsProcessing(true);
    try {
      const [songPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("song"), new PublicKey(songDetails.mint).toBuffer()],
        program.programId
      );

      // @ts-ignore
      const streamIx = await program!.methods!
        .logStream()
        .accounts({
          payer: publicKey,
          song: songPda,
          artist: new PublicKey(songDetails.artist),
          curator: new PublicKey(songDetails.curator),
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const transaction = new Transaction().add(streamIx);

      const {
        context: { slot: minContextSlot },
        value: { blockhash, lastValidBlockHeight },
      } = await connection.getLatestBlockhashAndContext();

      const signature = await sendTransaction(transaction, connection, { minContextSlot });
      await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });

      await fetch(`${API_BASE_URL}/record-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songMint: songDetails.mint,
          txHash: signature,
          payer: publicKey.toBase58(),
          destination: songDetails.artist,
          amountLamports: songDetails.streamLamports,
        }),
      });

      toast.success("Stream unlocked! Enjoy the song.");
      setTempAccess(true);
    } catch (error: any) {
      console.error("Stream payment failed:", error);
      toast.error("Stream payment failed", { description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading)
    return (
      <div className="mx-auto max-w-2xl p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-64 w-full rounded-2xl bg-white/5" />
          <div className="h-8 w-2/3 rounded bg-white/10" />
          <div className="h-6 w-1/3 rounded bg-white/10" />
          <div className="h-28 w-full rounded-xl bg-white/5" />
        </div>
      </div>
    );

  if (error) return <p className="text-center mt-10 text-red-400">Error: {error}</p>;
  if (!songDetails || !metadata) return <p className="text-center mt-10 text-red-400">Song data could not be loaded.</p>;

  const audioFile = metadata.properties.files.find((f) => f.type.startsWith("audio/"));
  const buyPriceSol = songDetails.buyLamports / LAMPORTS_PER_SOL;
  const streamPriceSol = songDetails.streamLamports / LAMPORTS_PER_SOL;

  const canTransact = !!publicKey && !isProcessing;

return (
  <div className="container mx-auto p-4">
    <SongCard image={metadata.image} title={metadata.name} subtitle={`By ${songDetails.artist}`}>
      {(hasAccess || tempAccess) ? (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-emerald-300">
            {hasAccess ? "You own this song" : "Stream unlocked"}
          </h2>
          {audioFile ? (
            <AudioPlayer src={audioFile.uri} autoPlay />
          ) : (
            <p className="text-red-400">Audio file not found in metadata.</p>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <h2 className="text-lg font-medium text-yellow-300">Get access</h2>
          <p className="text-sm text-white/70">Buy permanently or pay per stream to listen.</p>
          <SongActions
            buyLabel={`Buy permanently • ${buyPriceSol} SOL`}
            streamLabel={`Stream once • ${streamPriceSol} SOL`}
            isProcessing={isProcessing}
            canTransact={canTransact}
            onBuy={handleBuySong}
            onStream={handleStreamSong}
            onShare={() => blink(songDetails)}
          />
        </div>
      )}

      {/* Always show analytics */}
      <div className="mt-6">
        <SongAnalytics
          totalPurchases={analytics?.totalPurchases ?? 0}
          totalStreams={analytics?.totalStreams ?? 0}
          loading={!analytics}
        />
      </div>
    </SongCard>
  </div>
);

}
