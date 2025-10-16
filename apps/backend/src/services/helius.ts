import Purchase from '../models/Purchase';
import Song from '../models/Song';
import StreamLog from '../models/StreamLog';

interface Transfer {
  source?: string;
  destination?: string;
  lamports: number;
  mint?: string;
  txHash?: string;
  slot?: number;
  payer?: string;
  raw?: any;
}

type WebhookPayload = any; // You can refine this later with Helius types

/**
 * extractTransfers(payload)
 * - Best-effort extractor for Helius enhanced/raw webhook payloads.
 * - Returns array of Transfer objects.
 */
export function extractTransfers(payload: WebhookPayload): Transfer[] {
  const transfers: Transfer[] = [];

  if (!payload) return transfers;

  if (Array.isArray(payload)) {
    payload.forEach(p => transfers.push(...extractTransfers(p)));
    return transfers;
  }

  if (payload.transfers && Array.isArray(payload.transfers)) {
    payload.transfers.forEach((t: any) => {
      transfers.push({
        source: t.from || t.source || t.sender,
        destination: t.to || t.destination || t.receiver,
        lamports: Number(t.lamports ?? t.amount ?? 0),
        mint: t.mint,
        txHash: payload.signature || payload.txHash || payload.transactionHash,
        slot: payload.slot || (payload.transaction?.slot),
        raw: t
      });
    });
    return transfers;
  }

  if (payload.transaction?.signatures) {
    try {
      const message = payload.transaction.message;
      if (message?.instructions) {
        message.instructions.forEach((instr: any) => {
          if (instr.parsed?.type === 'transfer' && instr.parsed.info) {
            transfers.push({
              source: instr.parsed.info.source,
              destination: instr.parsed.info.destination,
              lamports: Number(instr.parsed.info.lamports ?? instr.parsed.info.amount ?? 0),
              txHash: payload.transaction.signatures?.[0],
              slot: payload.slot
            });
          }
        });
      }
    } catch(e) {
      // fallthrough
      console.log("error is :", e);
      
    }
  }

  if (payload.type && payload.info) {
    const info = payload.info;
    if (info.amount && (info.destination || info.to)) {
      transfers.push({
        source: info.source || info.from,
        destination: info.destination || info.to,
        lamports: Number(info.amount),
        txHash: payload.signature || payload.txHash,
        slot: payload.slot
      });
    }
  }

  return transfers;
}

/**
 * processWebhook(payload)
 * - Logs Helius event in DB and processes transfers.
 */
export async function processWebhook(payload: WebhookPayload): Promise<boolean> {
  const items = Array.isArray(payload) ? payload : [payload];

  for (const item of items) {
    const transfers = extractTransfers(item);
    for (const t of transfers) {
      if (!t.destination) continue;

      const song = await Song.findOne({
        $or: [{ artist: t.destination }, { curator: t.destination }]
      });

      if (song) {
        await StreamLog.create({
          songMint: song.mint,
          txHash: t.txHash,
          payer: t.source,
          destination: t.destination,
          amountLamports: t.lamports || 0,
          slot: t.slot || 0,
          timestamp: new Date(),
          raw: t.raw ?? item
        });

        await Song.updateOne({ _id: song._id }, {
          $inc: { streamCount: 1 },
          $set: { lastStreamSlot: t.slot || song.lastStreamSlot }
        });
      }
    }
  }

  return true;
}



export async function processWebhookForSinglePayment(payload: WebhookPayload): Promise<boolean> {
  const items = Array.isArray(payload) ? payload : [payload];

  for (const item of items) {
    const transfers = extractTransfers(item);

    for (const t of transfers) {
      // We need a destination and a payer (source) to attribute the purchase
      if (!t.destination || !t.source) continue;

      // Find if the destination wallet belongs to one of our artists
      const song = await Song.findOne({ artist: t.destination });

      // Check if a song was found and if the amount matches the purchase price
      if (song && song.streamLamports && t.lamports === song.streamLamports) {
        
        console.log(`Purchase detected for song ${song.mint} from ${t.source}`);

        // Create a record in our new Purchase collection
        // Use upsert to prevent duplicates based on txHash
        await Purchase.findOneAndUpdate(
          { txHash: t.txHash },
          {
            songMint: song.mint,
            userAddress: t.source, // The payer is the user who now owns it
            txHash: t.txHash,
            amountLamports: t.lamports,
          },
          { upsert: true, new: true }
        );

        // You can optionally still log it as a stream or just handle it as a purchase
        // For clarity, we've separated the logic.
      }
    }
  }

  return true;
}