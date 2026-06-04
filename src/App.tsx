import { useState, useCallback } from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { BottomNav } from './components/Layout/BottomNav';
import { Dashboard } from './pages/Dashboard';
import { Athletes } from './pages/Athletes';
import { Payments } from './pages/Payments';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { useStore } from './store/useStore';
import { MenuIcon, VolleyballIcon } from './components/ui/Icons';

type Page = 'dashboard' | 'athletes' | 'payments' | 'transactions' | 'settings';

const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Inicio',
  athletes: 'Atletas',
  payments: 'Mensualidades',
  transactions: 'Movimientos',
  settings: 'Configuración',
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { config } = useStore();

  const navigate = useCallback((page: Page) => {
    setCurrentPage(page);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="app-layout">
      {/* Sidebar overlay (mobile) */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={navigate}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <main className="main-content">
        {/* Page header */}
        <header className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
            {/* Mobile menu button */}
            <button
              className="btn btn-icon btn-ghost"
              style={{ display: 'none' }}
              id="mobile-menu-btn"
              onClick={() => setSidebarOpen((o) => !o)}
              aria-label="Abrir menú"
              aria-expanded={sidebarOpen}
            >
              <MenuIcon />
            </button>

            {/* Mobile logo */}
            <div style={{ display: 'none' }} id="mobile-logo">
              <img src="/logo-retadoras.png" alt="Logo" style={{ width: 20, height: 20, objectFit: 'contain' }} />
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

      {/* Mobile-specific CSS overrides embedded via style tag for the header */}
      <style>{`
        @media (max-width: 768px) {
          #mobile-menu-btn { display: flex !important; }
          #mobile-logo { display: flex !important; align-items: center; }
        }
      `}</style>
    </div>
  );
}
