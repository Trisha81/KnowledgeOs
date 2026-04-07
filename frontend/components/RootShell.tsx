'use client';

import { usePathname } from 'next/navigation';
import AuthProvider from './AuthProvider';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import Footer from './Footer';

const AUTH_ROUTES = ['/login', '/register'];

export default function RootShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_ROUTES.some((r) => pathname?.startsWith(r));

  if (isAuthPage) {
    // Auth pages: full-screen, no sidebar/navbar
    return (
      <AuthProvider>
        {children}
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Navbar />
          <main className="page-body">
            {children}
          </main>
          <Footer />
        </div>
      </div>
    </AuthProvider>
  );
}
