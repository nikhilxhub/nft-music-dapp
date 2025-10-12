"use client";

import { useMemo, useState } from "react";
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
import { setComputeUnitLimit, setComputeUnitPrice } from "@metaplex-foundation/mpl-toolbox";

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

  const [imageUrl, setImageUrl] = useState('');


  // const provider = new anchor.AnchorProvider(connection, wallet as any, { commitment: "confirmed" });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]!);
    }
  };




  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!file || !wallet.publicKey || !wallet.signTransaction) {
  //     toast.error("Please connect your wallet and select a file.");
  //     return;
  //   }
  //   if (!curator) {
  //     toast.error("Please enter a curator wallet address.");
  //     return;
  //   }

  //   setIsLoading(true);

  //   try {
  //     // --- STEPS 1 & 2: File and Metadata Upload (No changes here) ---
  //     setProgress(10);
  //     setProgressText("Uploading audio file...");
  //     const formData = new FormData();
  //     formData.append('file', file);

  //     const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  //     const uploadRes = await fetch(`${API_BASE_URL}/upload`, { method: 'POST', body: formData });
  //     if (!uploadRes.ok) throw new Error("Audio upload failed");

  //     const { url: audioUrl, cid: audioCid } = await uploadRes.json();
  //     console.log("Audio uploaded:", audioUrl);

  //     setProgress(25);
  //     setProgressText("Uploading metadata...");

  //     // should add image url here


  //     const metadata = {
  //       name: title,
  //       symbol: "MUSIC",
  //       description: `A song by ${wallet.publicKey.toBase58()}`,
  //       image: imageUrl,
  //       animation_url: audioUrl,
  //       properties: {
  //         files: [{ uri: audioUrl, type: file.type }],
  //         category: "audio",
  //       },
  //     };

  //     const metadataRes = await fetch(`${API_BASE_URL}/upload-metadata`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify(metadata),
  //     });
  //     if (!metadataRes.ok) throw new Error("Metadata upload failed");

  //     const { metadataUrl } = await metadataRes.json();
  //     console.log("Metadata uploaded:", metadataUrl);

  //     // --- STEP 3: Mint the NFT (‼️ CRITICAL CHANGES HERE ‼️) ---
  //     setProgress(50);
  //     setProgressText("Preparing mint transaction...");

  //     // ‼️ CHANGE 1: Define your new, reliable RPC endpoint.
  //     // Replace this with the URL you got from Helius, QuickNode, etc.

  //   // const reliableRpcEndpoint = `https://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;

  //     const reliableRpcEndpoint = "https://devnet.helius-rpc.com/?api-key=fa881eb0-631a-4cc1-a392-7a86e94bf23c";

  //     // ‼️ CHANGE 2: Initialize UMI with YOUR reliable endpoint, NOT the wallet's default.
  //     const umi = createUmi(reliableRpcEndpoint)
  //       .use(walletAdapterIdentity(wallet))
  //       .use(mplTokenMetadata());

  //     const mint = generateSigner(umi);

  //     let createNftTx = createNft(umi, {
  //       mint,
  //       name: metadata.name,
  //       uri: metadataUrl,
  //       sellerFeeBasisPoints: percentAmount(5.5),
  //       isCollection: false,
  //     });

  //     // ‼️ CHANGE 3: Increase the priority fee to be aggressive.
  //     createNftTx = createNftTx
  //       .add(setComputeUnitLimit(umi, { units: 400_000 }))
  //       .add(setComputeUnitPrice(umi, { microLamports: 50_000 })); // Increased from 10k to 50k

  //     // Send and confirm
  //     setProgressText("Waiting for you to approve the mint transaction...");
  //     await createNftTx.sendAndConfirm(umi, {
  //       confirm: { commitment: 'confirmed' },
  //     });

  //     const mintAddress = mint.publicKey.toString();
  //     console.log("NFT Minted:", mintAddress);
  //     toast("NFT Minted!", { description: `Mint address: ${mintAddress}` });


  //     // --- STEP 4 & 5: Anchor and Backend (No changes here, your code is good) ---
  //     setProgress(75);
  //     setProgressText("Registering song with our program...");
  //     const provider = new anchor.AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
  //     const program = new anchor.Program(idl as anchor.Idl, provider);

  //     const [songPda] = PublicKey.findProgramAddressSync(
  //       [Buffer.from("song"), new PublicKey(mintAddress).toBuffer()],
  //       program.programId
  //     );

  //     // @ts-ignore
  //     const initializeTx = await program.methods
  //       .initializeSong(curatorShare * 100)
  //       .accounts({
  //         payer: wallet.publicKey,
  //         song: songPda,
  //         mint: new PublicKey(mintAddress),
  //         artist: wallet.publicKey,
  //         curator: new PublicKey(curator),
  //         systemProgram: SystemProgram.programId,
  //       })
  //       .transaction();

  //     initializeTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  //     initializeTx.feePayer = wallet.publicKey;

  //     const computePriceInstruction = anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
  //       microLamports: 50_000, // Matching the mint fee
  //     });
  //     initializeTx.instructions.unshift(computePriceInstruction);

  //     const signedTx = await wallet.signTransaction(initializeTx);
  //     const txSignature = await connection.sendRawTransaction(signedTx.serialize());

  //     await connection.confirmTransaction({
  //       signature: txSignature,
  //       blockhash: initializeTx.recentBlockhash,
  //       lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight
  //     }, 'confirmed');

  //     console.log("Song registered on-chain.");
  //     toast("Song Registered!", { description: "Your song is now on the blockchain." });

  //     setProgress(90);
  //     setProgressText("Finalizing and saving to database...");
  //     await fetch(`${API_BASE_URL}/init-song`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({
  //         mint: mintAddress,
  //         artist: wallet.publicKey.toBase58(),
  //         curator: curator,
  //         curatorShareBps: curatorShare * 100,
  //         ipfsAudioCid: audioCid,
  //         metadataUri: metadataUrl,
  //       }),
  //     });

  //     setProgress(100);
  //     setProgressText("Upload complete!");

  //   } catch (error: any) {
  //     console.error("Upload process failed:", error);
  //     toast.error("Upload Failed", { description: error.message });
  //     setProgress(0);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!file || !wallet.publicKey || !wallet.signTransaction) {
    toast.error("Please connect your wallet and select a file.");
    return;
  }
  if (!curator) {
    toast.error("Please enter a curator wallet address.");
    return;
  }

  setIsLoading(true);

  try {
    // --- STEP 1: Upload audio ---
    setProgress(10);
    setProgressText("Uploading audio file...");
    const formData = new FormData();
    formData.append("file", file);

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const uploadRes = await fetch(`${API_BASE_URL}/upload`, { method: "POST", body: formData });
    if (!uploadRes.ok) throw new Error("Audio upload failed");

    const { url: audioUrl, cid: audioCid } = await uploadRes.json();
    console.log("Audio uploaded:", audioUrl);

    // --- STEP 2: Upload metadata ---
    setProgress(25);
    setProgressText("Uploading metadata...");

    const metadata = {
      name: title,
      symbol: "MUSIC",
      description: `A song by ${wallet.publicKey.toBase58()}`,
      image: imageUrl,
      animation_url: audioUrl,
      properties: {
        files: [{ uri: audioUrl, type: file.type }],
        category: "audio",
      },
    };

    const metadataRes = await fetch(`${API_BASE_URL}/upload-metadata`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metadata),
    });
    if (!metadataRes.ok) throw new Error("Metadata upload failed");

    const { metadataUrl } = await metadataRes.json();
    console.log("Metadata uploaded:", metadataUrl);

    // --- STEP 3: Mint NFT ---
    setProgress(50);
    setProgressText("Preparing mint transaction...");

    const umi = createUmi(reliableRpcEndpoint)
      .use(walletAdapterIdentity(wallet))
      .use(mplTokenMetadata());

    const mint = generateSigner(umi);

    let createNftTx = createNft(umi, {
      mint,
      name: metadata.name,
      uri: metadataUrl,
      sellerFeeBasisPoints: percentAmount(5.5),
      isCollection: false,
    });

    createNftTx = createNftTx
      .add(setComputeUnitLimit(umi, { units: 400_000 }))
      .add(setComputeUnitPrice(umi, { microLamports: 50_000 }));

    setProgressText("Waiting for you to approve the mint transaction...");
    await createNftTx.sendAndConfirm(umi, { confirm: { commitment: "confirmed" } });

    const mintAddress = mint.publicKey.toString();
    console.log("NFT Minted:", mintAddress);
    toast("NFT Minted!", { description: `Mint address: ${mintAddress}` });

    // --- STEP 4: Register song with Anchor program ---
    setProgress(75);
    setProgressText("Registering song with our program...");

    const provider = new anchor.AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
    const program = new anchor.Program(idl as anchor.Idl, provider);

    const [songPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("song"), new PublicKey(mintAddress).toBuffer()],
      program.programId
    );

    // ✅ FIX: Build a fresh transaction every time
    const latestBlockhash = await connection.getLatestBlockhash();
    //@ts-ignore
    const initializeTx = await program.methods
      .initializeSong(curatorShare * 100)
      .accounts({
        payer: wallet.publicKey,
        song: songPda,
        mint: new PublicKey(mintAddress),
        artist: wallet.publicKey,
        curator: new PublicKey(curator),
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    initializeTx.recentBlockhash = latestBlockhash.blockhash;
    initializeTx.feePayer = wallet.publicKey;

    initializeTx.instructions.unshift(
      anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 })
    );

    const signedTx = await wallet.signTransaction(initializeTx);
    const txSignature = await connection.sendRawTransaction(signedTx.serialize());

    await connection.confirmTransaction(
      {
        signature: txSignature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      "confirmed"
    );

    console.log("Song registered on-chain.");
    toast("Song Registered!", { description: "Your song is now on the blockchain." });

    // --- STEP 5: Save to backend ---
    setProgress(90);
    setProgressText("Finalizing and saving to database...");
    await fetch(`${API_BASE_URL}/init-song`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mint: mintAddress,
        artist: wallet.publicKey.toBase58(),
        curator,
        curatorShareBps: curatorShare * 100,
        ipfsAudioCid: audioCid,
        metadataUri: metadataUrl,
      }),
    });

    setProgress(100);
    setProgressText("Upload complete!");
  } catch (error: any) {
    console.error("Upload process failed:", error);
    toast.error("Upload Failed", { description: error.message });
    setProgress(0);
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
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input
                    id="imageUrl"
                    type="url"
                    placeholder="https://example.com/cover.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter an image URL (album art, cover photo, etc.)
                  </p>
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