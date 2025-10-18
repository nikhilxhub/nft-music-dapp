import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ISong extends Document {
 mint: string;
 artist: string;
 curator: string;
 curatorShareBps?: number;
 ipfsAudioCid?: string;
 metadataUri?: string;
 streamLamports?: number; 
 buyLamports?: number; // <-- 1. ADD THIS TO THE INTERFACE
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
 buyLamports: { type: Number, default: 0 }, // <-- 2. ADD THIS TO THE SCHEMA
 streamCount: { type: Number, default: 0 },
 lastStreamSlot: { type: Number, default: 0 },
 createdAt: { type: Date, default: Date.now }
});

const Song: Model<ISong> = mongoose.model<ISong>('Song', SongSchema);
export default Song;