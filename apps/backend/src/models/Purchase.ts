// models/Purchase.ts

import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IPurchase extends Document {
  songMint: string;      // The NFT mint of the song purchased
  userAddress: string;   // The wallet address of the buyer
  txHash: string;        // The transaction hash of the purchase
  amountLamports: number; // How much they paid
  createdAt: Date;
}

const PurchaseSchema: Schema<IPurchase> = new Schema({
  songMint: { type: String, required: true, index: true },
  userAddress: { type: String, required: true, index: true },
  txHash: { type: String, required: true, unique: true }, // Ensure no duplicate transactions are logged
  amountLamports: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Create a compound index to quickly look up ownership
PurchaseSchema.index({ songMint: 1, userAddress: 1 });

const Purchase: Model<IPurchase> = mongoose.model<IPurchase>('Purchase', PurchaseSchema);
export default Purchase;