"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
// import { SiteHeader } from "@/components/SiteHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
// import { useToast } from "@/components/ui/use-toast";
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { createNft, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { publicKey as umiPublicKey, generateSigner, percentAmount } from '@metaplex-foundation/umi';
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import idl from "@/../idl.json"; // Make sure your IDL is accessible
import { NavBar } from "../MyComponents/NavBar";
import { toast } from "sonner";

// Your Anchor Program ID
const programId = new PublicKey(idl.address);

export default function UploadPage() {

  const wallet = useWallet();
  const { connection } = useConnection();

  // Form State
  const [title, setTitle] = useState('');
  const [curator, setCurator] = useState('');
  const [curatorShare, setCuratorShare] = useState(20); // Default 20%
  const [file, setFile] = useState<File | null>(null);

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const provider = new anchor.AnchorProvider(connection, wallet as any, { commitment: "confirmed" });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]!);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !wallet.publicKey || !wallet.signTransaction) {
      toast.error("Please connect your wallet and select a file.");
      return;
    }

    setIsLoading(true);

    try {
      // --- STEP 1: Upload Audio to Backend ---
      setProgress(10);
      setProgressText("Uploading audio file to IPFS via backend...");
      const formData = new FormData();
      formData.append('file', file);

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const uploadRes = await fetch(`${API_BASE_URL}/upload`, { method: 'POST', body: formData });
      if (!uploadRes.ok) throw new Error("Audio upload failed");
      const { cid: audioCid, url: audioUrl } = await uploadRes.json();
      console.log("Audio uploaded:", audioUrl);
      
      // --- STEP 2: Construct and Upload Metadata ---
      setProgress(25);
      setProgressText("Uploading metadata to IPFS...");
      const metadata = {
        name: title,
        symbol: "MUSIC", // You can use a consistent symbol for all your songs
        description: `A song by ${wallet.publicKey.toBase58()}`,
        image: "https://arweave.net/3J1m_j6hJ_g-x2s_y2s_j3g-h_j4k-l_m5n_o6p_q7r/your_default_cover.png", // Replace with a default image or an upload field
        animation_url: audioUrl, // Link to the audio file
        properties: {
          files: [{ uri: audioUrl, type: file.type }],
          category: "audio",
        },
      };

      // In production, you'd upload this JSON to IPFS/Arweave as well.
      // For this example, we'll create a temporary URI. A backend endpoint is best for this.
      const metadataUri = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`;
      console.log("Metadata created.");

      // --- STEP 3: Mint the NFT using Metaplex UMI ---
      setProgress(50);
      setProgressText("Waiting for you to approve the mint transaction...");
      const umi = createUmi(connection.rpcEndpoint).use(walletAdapterIdentity(wallet)).use(mplTokenMetadata());
      const mint = generateSigner(umi);

      const createNftTx = await createNft(umi, {
        mint,
        name: metadata.name,
        uri: metadataUri,
        sellerFeeBasisPoints: percentAmount(5.5), // Example royalty
        isCollection: false,
      }).sendAndConfirm(umi);

      const mintAddress = mint.publicKey;
      console.log("NFT Minted:", mintAddress);
      
      toast("NFT Minted!", {
          description: `Mint address: ${mintAddress}`,
          
      });

      // --- STEP 4: Register the Song with your Anchor Program ---
      setProgress(75);
      setProgressText("Waiting for you to approve the song registration...");
      const provider = new anchor.AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
      const program = new anchor.Program(idl as anchor.Idl, programId, provider);

      const [songPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("song"), new PublicKey(mintAddress).toBuffer()],
          program.programId
      );

      await program.methods
        .initializeSong(curatorShare * 100) // Convert % to basis points
        .accounts({
          payer: wallet.publicKey,
          song: songPda,
          mint: new PublicKey(mintAddress),
          artist: wallet.publicKey,
          curator: new PublicKey(curator),
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Song registered on-chain.");
      // toast({ title: "Song Registered!", description: "Song Registered!"});
      toast("Song Registered!", {
          description: "Song Registered!",
          // action: {
          //   label: "Undo",
          //   onClick: () => console.log("Undo"),
          // },
        });

      // --- STEP 5: Save the final data to your backend database ---
      setProgress(90);
      setProgressText("Finalizing and saving to database...");
      const finalizationRes = await fetch(`${API_BASE_URL}/init-song`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mint: mintAddress,
          artist: wallet.publicKey.toBase58(),
          curator: curator,
          curatorShareBps: curatorShare * 100,
          ipfsAudioCid: audioCid,
          metadataUri: metadataUri,
        }),
      });
      if (!finalizationRes.ok) throw new Error("Failed to save song to database");

      setProgress(100);
      setProgressText("Upload complete!");

    } catch (error: any) {
      console.error("Upload process failed:", error);

      toast.error("Upload Failed")
      setProgress(0); // Reset progress on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <NavBar />
      <div className="container flex items-center justify-center py-12">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Upload a New Song</CardTitle>
            <CardDescription>
              Fill in the details, mint the song as an NFT, and register it on-chain.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center space-y-4">
                <p className="text-sm font-medium">{progressText}</p>
                <Progress value={progress} className="w-full" />
                <p className="text-xs text-muted-foreground">Please approve the transactions in your wallet.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="title">Song Title</Label>
                  <Input id="title" type="text" placeholder="My new hit song" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="curator">Curator Wallet Address</Label>
                  <Input id="curator" type="text" placeholder="Wallet address of the person who will help promote" value={curator} onChange={(e) => setCurator(e.target.value)} required />
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="curatorShare">Curator Share (%)</Label>
                  <Input id="curatorShare" type="number" min="0" max="100" value={curatorShare} onChange={(e) => setCuratorShare(Number(e.target.value))} required />
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="audio">Audio File (MP3, WAV)</Label>
                  <Input id="audio" type="file" accept="audio/*" onChange={handleFileChange} required />
                </div>
                <Button type="submit" className="w-full" disabled={!wallet.connected}>
                  {wallet.connected ? 'Start Upload Process' : 'Connect Wallet to Upload'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}