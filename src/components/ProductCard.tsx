// src/components/ProductCard.tsx
import Link from 'next/link';

type ProductProps = {
  product: {
    _id: string;
    title: string;
    description: string;
    price: number;
    currency: string;
    images: string[];
    type: string;
    status: string;
  };
};

export default function ProductCard({ product }: ProductProps) {
  const handleBuy = async () => {
    // Redirect to checkout or handle directly
    window.location.href = `/checkout?productId=${product._id}`;
  };

  return (
    <div className="border p-4 rounded bg-[#1a1a2e] text-white">
      {product.images[0] && <img src={product.images[0]} alt={product.title} className="w-full h-48 object-cover mb-2 rounded" />}
      <h3 className="font-semibold text-lg">{product.title}</h3>
      <p className="text-sm opacity-80 mb-2">{product.description.slice(0, 100)}...</p>
      <div className="flex justify-between items-center mt-auto">
        <p className="font-bold text-blue-400">{(Number(BigInt(product.priceUSDC)) / 1000000).toFixed(2)} {product.currency}</p>
        <button 
          onClick={handleBuy}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-1 rounded text-sm transition-colors"
        >
          Buy Now
        </button>
      </div>
      <div className="mt-2 flex gap-2">
        <span className="text-[10px] uppercase bg-gray-700 px-2 py-0.5 rounded">Type: {product.type.replace('-', ' ')}</span>
        <span className="text-[10px] uppercase bg-gray-700 px-2 py-0.5 rounded">Status: {product.status}</span>
      </div>
    </div>
  );
}
