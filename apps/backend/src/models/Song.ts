import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ISong extends Document {
  mint: string;               // NFT mint address
  artist: string;             // artist wallet pubkey
  curator: string;            // curator wallet pubkey
  curatorShareBps?: number;   // basis points
  ipfsAudioCid?: string;      // audio file cid
  metadataUri?: string;       // metadata URI (ipfs://...)
  streamCount?: number;
  lastStreamSlot?: number;
  createdAt?: Date;
}

const SongSchema: Schema<ISong> = new Schema({
  mint: { type: String, required: true, index: true },
  artist: { type: String, required: true, index: true },
  curator: { type: String, required: true, index: true },
  curatorShareBps: { type: Number, default: 2000 },
  ipfsAudioCid: { type: String },
  metadataUri: { type: String },
  streamCount: { type: Number, default: 0 },
  lastStreamSlot: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const Song: Model<ISong> = mongoose.model<ISong>('Song', SongSchema);
export default Song;
