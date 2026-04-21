import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'Skolium — Plataforma educativa',
  description: 'Gestión integral de clases, alumnos, pagos y clases en directo',
  icons: { icon: '/logo.svg' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="bg-paper min-h-screen antialiased">
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: '#1c1b18', color: '#f6f6f5', fontSize: 14 },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
