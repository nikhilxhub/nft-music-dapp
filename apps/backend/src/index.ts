import dotenv from 'dotenv';
import express, { Request, Response } from 'express';

import cors from 'cors';
import multer from 'multer';
import mongoose from 'mongoose';

import { uploadFileToIpfs } from './services/ipfs';
import { processWebhook } from './services/helius';
import Song from './models/Song';
import StreamLog from './models/StreamLog';
import axios from 'axios';

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage()});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


const PORT = process.env.PORT || 3001;

mongoose.connect(process.env.MONGO_URI as string).then(() => {
  console.log('MongoDB connected');

}).catch((err) => {

  console.error('MongoDB failed', err);
  process.exit(1);

});

/**
 * Health check
 */
app.get('/', (_req: Request, res: Response) => {
  res.send({ ok: true, ts: new Date().toISOString() });
});

/**
 * Upload audio file
 */
app.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Missing file' });

    const { originalname, buffer, mimetype } = req.file;
    const result = await uploadFileToIpfs(buffer, originalname, mimetype);
    return res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('upload error', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Create song record
 */
app.post('/init-song', async (req: Request, res: Response) => {
  try {
    const { mint, artist, curator, curatorShareBps = 2000, ipfsAudioCid, metadataUri } = req.body;
    if (!mint || !artist || !curator) {
      return res.status(400).json({ error: 'mint/artist/curator required' });
    }

    const existing = await Song.findOne({ mint });
    if (existing) {
      return res.status(409).json({ error: 'song already exists', song: existing });
    }

    const song = await Song.create({
      mint, artist, curator, curatorShareBps,
      ipfsAudioCid, metadataUri,
    });

    return res.json({ success: true, song });
  } catch (err: any) {
    console.error('init-song error', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Helius webhook
 */
app.post('/webhook/helius', async (req: Request, res: Response) => {
  try {
    const incomingAuth = req.get('authorization') || req.get('Authorization') || '';
    if (!process.env.HELIUS_WEBHOOK_SECRET) {
      console.warn('HELIUS_WEBHOOK_SECRET not set; accepting all webhooks (dev only)');
    } else if (incomingAuth !== process.env.HELIUS_WEBHOOK_SECRET) {
      console.warn('Invalid webhook auth', incomingAuth);
      return res.status(401).send('unauthorized');
    }

    const payload = req.body;
    await processWebhook(payload);
    res.status(200).send('ok');
  } catch (err: any) {
    console.error('webhook error', err);
    res.status(500).send('error');
  }
});

/**
 * Read endpoints
 */
app.get('/songs', async (_req: Request, res: Response) => {
  const songs = await Song.find().sort({ createdAt: -1 }).limit(100);
  res.json(songs);
});

app.get('/streams', async (req: Request, res: Response) => {
  try {
    const { payer, destination } = req.query;

    const filter: any = {};
    if (payer) {
      filter.payer = payer as string;
    }
    if (destination) {
      filter.destination = destination as string;
    }

    const logs = await StreamLog.find(filter).sort({ timestamp: -1 }).limit(200);
    res.json(logs);
  } catch (err: any) {
    console.error('Error fetching streams:', err);
    res.status(500).json({ error: err.message });
  }
});



app.get('/user-assets', async (req: Request, res: Response) => {
  try {
    const { owner } = req.query;
    if (!owner) {
      return res.status(400).json({ error: 'Owner address is required' });
    }

    const heliusRpcUrl = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;

    // STEP 1: Fetch ALL asset data from Helius
    const { data } = await axios.post(heliusRpcUrl, {
      jsonrpc: '2.0',
      id: 'my-id',
      method: 'getAssetsByOwner',
      params: {
        ownerAddress: owner as string,
        page: 1,
        limit: 1000, // Fetch a larger list to check against
      },
    });

    if (!data.result || !data.result.items) {
      return res.json([]); // Return empty array if user has no assets
    }

    // Extract just the mint addresses from the Helius response
    const userNftMints = data.result.items.map((asset: any) => asset.id);

    // STEP 2: Filter these mints against YOUR database
    // Use the `$in` operator to find all songs that match any of the mints in the user's wallet.
    // This is much more efficient than looping and querying one by one.
    const platformSongsOwnedByUser = await Song.find({
      mint: { $in: userNftMints },
    });

    // STEP 3: Return only the songs that are part of your platform
    res.json(platformSongsOwnedByUser);

  } catch (err: any) {
    console.error('Error fetching user assets:', err);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});


app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
