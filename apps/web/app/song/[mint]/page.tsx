"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { SystemProgram, Transaction, PublicKey, TransactionInstruction } from "@solana/web3.js";

// Define the shapes of our data
interface SongDetails {
  mint: string;
  artist: string;
  metadataUri: string;
  streamLamports: number; // This is the purchase price
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
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  // State
  const [songDetails, setSongDetails] = useState<SongDetails | null>(null);
  const [metadata, setMetadata] = useState<NftMetadata | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // 1. Fetch song details and check for ownership
  useEffect(() => {
    if (!mint) return;

    const fetchSongData = async () => {
      setIsLoading(true);
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
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSongData();
  }, [mint, publicKey]); // Re-run when the mint or connected wallet changes

  // 2. The "Buy" function
  const handleBuySong = async () => {
    if (!publicKey || !songDetails) {
        alert("Please connect your wallet and ensure song details are loaded.");
        return;
    }

    try {
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: new PublicKey(songDetails.artist), // Pay the artist
                lamports: songDetails.streamLamports, // The purchase price
            })
        );

        const {
            context: { slot: minContextSlot },
            value: { blockhash, lastValidBlockHeight }
        } = await connection.getLatestBlockhashAndContext();

        const signature = await sendTransaction(transaction, connection, { minContextSlot });

        await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });
        
        alert("Purchase successful! You can now stream the song. Refreshing...");
        // A simple way to re-check ownership is to reload the page
        window.location.reload();

    } catch (error) {
        console.error("Purchase failed:", error);
        alert("Purchase failed. Please check the console for details.");
    }
  };


  // 3. Render the UI based on state
  if (isLoading) return <p className="text-center mt-10">Loading song...</p>;
  if (error) return <p className="text-center mt-10 text-red-500">Error: {error}</p>;
  if (!songDetails || !metadata) return <p>Song data could not be loaded.</p>;

  // Find the audio file from the metadata
  const audioFile = metadata.properties.files.find(f => f.type.startsWith("audio/"));

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="bg-gray-800 rounded-lg shadow-lg p-6">
        <img src={metadata.image} alt={metadata.name} className="w-full h-64 object-cover rounded-md mb-4" />
        <h1 className="text-4xl font-bold mb-2">{metadata.name}</h1>
        <p className="text-lg text-gray-400 mb-6">By: {songDetails.artist}</p>

        {hasAccess ? (
          <div>
            <h2 className="text-2xl text-green-400 mb-4">You own this song! 🎵</h2>
            {audioFile ? (
              <audio controls src={audioFile.uri} className="w-full">
                Your browser does not support the audio element.
              </audio>
            ) : (
              <p className="text-red-500">Audio file not found in metadata.</p>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-2xl text-yellow-400 mb-4">Buy to Stream</h2>
            <p className="mb-4">Purchase this song for {songDetails.streamLamports / 1e9} SOL to unlock permanent streaming access.</p>
            <button
              onClick={handleBuySong}
              disabled={!publicKey}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              {publicKey ? `Buy Now for ${songDetails.streamLamports / 1e9} SOL` : "Connect Wallet to Buy"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SongPage;