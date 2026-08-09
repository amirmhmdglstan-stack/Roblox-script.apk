import React, { Suspense, lazy, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { AuthModal } from './components/auth/AuthModal';
import { ChatWidget } from './components/chat/ChatWidget';
import { Toaster } from 'react-hot-toast';

// Pages are code-split so mobile devices download only what they need
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const UploadPage = lazy(() => import('./pages/UploadPage').then((m) => ({ default: m.UploadPage })));
const ScriptDetailPage = lazy(() =>
  import('./pages/ScriptDetailPage').then((m) => ({ default: m.ScriptDetailPage }))
);
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const AuthorProfilePage = lazy(() =>
  import('./pages/AuthorProfilePage').then((m) => ({ default: m.AuthorProfilePage }))
);
const ExploitsPage = lazy(() =>
  import('./pages/ExploitsPage').then((m) => ({ default: m.ExploitsPage }))
);
const SearchResultsPage = lazy(() =>
  import('./pages/SearchResultsPage').then((m) => ({ default: m.SearchResultsPage }))
);

// Minimal fullscreen-free loading state for page transitions
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center py-24">
    <div className="w-10 h-10 rounded-full border-2 border-electric-500/30 border-t-electric-500 animate-spin" />
  </div>
);

export function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Tiny version badge (helps troubleshooting which APK build is installed)
  const VERSION = '3.0';
  React.useEffect(() => {
    try {
      const b = document.createElement('div');
      b.style.cssText =
        'position:fixed;top:2px;left:4px;z-index:2147483646;font:10px/1.4 Tahoma,sans-serif;color:rgba(0,229,255,.35);pointer-events:none;direction:ltr;letter-spacing:.5px';
      b.textContent = 'v' + VERSION;
      document.body.appendChild(b);
    } catch (e) {}
  }, []);

  return (
    <AuthProvider>
      <HashRouter>
        <div className="min-h-screen flex flex-col bg-dark-900 text-slate-100 selection:bg-electric-500 selection:text-dark-900">
          <Navbar onOpenAuthModal={() => setIsAuthModalOpen(true)} />

          <main className="flex-1">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/search" element={<SearchResultsPage />} />
                <Route path="/exploits" element={<ExploitsPage />} />
                <Route
                  path="/upload"
                  element={<UploadPage onOpenAuthModal={() => setIsAuthModalOpen(true)} />}
                />
                <Route
                  path="/edit/:scriptId"
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
            </Suspense>
          </main>

          <Footer />

          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
          />

          {/* Floating AI assistant (fixed corner button + chat window) */}
          <ChatWidget />

          <Toaster
            position="bottom-left"
            containerStyle={{ bottom: 84 }}
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
                maxWidth: '92vw',
                whiteSpace: 'pre-line',
              },
            }}
          />
        </div>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
