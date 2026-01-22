import './globals.css';

export const metadata = {
  title: 'SSDF Crypto Marketplace',
  description: 'Atomic fulfillment for crypto transactions with escrow and NFT receipts',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
