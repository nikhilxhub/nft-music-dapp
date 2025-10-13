import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ISong extends Document {
  mint: string;
  artist: string;
  curator: string;
  curatorShareBps?: number;
  ipfsAudioCid?: string;
  metadataUri?: string;
  streamLamports?: number; 
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
  streamLamports: { type: Number, default: 0 },
  streamCount: { type: Number, default: 0 },
  lastStreamSlot: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const Song: Model<ISong> = mongoose.model<ISong>('Song', SongSchema);
export default Song;