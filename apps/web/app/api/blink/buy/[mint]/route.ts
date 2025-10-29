import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import {
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
  createPostResponse,
} from "@solana/actions";
import { NextRequest, NextResponse } from "next/server";
import { createBuySongInstruction } from "@/app/lib/solanaTransaction";

/* -------------------------------------------------------------------------- */
/*                          CONFIGURATION + CONSTANTS                         */
/* -------------------------------------------------------------------------- */
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const HELIUS_RPC_URL =
  "https://devnet.helius-rpc.com/?api-key=fa881eb0-631a-4cc1-a392-7a86e94bf23c";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  ...ACTIONS_CORS_HEADERS,
};

/* -------------------------------------------------------------------------- */
/*                                   GET                                      */
/* -------------------------------------------------------------------------- */
export async function GET(request: any, context: any) {
  const { mint } = (context.params as { mint: string }) || { mint: "" };

  try {
    const response = await fetch(`${API_BASE_URL}/song/${mint}`);
    if (!response.ok) {
      return new NextResponse(JSON.stringify({ error: "Song not found" }), {
        status: 404,
        headers: CORS_HEADERS,
      });
    }

    const data = await response.json();
    const buyPriceSol = data.song.buyLamports / LAMPORTS_PER_SOL;

    const metadata: ActionGetResponse = {
      icon: data.metadata.image,
      title: `Buy ${data.metadata.name}`,
      description: `Buy this song for ${buyPriceSol} SOL.`,
      label: `Buy for ${buyPriceSol} SOL`,
    };

    return NextResponse.json(metadata, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("GET error:", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to fetch song info" }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                            OPTIONS (CORS preflight)                        */
/* -------------------------------------------------------------------------- */
export async function OPTIONS(_request: any, _context: any) {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/* -------------------------------------------------------------------------- */
/*                                   POST                                     */
/* -------------------------------------------------------------------------- */
export async function POST(request: any, context: any) {
  const { mint } = (context.params as { mint: string }) || { mint: "" };

  try {
    /* ---------------------- 1️⃣ Parse wallet from body ---------------------- */
    const body: ActionPostRequest = await request.json();
    const buyer = new PublicKey(body.account);

    /* ---------------------- 2️⃣ Solana + Anchor setup ----------------------- */
    const connection = new Connection(HELIUS_RPC_URL, "confirmed");

    // Dummy wallet — server does not sign; client will sign.
    const dummyWallet = {
      publicKey: buyer,
      signTransaction: async (tx: Transaction) => tx,
      signAllTransactions: async (txs: Transaction[]) => txs,
    };

    const provider = new AnchorProvider(connection, dummyWallet as any, {
      commitment: "confirmed",
    });

    const idl = (await import("@/../idl.json")).default as any;
    const program = new Program(idl, provider as any);

    /* ---------------------- 3️⃣ Fetch song data ----------------------------- */
    const response = await fetch(`${API_BASE_URL}/song/${mint}`);
    if (!response.ok) throw new Error("Song not found in backend");

    const data = await response.json();
    const { song, metadata } = data;
    if (!song || !metadata) throw new Error("Invalid song data");

    /* ---------------------- 4️⃣ Build buy instruction ----------------------- */
    // createBuySongInstruction should return a TransactionInstruction
    const buyIx: TransactionInstruction = await createBuySongInstruction(
      program,
      song.mint,
      buyer,
      new PublicKey(song.artist),
      new PublicKey(song.curator)
    );

    // Ensure the buyer key is listed as a signer in the instruction keys.
    // (The client wallet will actually sign the transaction.)
    buyIx.keys = buyIx.keys.map((k) =>
      k.pubkey.equals(buyer) ? { ...k, isSigner: true } : k
    );

    /* ---------------------- 5️⃣ Create legacy Transaction ------------------ */
    const latest = await connection.getLatestBlockhash("finalized");
    const tx = new Transaction();
    tx.add(buyIx);

    // Set fee payer and recent blockhash so Phantom and other wallets can send
    tx.feePayer = buyer;
    tx.recentBlockhash = latest.blockhash;

    /* ---------------------- 6️⃣ Return Solana Action response ---------------- */
    const actionResponse:ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction", // 👈 required for correct type
        transaction: tx,
        message: "Sign to buy the song",
      },
    });


    return NextResponse.json(actionResponse, { headers: CORS_HEADERS });
  } catch (err: any) {
    console.error("BuySong POST error:", err);
    return new NextResponse(
      JSON.stringify({
        error: "Failed to create transaction",
        message: err?.message ?? String(err),
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}