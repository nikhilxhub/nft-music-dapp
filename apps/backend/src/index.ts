import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import { Readable } from 'stream'; 
import cors from 'cors';
import multer from 'multer';
import mongoose from 'mongoose';

import { uploadFileToIpfs } from './services/ipfs';
import { processWebhook } from './services/helius';
import Song from './models/Song';
import StreamLog from './models/StreamLog';
import axios from 'axios';

import pinataSDK from '@pinata/sdk'; 


dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage()});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


const PORT = process.env.PORT || 3001;
const db = process.env.MONGO_URI as string;

console.log(db);



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
// app.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
//   try {
//     if (!req.file) return res.status(400).json({ error: 'Missing file' });

//     const { originalname, buffer, mimetype } = req.file;
//     const result = await uploadFileToIpfs(buffer, originalname, mimetype);
//     return res.json({ success: true, ...result });
//   } catch (err: any) {
//     console.error('upload error', err);
//     return res.status(500).json({ error: err.message });
//   }
// });


app.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    // Create a readable stream from the file buffer that multer provides
    // @ts-ignore
    const stream = Readable.from(req.file.buffer);

    const options = {
      pinataMetadata: {
        // Use the original file name for easier identification in your Pinata account
        name: req.file.originalname, 
      },
    };

    // Use the Pinata SDK to pin the file stream to IPFS
    const result = await pinata.pinFileToIPFS(stream, options);

    // This is the CID (Content Identifier)
    const ipfsHash = result.IpfsHash;

    // Construct the full, accessible URL using your DEDICATED gateway
    const fileUrl = `${process.env.PINATA_GATEWAY}/ipfs/${ipfsHash}`;

    // Send back the CID and the full URL to the frontend
    return res.json({ 
      success: true, 
      ipfsHash: ipfsHash, // The CID
      fileUrl: fileUrl,   // The full URL for your metadata
    });

  } catch (err: any) {
    console.error('File upload error:', err);
    return res.status(500).json({ error: 'Failed to upload file to IPFS.' });
  }
});
/**
 * Create song record
 */
app.post('/init-song', async (req: Request, res: Response) => {
  try {
    // --- CHANGE #1: Destructure streamLamports from the request body ---
    const { 
      mint, 
      artist, 
      curator, 
      curatorShareBps = 2000, 
      ipfsAudioCid, 
      metadataUri,
      streamLamports // <-- ADD THIS
    } = req.body;

    if (!mint || !artist || !curator) {
      return res.status(400).json({ error: 'mint/artist/curator required' });
    }
    if (streamLamports === undefined) { // Good practice to check for the price
        return res.status(400).json({ error: 'streamLamports is required' });
    }

    const existing = await Song.findOne({ mint });
    if (existing) {
      return res.status(409).json({ error: 'song already exists', song: existing });
    }

    // --- CHANGE #2: Add streamLamports to the Song.create() call ---
    const song = await Song.create({
      mint, 
      artist, 
      curator, 
      curatorShareBps,
      ipfsAudioCid, 
      metadataUri,
      streamLamports, // <-- ADD THIS
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

    const heliusRpcUrl = `https://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;

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





// ... after your other app.use() lines
const pinata = new pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_SECRET_KEY);


// app.post('/upload-metadata', async (req: Request, res: Response) => {
//   try {
//     const metadata = req.body; // The JSON from your frontend

//     if (!metadata) {
//       return res.status(400).json({ error: 'Missing metadata JSON body' });
//     }

//     const options = {
//       pinataMetadata: {
//         name: metadata.name || 'Song Metadata', // Give it a name for your Pinata account
//       },
//     };

//     // Use the SDK to "pin" the JSON to IPFS
//     const result = await pinata.pinJSONToIPFS(metadata, options);
    
//     // The result contains the IpfsHash (this is the CID or "tracking number")
//     const { IpfsHash } = result;

//     // Construct the full URL that the NFT needs
//     const metadataUrl = `https://gateway.pinata.cloud/ipfs/${IpfsHash}`;

//     return res.json({ success: true, metadataUrl: metadataUrl });

//   } catch (err: any) {
//     console.error('Metadata upload error:', err);
//     return res.status(500).json({ error: err.message });
//   }
// });


// Add this route in your backend's index.ts, before the app.listen() call


// in your index.ts backend file

app.post('/upload-metadata', async (req: Request, res: Response) => {
  try {
    const metadata = req.body; 

    if (!metadata) {
      return res.status(400).json({ error: 'Missing metadata JSON body' });
    }

    const options = {
      pinataMetadata: {
        name: metadata.name || 'Song Metadata',
      },
    };

    const result = await pinata.pinJSONToIPFS(metadata, options);
    const { IpfsHash } = result;

    // --- FIX IS HERE ---
    // Use the dedicated gateway from your environment variables
    const gateway = process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud";
    const metadataUrl = `${gateway}/ipfs/${IpfsHash}`;

    return res.json({ success: true, metadataUrl: metadataUrl });

  } catch (err: any) {
    console.error('Metadata upload error:', err);
    return res.status(500).json({ error: err.message });
  }
});
app.get('/metadata', async (req: Request, res: Response) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL query parameter is required' });
    }

    // Use axios to fetch the metadata from the provided URL
    const { data } = await axios.get(url);

    // Send the fetched metadata back to the frontend
    res.json(data);

  } catch (err: any) {
    console.error('Failed to proxy metadata fetch:', err.message);
    res.status(500).json({ error: 'Failed to fetch metadata' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
