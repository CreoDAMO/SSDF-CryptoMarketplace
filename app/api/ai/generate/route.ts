import { NextRequest, NextResponse } from 'next/server';
import PinataSDK from '@pinata/sdk';

const pinata = new PinataSDK({ 
  pinataApiKey: process.env.IPFS_API_KEY, 
  pinataSecretApiKey: process.env.IPFS_SECRET_KEY 
});

export async function POST(req: NextRequest) {
  const metadata = await req.json();
  try {
    const result = await pinata.pinJSONToIPFS(metadata);
    const ipfsUri = `ipfs://${result.IpfsHash}`;
    return NextResponse.json({ ipfsUri });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
