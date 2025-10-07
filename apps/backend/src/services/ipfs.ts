import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

const PINATA_JWT = process.env.PINATA_JWT;

/**
 * Upload a single file buffer to Pinata IPFS.
 * Returns { cid, url } using pinata.cloud gateway.
 */
export async function uploadFileToIpfs(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<{ cid: string | null; url: string }> {
  if (!PINATA_JWT) {
    // fallback local (dev only)
    const outDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
    const outPath = path.join(outDir, filename);
    fs.writeFileSync(outPath, buffer);
    return { cid: null, url: `file://${outPath}` };
  }

  const formData = new FormData();
  formData.append('file', buffer, { filename, contentType: mimeType });

  const res = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
      ...formData.getHeaders()
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  });

  const cid: string = res.data.IpfsHash;
  return { cid, url: `https://gateway.pinata.cloud/ipfs/${cid}` };
}
