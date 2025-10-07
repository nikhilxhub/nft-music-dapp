import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IStreamLog extends Document {
  songMint: string;
  txHash?: string;
  payer?: string;
  destination?: string;
  amountLamports?: number;
  slot?: number;
  timestamp?: Date;
  raw?: Record<string, any>;
}

const StreamLogSchema: Schema<IStreamLog> = new Schema({
  songMint: { type: String, required: true, index: true },
  txHash: { type: String },
  payer: { type: String },
  destination: { type: String },
  amountLamports: { type: Number },
  slot: { type: Number },
  timestamp: { type: Date, default: Date.now },
  raw: { type: Object }
});

const StreamLog: Model<IStreamLog> = mongoose.model<IStreamLog>('StreamLog', StreamLogSchema);
export default StreamLog;
