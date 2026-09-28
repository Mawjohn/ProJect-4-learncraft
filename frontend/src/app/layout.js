import { Providers } from './providers';
import './globals.css';

export const metadata = {
  title: 'LearnCraft',
  description: 'AI Educational Games Platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}