 
// export const handleBuySong = async () => {
//     if (!publicKey || !songDetails || !program) {
//       toast.error("Please connect your wallet and ensure song details are loaded.");
//       return;
//     }

//     setIsProcessing(true);
//     try {
//       // Find the PDAs required by the 'buy_song' instruction
//       const [songPda] = PublicKey.findProgramAddressSync(
//         [Buffer.from("song"), new PublicKey(songDetails.mint).toBuffer()],
//         program.programId
//       );

//       const [ownershipPda] = PublicKey.findProgramAddressSync(
//         [
//           Buffer.from("ownership"),
//           songPda.toBuffer(),
//           publicKey.toBuffer(),
//         ],
//         program.programId
//       );

//       // Build the instruction
//       // @ts-ignore
//       const buyIx = await program!.methods!
//         .buySong()
//         .accounts({
//           buyer: publicKey,
//           song: songPda,
//           ownership: ownershipPda,
//           artist: new PublicKey(songDetails.artist),
//           curator: new PublicKey(songDetails.curator),
//           systemProgram: SystemProgram.programId,
//         })
//         .instruction();

//       const transaction = new Transaction().add(buyIx);

//       const {
//         context: { slot: minContextSlot },
//         value: { blockhash, lastValidBlockHeight }
//       } = await connection.getLatestBlockhashAndContext();

//       const signature = await sendTransaction(transaction, connection, { minContextSlot });

//       await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });

//       await fetch(`${API_BASE_URL}/record-purchase`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           songMint: songDetails.mint,
//           userAddress: publicKey.toBase58(),
//           txHash: signature,
//           amountLamports: songDetails.buyLamports,
//         }),
//       });

//       toast.success("Purchase successful! You now own this song.");
//       setHasAccess(true); // Optimistically grant access
//       setTempAccess(false); // Not needed if they own it

//     } catch (error: any) {
//       console.error("Purchase failed:", error);
//       toast.error("Purchase failed", { description: error.message });
//     } finally {
//       setIsProcessing(false);
//     }
//   };
