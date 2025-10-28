import {
  Connection,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import {
  ActionGetResponse,
  ActionPostRequest,
  ACTIONS_CORS_HEADERS,
  createPostResponse,
} from "@solana/actions";
import { NextRequest, NextResponse } from 'next/server';
import idl from "@/../idl.json";
import { createBuySongInstruction } from "@/app/lib/solanaTransaction";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const HELIUS_RPC_URL =
  "https://devnet.helius-rpc.com/?api-key=fa881eb0-631a-4cc1-a392-7a86e94bf23c";

// Ensure we always return explicit CORS headers (include ACTIONS_CORS_HEADERS
// but also make sure preflight required headers are present).
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  ...ACTIONS_CORS_HEADERS,
};

/* -------------------------------------------------------------------------- */
/*                                GET                                   */
/* -------------------------------------------------------------------------- */
export async function GET(request: any, context: any) {
  const { mint } = (context.params as { mint: string }) || { mint: '' };

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
      title: `Buy "${data.metadata.name}"`,
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

// Respond to CORS preflight requests
export async function OPTIONS(_request: any, _context: any) {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/* -------------------------------------------------------------------------- */
/*                                   POST                                  */
/* -------------------------------------------------------------------------- */
export async function POST(request: any, context: any) {
  const { mint } = (context.params as { mint: string }) || { mint: '' };

  try {
    // 1️⃣ Parse wallet info
    const body: ActionPostRequest = await request.json();
    const buyer = new PublicKey(body.account);

    // 2️⃣ Solana + Anchor setup
    const connection = new Connection(HELIUS_RPC_URL, "confirmed");

    // Dummy wallet for server-side provider (signing happens client-side)
    const dummyWallet = {
      publicKey: buyer,
      signTransaction: async (tx: any) => tx,
      signAllTransactions: async (txs: any) => txs,
    };

    const provider = new AnchorProvider(connection, dummyWallet as any, {
      commitment: "confirmed",
    });

  // ✅ Correct Program instantiation
  // Anchor Program expects (idl, provider) in this environment; pass provider as any.
  const program = new Program(idl as any, provider as any);

  // 3️⃣ Fetch song data from backend
  const response = await fetch(`${API_BASE_URL}/song/${mint}`);
  if (!response.ok) throw new Error("Song not found in backend");

    const data = await response.json();
    const { song, metadata } = data;
    if (!song || !metadata) throw new Error("Invalid song data");

    // 4️⃣ Build buy instruction
    const buyIx = await createBuySongInstruction(
      program,
      song.mint,
      buyer,
      new PublicKey(song.artist),
      new PublicKey(song.curator)
    );

    // Ensure buyer is signer
    buyIx.keys = buyIx.keys.map((k) =>
      k.pubkey.equals(buyer) ? { ...k, isSigner: true } : k
    );

    // 5️⃣ Create Versioned Transaction
    const latestBlockhash = await connection.getLatestBlockhash();
    const message = new TransactionMessage({
      payerKey: buyer,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [buyIx],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(message);

    // 6️⃣ Return proper Action response. Many action consumers expect a
    // transaction-like object that implements `.serialize()`. To be robust
    // across different web3.js copies and environments, provide a tiny
    // wrapper with a `serialize()` method delegating to the VersionedTransaction
    // we created above. Also include a base64 serialized fallback for
    // diagnostics and manual client-side fallback signing.

    // Serialize now for fallback
    let txBase64: string | null = null;
    let serializedTx: Uint8Array | null = null;
    try {
      serializedTx = transaction.serialize();
      txBase64 = Buffer.from(serializedTx).toString("base64");
    } catch (e) {
      console.warn("Could not serialize VersionedTransaction:", e);
    }

    // Wrapper object provides serialize() so callers that call
    // `fields.transaction.serialize()` succeed. Some consumers also
    // directly inspect `transaction.instructions` or `transaction.payerKey`;
    // include those to be maximally compatible.
    const txWrapper: any = {
      serialize: () => serializedTx || new Uint8Array(),
      instructions: [buyIx],
      payerKey: buyer.toBase58(),
    };

    const responsePayload = await createPostResponse({
      fields: {
        type: "transaction",
        transaction: txWrapper,
      },
    } as any);

    // Attach helpful debug/fallback fields
    try {
      (responsePayload as any).__debug = { txBase64 };
      (responsePayload as any).transactionBase64 = txBase64;
      if ((responsePayload as any).fields) {
        (responsePayload as any).fields.transactionBase64 = txBase64;
      }
    } catch (e) {
      // ignore
    }

    // Debug log the payload we are returning so we can inspect it if the
    // wallet reports an unexpected error. Remove/log appropriately in prod.
    try {
      console.log("createPostResponse payload keys:", Object.keys(responsePayload || {}));
    } catch (e) {
      // ignore
    }

    return NextResponse.json(responsePayload, { headers: CORS_HEADERS });
  } catch (err: any) {
    console.error("BuySong POST error:", err);
    return new NextResponse(
      JSON.stringify({
        error: "Failed to create transaction",
        message: err.message,
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
