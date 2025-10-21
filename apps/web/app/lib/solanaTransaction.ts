import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Idl } from "@coral-xyz/anchor";

/**
 * This new function contains YOUR logic from handleBuySong.
 * Both your website and your Blink API will call this function.
 */
export async function createBuySongInstruction(
  program: anchor.Program<Idl>, // Pass in the program
  mint: string,
  buyer: PublicKey,
  artist: PublicKey,
  curator: PublicKey
): Promise<TransactionInstruction> {
  
  // --- This is YOUR code, moved from handleBuySong ---
  const [songPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("song"), new PublicKey(mint).toBuffer()],
    program.programId
  );

  const [ownershipPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("ownership"),
      songPda.toBuffer(),
      buyer.toBuffer(),
    ],
    program.programId
  );

  // @ts-ignore
  const buyIx = await program!.methods!
    .buySong()
    .accounts({
      buyer: buyer,
      song: songPda,
      ownership: ownershipPda,
      artist: artist,
      curator: curator,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  // --- End of your moved code ---

  return buyIx; // Return the instruction
}