import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import Providers from './providers';

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
    <ClerkProvider>
      <html lang="en">
        <body>
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
