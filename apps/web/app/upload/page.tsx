"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { createNft, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { generateSigner, percentAmount } from "@metaplex-foundation/umi";
import * as anchor from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import idl from "@/../idl.json";
import { NavBar } from "../MyComponents/NavBar";
import { toast } from "sonner";
import { setComputeUnitLimit, setComputeUnitPrice } from "@metaplex-foundation/mpl-toolbox";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { formSchema, FormValues } from "../utils/formSchema";



// ---------------- Component ----------------
const programId = new PublicKey(idl.address);

export default function UploadPage() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const router = useRouter();

  // File and UI state (you asked to keep file logic)
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");

  const {
    register,
    handleSubmit: formHandleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      curator: "",
      curatorShare: 20,
      streamPrice: 0.001,
      buyPrice: 0.1,
      imageUrl: "",
    },
  });

  // === keep this unchanged as requested ===
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]!);
    }
  };
  // =========================================

  // RHF will call this with typed `data` after validation
  const handleSubmit = async (data: FormValues) => {
    // NOTE: don't call e.preventDefault() here — RHF handles it
    if (!file || !wallet.publicKey || !wallet.signTransaction) {
      toast.error("Please connect your wallet and select a file.");
      return;
    }
    if (!data.curator) {
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
      setProgressText("Uploading audio to IPFS...");

      const audioFormData = new FormData();
      audioFormData.append("file", file);

      const uploadRes = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: audioFormData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => null);
        throw new Error((err && err.error) || "Audio upload failed");
      }

      const uploadJson = await uploadRes.json();
      const audioUrl = uploadJson.fileUrl || uploadJson.url || uploadJson.link;
      const audioCid = uploadJson.ipfsHash || uploadJson.cid;

      if (!audioUrl || !audioCid) {
        throw new Error("Failed to get URL and CID from audio upload response.");
      }

      /* ---------------------- STEP 2: Construct and Upload Metadata ---------------------- */
      setProgress(30);
      setProgressText("Uploading metadata to IPFS...");

      const metadata = {
        name: data.title,
        symbol: "MUSIC",
        description: `A song by ${wallet.publicKey.toBase58()}`,
        image: data.imageUrl,
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

      if (!metadataRes.ok) {
        throw new Error("Metadata upload failed");
      }

      const metadataJson = await metadataRes.json();
      const metadataUrl = metadataJson.metadataUrl || metadataJson.url || metadataJson.ipfsUri;
      if (!metadataUrl) {
        throw new Error("Failed to get metadata URL from server response.");
      }

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

      if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
        throw new Error("Please reconnect your wallet — missing signing capability.");
      }

      const anchorWallet = {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction!,
        signAllTransactions: wallet.signAllTransactions!,
      } as unknown as anchor.Wallet;

      const provider = new anchor.AnchorProvider(connection, anchorWallet, {
        commitment: "confirmed",
      });

      const program = new anchor.Program(idl as anchor.Idl, provider);

      const [songPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("song"), new PublicKey(mintAddress).toBuffer()],
        program.programId
      );

      // Check if song is already registered
      // @ts-ignore
      const existingAccount = await program.account.songConfig?.fetchNullable?.(songPda);
      if (existingAccount) {
        toast("Song already registered!", { description: "This mint is already linked on-chain." });
        setProgress(100);
        setProgressText("Already registered!");
        setIsLoading(false);
        return;
      }

      // Convert SOL prices (float) to lamports integer safely
      const streamLamports = new anchor.BN(Math.round(data.streamPrice * LAMPORTS_PER_SOL));
      const buyLamports = new anchor.BN(Math.round(data.buyPrice * LAMPORTS_PER_SOL));

      // Build the initialize instruction
      // @ts-ignore (depends on IDL types)
      const initializeIx = await program.methods
        .initializeSong(
          data.curatorShare * 100, // curator_share_bps (u16)
          streamLamports,
          buyLamports
        )
        .accounts({
          payer: wallet.publicKey,
          song: songPda,
          mint: new PublicKey(mintAddress),
          artist: wallet.publicKey,
          curator: new PublicKey(data.curator),
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      // Submit the transaction with a small retry loop
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

          const signedTx = await wallet.signTransaction!(tx);
          txSig = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: false });

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
          const msg = (err && err.toString && err.toString()) || "";

          if (
            msg.includes("already in use") ||
            msg.includes("account already initialized") ||
            msg.includes("already exists") ||
            msg.includes("already been processed") ||
            msg.includes("already processed")
          ) {
            try {
              const existsNow = await connection.getAccountInfo(songPda);
              if (existsNow) {
                txSig = txSig || "already-registered";
                console.log("Song already registered on-chain (detected after tx failure). Treating as success.");
                break;
              }
            } catch (e) {
              // ignore and continue
            }
          }

          if (attempt < maxAttempts - 1) {
            await new Promise((r) => setTimeout(r, 500));
            continue;
          }

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
          curator: data.curator,
          curatorShareBps: data.curatorShare * 100,
          ipfsAudioCid: audioCid,
          metadataUri: metadataUrl,
          streamLamports: streamLamports.toNumber(),
          buyLamports: buyLamports.toNumber(),
          txSig,
        }),
      });

      setProgress(100);
      setProgressText("🎉 Upload complete!");
      toast.success("Song successfully uploaded!");

      router.push("/homepage");
    } catch (error: any) {
      console.error("❌ Upload failed:", error);
      if (error?.logs) console.log("Logs:", error.logs);
      toast.error("Upload Failed", { description: error?.message ?? String(error) });
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
            <CardDescription>Fill in the details, mint the song as an NFT, and register it on-chain.</CardDescription>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center space-y-4">
                <p className="text-sm font-medium">{progressText}</p>
                <Progress value={progress} className="w-full" />
                <p className="text-xs text-muted-foreground">Please approve the transactions in your wallet.</p>
              </div>
            ) : (
              <form onSubmit={formHandleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="title">Song Title</Label>
                  <Input id="title" {...register("title")} placeholder="My new hit song" />
                  {errors.title && <p className="text-red-500 text-xs">{errors.title.message}</p>}
                </div>

                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="curator">Curator Wallet Address</Label>
                  <Input id="curator" {...register("curator")} placeholder="Wallet address" />
                  {errors.curator && <p className="text-red-500 text-xs">{errors.curator.message}</p>}
                </div>

                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="curatorShare">Curator Share (%)</Label>
                  <Input id="curatorShare" type="number" {...register("curatorShare", { valueAsNumber: true })} />
                  {errors.curatorShare && <p className="text-red-500 text-xs">{errors.curatorShare.message}</p>}
                </div>

                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="streamPrice">Stream Price (SOL)</Label>
                  <Input id="streamPrice" type="number" step="0.0001" {...register("streamPrice", { valueAsNumber: true })} />
                  {errors.streamPrice && <p className="text-red-500 text-xs">{errors.streamPrice.message}</p>}
                </div>

                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="buyPrice">Buy Price (SOL)</Label>
                  <Input id="buyPrice" type="number" step="0.01" {...register("buyPrice", { valueAsNumber: true })} />
                  {errors.buyPrice && <p className="text-red-500 text-xs">{errors.buyPrice.message}</p>}
                </div>

                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input id="imageUrl" type="url" {...register("imageUrl")} placeholder="https://example.com/cover.jpg" />
                  {errors.imageUrl && <p className="text-red-500 text-xs">{errors.imageUrl.message}</p>}
                </div>

                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="audio">Audio File (MP3, WAV)</Label>
                  <Input id="audio" type="file" accept="audio/*" onChange={handleFileChange} required />
                </div>

                <Button type="submit" className="w-full" disabled={!wallet.connected}>
                  {wallet.connected ? "Start Upload Process" : "Connect Wallet to Upload"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
