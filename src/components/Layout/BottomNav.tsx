import { HomeIcon, UsersIcon, CreditCardIcon, TrendingIcon, SettingsIcon } from '../ui/Icons';

type Page = 'dashboard' | 'athletes' | 'payments' | 'transactions' | 'settings';

interface BottomNavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const NAV_ITEMS: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard',    label: 'Inicio',   icon: <HomeIcon size={20} /> },
  { id: 'athletes',    label: 'Atletas',  icon: <UsersIcon size={20} /> },
  { id: 'payments',    label: 'Pagos',    icon: <CreditCardIcon size={20} /> },
  { id: 'transactions',label: 'Movim.',   icon: <TrendingIcon size={20} /> },
  { id: 'settings',    label: 'Config.',  icon: <SettingsIcon size={20} /> },
];

export function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      <div className="bottom-nav-items">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`bottom-nav-item${currentPage === item.id ? ' active' : ''}`}
            onClick={() => onNavigate(item.id)}
            aria-current={currentPage === item.id ? 'page' : undefined}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
