import React, { useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { AuthModal } from './components/auth/AuthModal';
import { HomePage } from './pages/HomePage';
import { UploadPage } from './pages/UploadPage';
import { ScriptDetailPage } from './pages/ScriptDetailPage';
import { DashboardPage } from './pages/DashboardPage';
import { AuthorProfilePage } from './pages/AuthorProfilePage';
import { Toaster } from 'react-hot-toast';

export function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <AuthProvider>
      <HashRouter>
        <div className="min-h-screen flex flex-col bg-dark-900 text-slate-100 selection:bg-electric-500 selection:text-dark-900">
          <Navbar onOpenAuthModal={() => setIsAuthModalOpen(true)} />

          <main className="flex-1">
            <Routes>
              <Route
                path="/"
                element={<HomePage onOpenAuthModal={() => setIsAuthModalOpen(true)} />}
              />
              <Route
                path="/upload"
                element={<UploadPage onOpenAuthModal={() => setIsAuthModalOpen(true)} />}
              />
              <Route
                path="/script/:slugOrId"
                element={<ScriptDetailPage onOpenAuthModal={() => setIsAuthModalOpen(true)} />}
              />
              <Route
                path="/dashboard"
                element={<DashboardPage onOpenAuthModal={() => setIsAuthModalOpen(true)} />}
              />
              <Route
                path="/author/:authorId"
                element={<AuthorProfilePage />}
              />
            </Routes>
          </main>

          <Footer />

          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
          />

          <Toaster
            position="bottom-left"
            toastOptions={{
              style: {
                background: '#0F1A2E',
                color: '#fff',
                border: '1px solid rgba(0, 229, 255, 0.3)',
                fontFamily: 'Vazirmatn, sans-serif',
                direction: 'rtl',
                textAlign: 'right',
                borderRadius: '1rem',
                padding: '14px 20px',
              },
            }}
          />
        </div>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
