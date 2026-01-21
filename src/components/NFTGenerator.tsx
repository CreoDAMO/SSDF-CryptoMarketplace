// /components/NFTGenerator.tsx
import { useState } from 'react';
import Replicate from 'replicate-js'; // Or Hugging Face API

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

export function NFTGenerator({ onGenerated }: { onGenerated: (uri: string) => void }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      // AI image generation (Instamint pattern)
      const output = await replicate.run("stability-ai/stable-diffusion:ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4", {
        input: { prompt },
      });
      const imageUrl = output[0]; // Assume first output is image URL

      // Upload metadata to IPFS
      const metadata = { name: 'AI NFT', description: prompt, image: imageUrl };
      const response = await fetch('/api/ai/generate', { // Call your API for IPFS
        method: 'POST',
        body: JSON.stringify(metadata),
      });
      const { ipfsUri } = await response.json();
      onGenerated(ipfsUri); // Pass to product form
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe your NFT..." />
      <button onClick={handleGenerate} disabled={loading}>{loading ? 'Generating...' : 'Generate AI NFT'}</button>
    </>
  );
}
