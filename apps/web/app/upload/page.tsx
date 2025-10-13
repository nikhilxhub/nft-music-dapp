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
import { PublicKey, sendAndConfirmTransaction, SystemProgram } from "@solana/web3.js";
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
  setProgress(0);
  setProgressText("Starting upload...");
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  try {
    /* ---------------------- STEP 1: Upload audio ---------------------- */
    setProgress(10);
    setProgressText("Uploading audio file...");
    const formData = new FormData();
    formData.append("file", file);

    const uploadRes = await fetch(`${API_BASE_URL}/upload`, { method: "POST", body: formData });
    if (!uploadRes.ok) throw new Error("Audio upload failed");

    const { url: audioUrl, cid: audioCid } = await uploadRes.json();
    console.log("🎵 Audio uploaded:", audioUrl);

    /* ---------------------- STEP 2: Upload metadata ---------------------- */
    setProgress(30);
    setProgressText("Uploading metadata...");

    const metadata = {
      name: title,
      symbol: "MUSIC",
      description: `A song by ${wallet.publicKey.toBase58()}`,
      image: imageUrl,
      animation_url: audioUrl,
      properties: { files: [{ uri: audioUrl, type: file.type }], category: "audio" },
    };

    const metadataRes = await fetch(`${API_BASE_URL}/upload-metadata`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metadata),
    });
    if (!metadataRes.ok) throw new Error("Metadata upload failed");

    const { metadataUrl } = await metadataRes.json();
    console.log("🪶 Metadata uploaded:", metadataUrl);

    /* ---------------------- STEP 3: Mint NFT via UMI ---------------------- */
    setProgress(55);
    setProgressText("Minting NFT on Solana...");

    const umi = createUmi("https://devnet.helius-rpc.com/?api-key=fa881eb0-631a-4cc1-a392-7a86e94bf23c")
      .use(walletAdapterIdentity(wallet))
      .use(mplTokenMetadata());

    const mint = generateSigner(umi);

    let createNftTx = createNft(umi, {
      mint,
      name: metadata.name,
      uri: metadataUrl,
      sellerFeeBasisPoints: percentAmount(5.5),
      isCollection: false,
    })
      .add(setComputeUnitLimit(umi, { units: 350_000 }))
      .add(setComputeUnitPrice(umi, { microLamports: 50_000 }));

    await createNftTx.sendAndConfirm(umi, { confirm: { commitment: "confirmed" } });
    const mintAddress = mint.publicKey.toString();
    console.log("✅ NFT Minted:", mintAddress);
    toast.success("NFT Minted!", { description: mintAddress });

    /* ---------------------- STEP 4: Register song on-chain ---------------------- */
    setProgress(75);
    setProgressText("Registering song on-chain...");

    const provider = new anchor.AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
    // Create the Anchor Program (provider-based). The IDL should contain the program id.
    const program = new anchor.Program(idl as anchor.Idl, provider as any);

    const [songPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("song"), new PublicKey(mintAddress).toBuffer()],
      program.programId
    );

    // Check if song is already registered by querying the account directly.
    // Using `connection.getAccountInfo` avoids depending on Anchor's account parsers
    // and reduces race conditions where fetchNullable may return null while the
    // account is allocated but not parsable yet.
    const existingAccount = await connection.getAccountInfo(songPda);
    if (existingAccount) {
      toast("Song already registered!", { description: "This mint is already linked on-chain." });
      setProgress(100);
      setProgressText("Already registered!");
      setIsLoading(false);
      return;
    }

        // Build the initialize instruction
        // @ts-ignore
        const initializeIx = await program.methods
          .initializeSong(curatorShare * 100)
          .accounts({
            payer: wallet.publicKey,
            song: songPda,
            mint: new PublicKey(mintAddress),
            artist: wallet.publicKey,
            curator: new PublicKey(curator),
            systemProgram: SystemProgram.programId,
          })
          .instruction();

        // Submit the transaction with retries to handle transient "blockhash expired" issues
        const maxAttempts = 3;
        let txSig: string | null = null;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          try {
            const latestBlockhash = await connection.getLatestBlockhash("confirmed");

            const tx = new anchor.web3.Transaction({
              recentBlockhash: latestBlockhash.blockhash,
              feePayer: wallet.publicKey!,
            });

            tx.add(
              anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 350_000 }),
              anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }),
              initializeIx
            );

            // Ask the wallet to sign the transaction (fresh recentBlockhash each attempt)
            const signedTx = await wallet.signTransaction!(tx);

            txSig = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: false });

            // Confirm it (use the blockhash info we just fetched)
            await connection.confirmTransaction(
              {
                signature: txSig,
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
              },
              "confirmed"
            );

            console.log("✅ Song registered:", txSig);
            toast.success("Song Registered!", { description: txSig });
            break; // success
          } catch (err: any) {
            console.error(`initializeSong attempt ${attempt + 1} failed:`, err);

            const msg = (err && err.toString && err.toString()) || '';

            // If the error indicates allocation/already-processed, check on-chain
            // for the PDA and treat it as success if present.
            if (msg.includes('already in use') || msg.includes('account already initialized') || msg.includes('already exists') || msg.includes('already been processed') || msg.includes('already processed')) {
              try {
                const existsNow = await connection.getAccountInfo(songPda);
                if (existsNow) {
                  txSig = txSig || 'already-registered';
                  console.log('Song already registered on-chain (detected after tx failure). Treating as success.');
                  break;
                }
              } catch (e) {
                // ignore and continue to retry
              }
            }

            // For blockhash/expired related errors, retry after a short delay
            if (attempt < maxAttempts - 1) {
              await new Promise((r) => setTimeout(r, 500));
              continue;
            }

            // Give up and rethrow the error to be handled by outer catch
            throw err;
          }
        }

    /* ---------------------- STEP 5: Save to backend ---------------------- */
    setProgress(95);
    setProgressText("Saving song to database...");

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
        txSig,
      }),
    });

    setProgress(100);
    setProgressText("🎉 Upload complete!");
    toast.success("Song successfully uploaded!");
  } catch (error: any) {
    console.error("❌ Upload failed:", error);
    if (error.logs) console.log("Logs:", error.logs);
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