import { useState, useCallback, useEffect } from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { BottomNav } from './components/Layout/BottomNav';
import { Dashboard } from './pages/Dashboard';
import { Athletes } from './pages/Athletes';
import { Payments } from './pages/Payments';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { useStore } from './store/useStore';
import { useAuthStore } from './store/useAuthStore';
import { useFirestoreSync } from './store/useFirestoreSync';
import { MenuIcon } from './components/ui/Icons';
import logoUrl from './assets/logo-retadoras.png';

type Page = 'dashboard' | 'athletes' | 'payments' | 'transactions' | 'settings';

const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Inicio',
  athletes: 'Atletas',
  payments: 'Mensualidades',
  transactions: 'Movimientos',
  settings: 'Configuración',
};

// ─── Inner app (only rendered when authenticated) ─────────────────────────────

function AppInner() {
  // Start Firestore real-time sync
  useFirestoreSync();

  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const { config, dataLoading } = useStore();

  const navigate = useCallback((page: Page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (dataLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--sp-4)',
        background: 'var(--bg-base)',
      }}>
        <img src={logoUrl} alt="Logo" style={{ width: 56, height: 56, objectFit: 'contain', opacity: 0.9 }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <div style={{
            width: 36,
            height: 36,
            border: '3px solid var(--border)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem', margin: 0 }}>Cargando datos...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={navigate}
      />

      {/* Main content */}
      <main className="main-content">
        {/* Page header */}
        <header className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>


            {/* Mobile logo */}
            <div style={{ display: 'none' }} id="mobile-logo">
              <img src={logoUrl} alt="Logo" style={{ width: 20, height: 20, objectFit: 'contain' }} />
            </div>

            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
              {PAGE_TITLES[currentPage]}
            </h2>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
            {config.nombreAcademia}
          </div>
        </header>

        {/* Page body */}
        <div className="page-body">
          {currentPage === 'dashboard' && <Dashboard onNavigate={navigate} />}
          {currentPage === 'athletes' && <Athletes />}
          {currentPage === 'payments' && <Payments />}
          {currentPage === 'transactions' && <Transactions />}
          {currentPage === 'settings' && <Settings />}
        </div>
      </main>

      {/* Bottom navigation (mobile) */}
      <BottomNav currentPage={currentPage} onNavigate={navigate} />

      {/* Mobile-specific CSS overrides */}
      <style>{`
        @media (max-width: 768px) {
          #mobile-logo { display: flex !important; align-items: center; }
        }
      `}</style>
    </div>
  );
}

// ─── Root App — handles auth state ────────────────────────────────────────────

export default function App() {
  const { user, authLoading, initAuth } = useAuthStore();

  // Subscribe to Firebase Auth state once on mount
  useEffect(() => {
    const unsub = initAuth();
    return unsub;
  }, [initAuth]);

  // Resolving Firebase Auth state
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
      }}>
        <div style={{
          width: 36,
          height: 36,
          border: '3px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not authenticated — show login
  if (!user) {
    return <Login />;
  }

  // Authenticated — show the app
  return <AppInner />;
}
