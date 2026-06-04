import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useExchangeRate } from '../hooks/useExchangeRate';
import { formatBs, formatUSD, getMesNombre, getCurrentMonthYear, bsToUsd } from '../utils/format';
import { TrendingIcon, UsersIcon, CreditCardIcon, DollarIcon } from '../components/ui/Icons';

interface DashboardProps {
  onNavigate: (page: 'athletes' | 'payments' | 'transactions' | 'settings') => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { atletas, pagos, movimientos, config, setAthletesFilterPayment } = useStore();
  const { tasa } = useExchangeRate();
  const { mes, anio } = getCurrentMonthYear();

  const stats = useMemo(() => {
    // Current month payments (mensualidades)
    const pagosMes = pagos.filter((p) => p.mes === mes && p.anio === anio);
    const ingresosMensualidades = pagosMes.reduce((s, p) => s + p.monto, 0);

    // Current month movements
    const movsMes = movimientos.filter((m) => {
      const d = new Date(m.fecha);
      return d.getMonth() + 1 === mes && d.getFullYear() === anio;
    });
    const ingresosOtros = movsMes.filter((m) => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
    const gastos = movsMes.filter((m) => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0);

    const totalIngresos = ingresosMensualidades + ingresosOtros;
    const balance = totalIngresos - gastos;

    // Athletes
    const atletasActivas = atletas.filter((a) => a.activa);
    const atletasPendientes = atletasActivas.filter(
      (a) => !pagosMes.some((p) => p.atletaId === a.id)
    );

    // Last 6 months chart data
    const chartData = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(anio, mes - 1 - (5 - i));
      const m2 = d.getMonth() + 1;
      const y2 = d.getFullYear();
      const pagosM = pagos.filter((p) => p.mes === m2 && p.anio === y2);
      const ing = pagosM.reduce((s, p) => s + p.monto, 0);
      const movsM = movimientos.filter((mv) => {
        const dd = new Date(mv.fecha);
        return dd.getMonth() + 1 === m2 && dd.getFullYear() === y2;
      });
      const ingOtros = movsM.filter((mv) => mv.tipo === 'ingreso').reduce((s, mv) => s + mv.monto, 0);
      const gas = movsM.filter((mv) => mv.tipo === 'gasto').reduce((s, mv) => s + mv.monto, 0);
      return { label: getMesNombre(m2).slice(0, 3), ingresos: ing + ingOtros, gastos: gas };
    });

    return { ingresosMensualidades, ingresosOtros, gastos, totalIngresos, balance, atletasActivas, atletasPendientes, chartData };
  }, [atletas, pagos, movimientos, mes, anio]);

  const maxChart = Math.max(...stats.chartData.map((d) => Math.max(d.ingresos, d.gastos)), 1);

  return (
    <div>
      {/* Page title */}
      <div className="section-header" style={{ marginBottom: 'var(--sp-6)' }}>
        <div>
          <h1 style={{ marginBottom: '4px' }}>Resumen</h1>
          <p style={{ fontSize: '0.85rem', margin: 0 }}>
            {getMesNombre(mes)} {anio}
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon green">
            <TrendingIcon size={18} up={true} />
          </div>
          <div className="kpi-label">Ingresos del mes</div>
          <div className="kpi-value">{formatBs(stats.totalIngresos)}</div>
          <div className="kpi-sub">{formatUSD(bsToUsd(stats.totalIngresos, tasa))} USD</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon red">
            <TrendingIcon size={18} up={false} />
          </div>
          <div className="kpi-label">Gastos del mes</div>
          <div className="kpi-value">{formatBs(stats.gastos)}</div>
          <div className="kpi-sub">{formatUSD(bsToUsd(stats.gastos, tasa))} USD</div>
        </div>

        <div className="kpi-card">
          <div className={`kpi-icon ${stats.balance >= 0 ? 'green' : 'red'}`}>
            <DollarIcon size={18} />
          </div>
          <div className="kpi-label">Balance</div>
          <div className="kpi-value" style={{ color: stats.balance >= 0 ? 'var(--accent)' : 'var(--red)' }}>
            {formatBs(stats.balance)}
          </div>
          <div className="kpi-sub">{formatUSD(bsToUsd(Math.abs(stats.balance), tasa))} USD</div>
        </div>

        <div className="kpi-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('athletes')}>
          <div className="kpi-icon blue">
            <UsersIcon size={18} />
          </div>
          <div className="kpi-label">Atletas activas</div>
          <div className="kpi-value">{stats.atletasActivas.length}</div>
          <div className="kpi-sub" style={{ color: stats.atletasPendientes.length > 0 ? 'var(--yellow)' : 'var(--ink-muted)' }}>
            {stats.atletasPendientes.length > 0
              ? `${stats.atletasPendientes.length} con pago pendiente`
              : 'Todas al día'}
          </div>
        </div>
      </div>

      {/* Two column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--sp-5)' }}>

        {/* Chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Últimos 6 meses</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            <div style={{ display: 'flex', gap: 'var(--sp-4)', fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)', display: 'inline-block' }} /> Ingresos
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--red)', display: 'inline-block' }} /> Gastos
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: 100 }}>
              {stats.chartData.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '2px', width: '100%' }}>
                    <div
                      style={{
                        flex: 1,
                        height: `${(d.ingresos / maxChart) * 100}%`,
                        background: 'var(--accent)',
                        opacity: 0.8,
                        borderRadius: '3px 3px 0 0',
                        minHeight: d.ingresos > 0 ? 2 : 0,
                        transition: 'height 0.5s cubic-bezier(0.16,1,0.3,1)',
                      }}
                    />
                    <div
                      style={{
                        flex: 1,
                        height: `${(d.gastos / maxChart) * 100}%`,
                        background: 'var(--red)',
                        opacity: 0.75,
                        borderRadius: '3px 3px 0 0',
                        minHeight: d.gastos > 0 ? 2 : 0,
                        transition: 'height 0.5s cubic-bezier(0.16,1,0.3,1)',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.6rem', color: 'var(--ink-muted)' }}>{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pending payments */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Pagos pendientes</span>
            <button className="btn btn-ghost btn-sm" onClick={() => {
              setAthletesFilterPayment('deudoras');
              onNavigate('athletes');
            }}>
              Ver todos
            </button>
          </div>
          {stats.atletasPendientes.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--sp-8)' }}>
              <CreditCardIcon size={32} />
              <p style={{ textAlign: 'center' }}>Todas las atletas están al día</p>
            </div>
          ) : (
            <div className="pending-list stagger-list">
              {stats.atletasPendientes.slice(0, 6).map((atleta) => (
                <div key={atleta.id} className="pending-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                    <div className="avatar">
                      {atleta.nombre.charAt(0)}{atleta.apellido.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        {atleta.nombre} {atleta.apellido}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
                        {atleta.categoria}
                      </div>
                    </div>
                  </div>
                  <span className="badge badge-yellow">Pendiente</span>
                </div>
              ))}
              {stats.atletasPendientes.length > 6 && (
                <p style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', textAlign: 'center', margin: '4px 0' }}>
                  +{stats.atletasPendientes.length - 6} más
                </p>
              )}
            </div>
          )}
        </div>

        {/* Monthly breakdown */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Desglose del mes</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            {[
              { label: 'Mensualidades', value: stats.ingresosMensualidades, color: 'var(--accent)' },
              { label: 'Otros ingresos', value: stats.ingresosOtros, color: 'var(--blue)' },
              { label: 'Gastos', value: stats.gastos, color: 'var(--red)' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--sp-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--ink-secondary)' }}>{item.label}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.9rem' }}>
                  {formatBs(item.value)}
                </span>
              </div>
            ))}
            <div className="divider" style={{ margin: 'var(--sp-2) 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Balance</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: stats.balance >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                {formatBs(stats.balance)}
              </span>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Acciones rápidas</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            <button className="btn btn-primary" onClick={() => onNavigate('payments')} style={{ justifyContent: 'flex-start' }}>
              <CreditCardIcon size={16} />
              Registrar pago de mensualidad
            </button>
            <button className="btn btn-ghost" onClick={() => onNavigate('athletes')} style={{ justifyContent: 'flex-start' }}>
              <UsersIcon size={16} />
              Agregar atleta
            </button>
            <button className="btn btn-ghost" onClick={() => onNavigate('transactions')} style={{ justifyContent: 'flex-start' }}>
              <TrendingIcon size={16} />
              Registrar movimiento
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
