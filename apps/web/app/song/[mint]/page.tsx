"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL, Connection } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { toast } from "sonner";
import idl from "@/../idl.json"; // Make sure your IDL is accessible
import { createBuySongInstruction } from "@/app/lib/solanaTransaction";
import { Button } from "@/components/ui/button";
import { blink } from "@/app/utils/blinks";

// Your Anchor Program ID
const programId = new PublicKey(idl.address);

// --- UPDATED INTERFACES ---
interface SongDetails {
  mint: string;
  artist: string;
  curator: string; // Needed for contract calls
  metadataUri: string;
  streamLamports: number; // This is the pay-per-stream price
  buyLamports: number;    // This is the permanent buy price
}

interface NftMetadata {
  name: string;
  image: string;
  properties: {
    files: { type: string; uri: string }[];
  };
}

const SongPage = () => {
  const { mint } = useParams(); // Get the mint from the URL, e.g., /song/abc...
  // const { connection } = useConnection();
  const heliusRpcUrl = "https://devnet.helius-rpc.com/?api-key=fa881eb0-631a-4cc1-a392-7a86e94bf23c";

  const connection = useMemo(() => new Connection(heliusRpcUrl, "confirmed"), [heliusRpcUrl]);
  const { publicKey, sendTransaction } = useWallet();

  // --- STATE ---
  const [songDetails, setSongDetails] = useState<SongDetails | null>(null);
  const [metadata, setMetadata] = useState<NftMetadata | null>(null);
  const [hasAccess, setHasAccess] = useState(false); // Permanent ownership
  const [tempAccess, setTempAccess] = useState(false); // Pay-per-stream access
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false); // For transactions
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // --- ANCHOR PROGRAM INSTANCE ---
  // We only need this to build instructions, not to send,
  // so a dummy provider with just the connection is fine.
  const program = useMemo(() => {
    // @ts-ignore
    return new anchor.Program(idl as anchor.Idl, { connection });
  }, [connection]);

  // 1. Fetch song details and check for ownership
  useEffect(() => {
    if (!mint) return;

    const fetchSongData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch song data from our backend
        const response = await fetch(`${API_BASE_URL}/song/${mint}`);
        if (!response.ok) throw new Error("Song not found.");
        const data = await response.json();
        setSongDetails(data.song);
        setMetadata(data.metadata);

        // If a user wallet is connected, check if they own this song
        if (publicKey) {
          const ownershipResponse = await fetch(
            `${API_BASE_URL}/check-ownership?mint=${mint}&userAddress=${publicKey.toBase58()}`
          );
          const ownershipData = await ownershipResponse.json();
          setHasAccess(ownershipData.hasAccess);
        } else {
          setHasAccess(false); // Reset access if wallet disconnects
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSongData();
  }, [mint, publicKey, connection]); // Re-run when the mint or connected wallet changes


  // --- 2. The "Buy Permanently" function ---
  const handleBuySong = async () => {
    if (!publicKey || !songDetails || !program) {
      toast.error("Please connect your wallet and ensure song details are loaded.");
      return;
    }

    setIsProcessing(true);
    try {
      // Find the PDAs required by the 'buy_song' instruction
      // const [songPda] = PublicKey.findProgramAddressSync(
      //   [Buffer.from("song"), new PublicKey(songDetails.mint).toBuffer()],
      //   program.programId
      // );

      // const [ownershipPda] = PublicKey.findProgramAddressSync(
      //   [
      //     Buffer.from("ownership"),
      //     songPda.toBuffer(),
      //     publicKey.toBuffer(),
      //   ],
      //   program.programId
      // );

      // // Build the instruction
      // // @ts-ignore
      // const buyIx = await program!.methods!
      //   .buySong()
      //   .accounts({
      //     buyer: publicKey,
      //     song: songPda,
      //     ownership: ownershipPda,
      //     artist: new PublicKey(songDetails.artist),
      //     curator: new PublicKey(songDetails.curator),
      //     systemProgram: SystemProgram.programId,
      //   })
      //   .instruction();

      const buyIx = await createBuySongInstruction(
        program,
        songDetails.mint,
        publicKey, // The buyer is the connected wallet
        new PublicKey(songDetails.artist),
        new PublicKey(songDetails.curator)
      );

      const transaction = new Transaction().add(buyIx);

      const {
        context: { slot: minContextSlot },
        value: { blockhash, lastValidBlockHeight }
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
      setHasAccess(true); // Optimistically grant access
      setTempAccess(false); // Not needed if they own it

    } catch (error: any) {
      console.error("Purchase failed:", error);
      toast.error("Purchase failed", { description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // --- 3. The "Pay-per-stream" function ---
  const handleStreamSong = async () => {
    if (!publicKey || !songDetails || !program) {
      toast.error("Please connect your wallet and ensure song details are loaded.");
      return;
    }

    setIsProcessing(true);
    try {
      // Find the PDA required by the 'log_stream' instruction
      const [songPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("song"), new PublicKey(songDetails.mint).toBuffer()],
        program.programId
      );

      // Build the instruction
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
        value: { blockhash, lastValidBlockHeight }
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
      setTempAccess(true); // Grant temporary access

    } catch (error: any) {
      console.error("Stream payment failed:", error);
      toast.error("Stream payment failed", { description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };


  // 4. Render the UI based on state
  if (isLoading) return <p className="text-center mt-10">Loading song...</p>;
  if (error) return <p className="text-center mt-10 text-red-500">Error: {error}</p>;
  if (!songDetails || !metadata) return <p>Song data could not be loaded.</p>;

  // Find the audio file from the metadata
  const audioFile = metadata.properties.files.find(f => f.type.startsWith("audio/"));
  const buyPriceSol = songDetails.buyLamports / LAMPORTS_PER_SOL;
  const streamPriceSol = songDetails.streamLamports / LAMPORTS_PER_SOL;

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="bg-gray-800 rounded-lg shadow-lg p-6">
        <img src={metadata.image} alt={metadata.name} className="w-full h-64 object-cover rounded-md mb-4" />
        <h1 className="text-4xl font-bold mb-2">{metadata.name}</h1>
        <p className="text-lg text-gray-400 mb-6">By: {songDetails.artist}</p>

        {/* --- UPDATED ACCESS LOGIC --- */}
        {(hasAccess || tempAccess) ? (
          <div>
            <h2 className="text-2xl text-green-400 mb-4">
              {hasAccess ? "You own this song! 🎵" : "Stream Unlocked 🎧"}
            </h2>
            {audioFile ? (
              <audio controls autoPlay src={audioFile.uri} className="w-full">
                Your browser does not support the audio element.
              </audio>
            ) : (
              <p className="text-red-500">Audio file not found in metadata.</p>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-2xl text-yellow-400 mb-4">Get Access</h2>
            <p className="mb-4">Buy permanently or pay per stream to listen.</p>

            <div className="flex flex-col space-y-4">
              {/* --- PERMANENT BUY BUTTON --- */}
              <button
                onClick={handleBuySong}
                disabled={!publicKey || isProcessing}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed"
              >
                {isProcessing ? "Processing..." : (publicKey ? `Buy Permanently for ${buyPriceSol} SOL` : "Connect Wallet to Buy")}
              </button>

              {/* --- PAY-PER-STREAM BUTTON --- */}
              <button
                onClick={handleStreamSong}
                disabled={!publicKey || isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed"
              >
                {isProcessing ? "Processing..." : (publicKey ? `Stream Once for ${streamPriceSol} SOL` : "Connect Wallet to Stream")}
              </button>

              <Button onClick={() => blink(songDetails)}>Share via Blink</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SongPage;