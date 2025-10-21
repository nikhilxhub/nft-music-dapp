import { NextResponse, NextRequest } from "next/server";
import { Connection, PublicKey, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import idl from "@/../idl.json"; 
import { createBuySongInstruction } from "@/app/lib/solanaTransaction";


// --- Your constants
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const heliusRpcUrl = "https://devnet.helius-rpc.com/?api-key=fa881eb0-631a-4cc1-a392-7a86e94bf23c";

// --- Types needed
interface SongDetails { mint: string; artist: string; curator: string; buyLamports: number; }
interface NftMetadata { name: string; image: string; }

/**
 * GET: This tells the wallet "WHAT" the link is.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { mint: string } }
) {
  const { mint } = params;
  // This calls YOUR Node.js backend to get song info
  const response = await fetch(`${API_BASE_URL}/song/${mint}`);
  const data: { song: SongDetails; metadata: NftMetadata } = await response.json();
  const buyPriceSol = data.song.buyLamports / LAMPORTS_PER_SOL;

  const payload = {
    title: `Buy "${data.metadata.name}"`,
    description: `Buy this song for ${buyPriceSol} SOL.`,
    icon: data.metadata.image,
    label: `Buy for ${buyPriceSol} SOL`,
  };
  return NextResponse.json(payload, { status: 200 });
}


// export async function POST(
//   req: NextRequest,
//   { params }: { params: { mint: string } }
// ) {
//   const { mint } = params;
//   const { account } = await req.json(); // Get the buyer's wallet from the request
//   const buyerPublicKey = new PublicKey(account);

//   // 1. Connect to Solana
//   const connection = new Connection(heliusRpcUrl, "confirmed");
//   // @ts-ignore
//   const program = new anchor.Program(idl as anchor.Idl, { connection });

//   // 2. Call YOUR Node.js backend to get artist/curator info
//   const response = await fetch(`${API_BASE_URL}/song/${mint}`);
//   const data = await response.json();
//   const songDetails = data.song;
//     const metadata = data.metadata;

//     if (!songDetails || !metadata) {
//         throw new Error("Invalid song data from backend");
//     }

//   // 3. --- USE THE SHARED FUNCTION ---
//   // We use the same function as our website!
//   const buyIx = await createBuySongInstruction(
//     program,
//     songDetails.mint,
//     buyerPublicKey, // This is the person from Twitter
//     new PublicKey(songDetails.artist),
//     new PublicKey(songDetails.curator)
//   );

//   // 4. Build and serialize the transaction
//   const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
//   const transaction = new Transaction();

//   transaction.add(buyIx);

//   transaction.feePayer = buyerPublicKey;
//     transaction.recentBlockhash = blockhash;
//     transaction.lastValidBlockHeight = lastValidBlockHeight;

//   const serializedTransaction = transaction
//     .serialize({ requireAllSignatures: false })
//     .toString("base64");

//   // 5. Send the transaction back to the wallet
//   const payload = {
//     transaction: serializedTransaction,
//     message: `Thanks for buying ${metadata.name}!`,
//   };
//   return NextResponse.json(payload, { status: 200 });
// }
export async function POST(
  req: NextRequest,
  { params }: { params: { mint: string } }
) {
  const { mint } =  params;
  try {
    const { account } = await req.json(); 
    const buyerPublicKey = new PublicKey(account);

    // 1. Connect to Solana
    const connection = new Connection(heliusRpcUrl, "confirmed");
    // @ts-ignore
    const program = new anchor.Program(idl as anchor.Idl, { connection });

    // 2. Call YOUR Node.js backend to get artist/curator info
    const response = await fetch(`${API_BASE_URL}/song/${mint}`);
    if (!response.ok) {
        throw new Error("Song not found in backend for POST");
    }

   
    // You need to get BOTH song and metadata, just like in your GET request
    const data = await response.json();
    const songDetails = data.song;
    const metadata = data.metadata;

    if (!songDetails || !metadata) {
        throw new Error("Invalid song data from backend");
    }



    // 3. --- USE THE SHARED FUNCTION ---
    const buyIx = await createBuySongInstruction(
      program,
      songDetails.mint,
      buyerPublicKey, // This is the person from Twitter
      new PublicKey(songDetails.artist),
      new PublicKey(songDetails.curator)
    );

    // 4. Build and serialize the transaction (This was correct)
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();

    const transaction = new Transaction();
    transaction.add(buyIx);
    transaction.feePayer = buyerPublicKey;
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;

    const serializedTransaction = transaction
      .serialize({ requireAllSignatures: false })
      .toString("base64");

    // 5. Send the transaction back to the wallet
    const payload = {
      transaction: serializedTransaction,
      // --- USE THE CORRECT VARIABLE FOR THE NAME ---
      message: `Thanks for buying ${metadata.name}!`,
    };
    return NextResponse.json(payload, { status: 200 });

  } catch (err: any) {
      console.error("Blink POST error:", err);
      return NextResponse.json(
      { error: "Failed to create transaction", message: err.message },
      { status: 500 }
    );
  }
}