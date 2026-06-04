import { useStore } from '../../store/useStore';
import { useExchangeRate } from '../../hooks/useExchangeRate';
import { formatRelativa } from '../../utils/format';
import {
  VolleyballIcon, HomeIcon, UsersIcon, CreditCardIcon,
  TrendingIcon, SettingsIcon, RefreshIcon,
} from '../ui/Icons';
import logoUrl from '../../assets/logo-retadoras.png';

type Page = 'dashboard' | 'athletes' | 'payments' | 'transactions' | 'settings';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  open?: boolean;
  onClose?: () => void;
}

const NAV_ITEMS: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard',    label: 'Inicio',        icon: <HomeIcon /> },
  { id: 'athletes',    label: 'Atletas',        icon: <UsersIcon /> },
  { id: 'payments',    label: 'Mensualidades',  icon: <CreditCardIcon /> },
  { id: 'transactions',label: 'Movimientos',    icon: <TrendingIcon /> },
  { id: 'settings',    label: 'Configuración',  icon: <SettingsIcon /> },
];

export function Sidebar({ currentPage, onNavigate, open, onClose }: SidebarProps) {
  const { config } = useStore();
  const { tasa, fechaActualizacion } = useExchangeRate();

  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <img src={logoUrl} alt="Logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
        <div>
          <div className="sidebar-brand-name">{config.nombreAcademia}</div>
          <div className="sidebar-brand-sub">Finanzas</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" aria-label="Navegación principal">
        <div className="sidebar-nav-label">Menú</div>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-item${currentPage === item.id ? ' active' : ''}`}
            onClick={() => { onNavigate(item.id); onClose?.(); }}
            aria-current={currentPage === item.id ? 'page' : undefined}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {/* Footer – Tasa BCV */}
      <div className="sidebar-footer">
        <div style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', marginBottom: '6px' }}>
          Tasa BCV
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--accent)' }}>
            {tasa.toFixed(2)} Bs/$
          </span>
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--ink-muted)', marginTop: '4px' }}>
          <RefreshIcon size={10} /> Actualizada {formatRelativa(fechaActualizacion)}
        </div>
      </div>
    </aside>
  );
}
