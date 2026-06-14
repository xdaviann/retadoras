import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useToast } from '../hooks/useToast';
import { useExchangeRate } from '../hooks/useExchangeRate';
import { formatBs, formatUSD, formatFecha, bsToUsd, usdToBs } from '../utils/format';
import { Modal } from '../components/ui/Modal';
import { ToastContainer } from '../components/ui/Toast';
import { PlusIcon, SearchIcon, TrashIcon, TrendingIcon } from '../components/ui/Icons';
import { METODOS_PAGO } from '../types';
import type { MetodoPago, TipoMovimiento, MonedaMovimiento } from '../types';

type MovForm = {
  tipo: TipoMovimiento;
  categoriaId: string;
  descripcion: string;
  montoInput: string;
  moneda: MonedaMovimiento;
  metodoPago: MetodoPago;
  referencia: string;
  fecha: string;
  notas: string;
};

const emptyForm = (): MovForm => ({
  tipo: 'ingreso',
  categoriaId: '',
  descripcion: '',
  montoInput: '',
  moneda: 'bs',
  metodoPago: 'efectivo_bs',
  referencia: '',
  fecha: new Date().toISOString().split('T')[0],
  notas: '',
});

export function Transactions() {
  const { movimientos, categoriasMovimientos, addMovimiento, deleteMovimiento, isSubmitting } = useStore();
  const { tasa } = useExchangeRate();
  const { toasts, addToast, removeToast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<MovForm>(emptyForm());
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof MovForm, string>>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Filters
  const [filterTipo, setFilterTipo] = useState<TipoMovimiento | 'todos'>('todos');
  const [filterCat, setFilterCat] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterFechaDesde, setFilterFechaDesde] = useState('');
  const [filterFechaHasta, setFilterFechaHasta] = useState('');

  const categoriasIngreso = categoriasMovimientos.filter((c) => c.tipo === 'ingreso');
  const categoriasGasto = categoriasMovimientos.filter((c) => c.tipo === 'gasto');
  const categoriasActuales = form.tipo === 'ingreso' ? categoriasIngreso : categoriasGasto;

  const montoPreview = useMemo(() => {
    const v = parseFloat(form.montoInput);
    if (isNaN(v) || v <= 0) return null;
    if (form.moneda === 'usd') return { bs: usdToBs(v, tasa), usd: v };
    return { bs: v, usd: bsToUsd(v, tasa) };
  }, [form.montoInput, form.moneda, tasa]);

  const filtered = useMemo(() => {
    return movimientos.filter((m) => {
      const cat = categoriasMovimientos.find((c) => c.id === m.categoriaId);
      const matchTipo = filterTipo === 'todos' || m.tipo === filterTipo;
      const matchCat = !filterCat || m.categoriaId === filterCat;
      const q = filterSearch.toLowerCase();
      const matchSearch = !q || m.descripcion.toLowerCase().includes(q) || (cat?.nombre.toLowerCase().includes(q) ?? false);
      const matchDesde = !filterFechaDesde || m.fecha >= filterFechaDesde;
      const matchHasta = !filterFechaHasta || m.fecha <= filterFechaHasta + 'T23:59:59';
      return matchTipo && matchCat && matchSearch && matchDesde && matchHasta;
    });
  }, [movimientos, categoriasMovimientos, filterTipo, filterCat, filterSearch, filterFechaDesde, filterFechaHasta]);

  const resumen = useMemo(() => {
    const ingresos = filtered.filter((m) => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
    const gastos = filtered.filter((m) => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0);
    return { ingresos, gastos, balance: ingresos - gastos };
  }, [filtered]);

  function validate(): boolean {
    const errs: Partial<Record<keyof MovForm, string>> = {};
    if (!form.categoriaId) errs.categoriaId = 'Selecciona una categoría';
    if (!form.descripcion.trim()) errs.descripcion = 'La descripción es requerida';
    const v = parseFloat(form.montoInput);
    if (isNaN(v) || v <= 0) errs.montoInput = 'Ingresa un monto válido';
    if (form.metodoPago === 'pago_movil' && !form.referencia.trim()) {
      errs.referencia = 'El número de referencia es requerido para Pago Móvil';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    if (isSubmitting) return;
    const v = parseFloat(form.montoInput);
    const montoBs = form.moneda === 'usd' ? usdToBs(v, tasa) : v;
    const montoDolar = form.moneda === 'usd' ? v : undefined;

    let metodoPago: MetodoPago = form.metodoPago;
    if (form.moneda === 'usd') metodoPago = 'efectivo_usd';
    if (form.moneda === 'bs' && form.metodoPago === 'efectivo_usd') metodoPago = 'efectivo_bs';

    setShowModal(false);
    setForm(emptyForm());
    setFormErrors({});

    addMovimiento({
      tipo: form.tipo,
      categoriaId: form.categoriaId,
      descripcion: form.descripcion,
      monto: montoBs,
      montoDolar,
      moneda: form.moneda,
      metodoPago,
      referencia: form.referencia || undefined,
      tasaCambio: tasa,
      fecha: new Date(form.fecha + 'T12:00:00').toISOString(),
      notas: form.notas || undefined,
    })
      .then(() => addToast(`${form.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'} registrado correctamente`))
      .catch((err) => { console.error(err); addToast('Error al registrar movimiento', 'error'); });
  }

  function openModal(tipo: TipoMovimiento = 'ingreso') {
    setForm({ ...emptyForm(), tipo });
    setFormErrors({});
    setShowModal(true);
  }

  function f(field: keyof MovForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => {
        const val = e.target.value;
        let next = { ...prev, [field]: val };
        if (field === 'tipo') {
          next.categoriaId = '';
        }
        if (field === 'moneda') {
          if (val === 'usd') next.metodoPago = 'efectivo_usd';
          if (val === 'bs' && prev.metodoPago === 'efectivo_usd') next.metodoPago = 'efectivo_bs';
        }
        return next;
      });
      if (formErrors[field]) setFormErrors((pr) => ({ ...pr, [field]: undefined }));
    };
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>Movimientos</h1>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>Ingresos y gastos generales</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
          <button className="btn btn-ghost" onClick={() => openModal('gasto')} id="btn-add-expense" style={{ color: 'var(--red)', borderColor: 'var(--red-muted)' }}>
            <PlusIcon size={16} />
            Gasto
          </button>
          <button className="btn btn-primary" onClick={() => openModal('ingreso')} id="btn-add-income">
            <PlusIcon size={16} />
            Ingreso
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-input-wrap">
          <SearchIcon />
          <input className="form-input" type="search" placeholder="Buscar descripción..." value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 'auto', minWidth: 120 }} value={filterTipo} onChange={(e) => { setFilterTipo(e.target.value as TipoMovimiento | 'todos'); setFilterCat(''); }}>
          <option value="todos">Todos</option>
          <option value="ingreso">Ingresos</option>
          <option value="gasto">Gastos</option>
        </select>
        <select className="form-select" style={{ width: 'auto', minWidth: 160 }} value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categoriasMovimientos
            .filter((c) => filterTipo === 'todos' || c.tipo === filterTipo)
            .map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <input type="date" className="form-input" style={{ width: 'auto' }} value={filterFechaDesde} onChange={(e) => setFilterFechaDesde(e.target.value)} placeholder="Desde" title="Desde" />
        <input type="date" className="form-input" style={{ width: 'auto' }} value={filterFechaHasta} onChange={(e) => setFilterFechaHasta(e.target.value)} placeholder="Hasta" title="Hasta" />
      </div>

      {/* Summary strip */}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)', flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--accent-muted)', border: '1px solid oklch(0.30 0.07 160)', borderRadius: 'var(--r-md)', padding: 'var(--sp-2) var(--sp-4)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>Ingresos </span>
            <span style={{ fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>{formatBs(resumen.ingresos)}</span>
          </div>
          <div style={{ background: 'var(--red-muted)', border: '1px solid oklch(0.28 0.08 25)', borderRadius: 'var(--r-md)', padding: 'var(--sp-2) var(--sp-4)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>Gastos </span>
            <span style={{ fontWeight: 700, color: 'var(--red)', fontFamily: 'var(--font-display)' }}>{formatBs(resumen.gastos)}</span>
          </div>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 'var(--sp-2) var(--sp-4)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>Balance </span>
            <span style={{ fontWeight: 700, color: resumen.balance >= 0 ? 'var(--accent)' : 'var(--red)', fontFamily: 'var(--font-display)' }}>{formatBs(resumen.balance)}</span>
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <TrendingIcon size={48} />
          <h3>Sin movimientos</h3>
          <p>No hay registros que coincidan con los filtros aplicados.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Categoría</th>
                <th>Método</th>
                <th>Monto Bs.</th>
                <th>Equiv. USD</th>
                <th>Fecha</th>
                <th style={{ textAlign: 'right' }}>Acc.</th>
              </tr>
            </thead>
            <tbody className="stagger-list">
              {filtered
                .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                .map((mov) => {
                  const cat = categoriasMovimientos.find((c) => c.id === mov.categoriaId);
                  const usdEq = bsToUsd(mov.monto, mov.tasaCambio);
                  return (
                    <tr key={mov.id}>
                      <td data-label="Tipo">
                        <span className={`badge ${mov.tipo === 'ingreso' ? 'badge-green' : 'badge-red'}`}>
                          {mov.tipo === 'ingreso' ? '↑ Ingreso' : '↓ Gasto'}
                        </span>
                      </td>
                      <td data-label="Descripción">
                        <div style={{ fontWeight: 500 }}>{mov.descripcion}</div>
                        {mov.notas && <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>{mov.notas}</div>}
                      </td>
                      <td data-label="Categoría" style={{ color: 'var(--ink-secondary)', fontSize: '0.85rem' }}>{cat?.nombre ?? '—'}</td>
                      <td data-label="Método">
                        <span className={`badge ${mov.metodoPago === 'pago_movil' ? 'badge-blue' : mov.metodoPago === 'efectivo_usd' ? 'badge-yellow' : 'badge-gray'}`}>
                          {METODOS_PAGO[mov.metodoPago]}
                        </span>
                      </td>
                      <td data-label="Monto Bs.">
                        <span className="amount-bs" style={{ color: mov.tipo === 'ingreso' ? 'var(--accent)' : 'var(--red)' }}>
                          {mov.tipo === 'ingreso' ? '+' : '-'}{formatBs(mov.monto)}
                        </span>
                        {mov.montoDolar && (
                          <div className="amount-usd">{formatUSD(mov.montoDolar)} pagado</div>
                        )}
                      </td>
                      <td data-label="Equiv. USD" className="amount-usd">{formatUSD(usdEq)}</td>
                      <td data-label="Fecha" style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>{formatFecha(mov.fecha)}</td>
                      <td data-label="Acc.">
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-icon btn-danger"
                            onClick={() => setConfirmDelete(mov.id)}
                            aria-label="Eliminar movimiento"
                            data-tooltip="Eliminar"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <Modal
          title={form.tipo === 'ingreso' ? 'Registrar ingreso' : 'Registrar gasto'}
          onClose={() => { setShowModal(false); setFormErrors({}); }}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => { setShowModal(false); setFormErrors({}); }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSubmit} id="btn-save-transaction">
                {form.tipo === 'ingreso' ? 'Registrar ingreso' : 'Registrar gasto'}
              </button>
            </>
          }
        >
          {/* Tipo toggle */}
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <div style={{ display: 'flex', borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
              {(['ingreso', 'gasto'] as TipoMovimiento[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, tipo: t, categoriaId: '' }))}
                  style={{ flex: 1, padding: 'var(--sp-2) var(--sp-3)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', transition: 'all 0.15s', background: form.tipo === t ? (t === 'ingreso' ? 'var(--accent)' : 'var(--red)') : 'var(--bg-elevated)', color: form.tipo === t ? 'oklch(0.10 0.018 260)' : 'var(--ink-muted)' }}
                >
                  {t === 'ingreso' ? '↑ Ingreso' : '↓ Gasto'}
                </button>
              ))}
            </div>
          </div>

          {/* Categoría */}
          <div className="form-group">
            <label className="form-label" htmlFor="mov-cat">Categoría *</label>
            <select id="mov-cat" className="form-select" value={form.categoriaId} onChange={f('categoriaId')}>
              <option value="">Seleccionar categoría...</option>
              {categoriasActuales.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            {formErrors.categoriaId && <span className="form-error">{formErrors.categoriaId}</span>}
          </div>

          {/* Descripción */}
          <div className="form-group">
            <label className="form-label" htmlFor="mov-desc">Descripción *</label>
            <input id="mov-desc" className="form-input" value={form.descripcion} onChange={f('descripcion')} placeholder="Ej: Pago alquiler cancha mayo..." />
            {formErrors.descripcion && <span className="form-error">{formErrors.descripcion}</span>}
          </div>

          {/* Moneda */}
          <div className="form-group">
            <label className="form-label">Moneda</label>
            <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
              {(['bs', 'usd'] as MonedaMovimiento[]).map((m) => (
                <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', cursor: 'pointer', flex: 1, background: form.moneda === m ? 'var(--accent-muted)' : 'var(--bg-elevated)', border: `1px solid ${form.moneda === m ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--r-md)', padding: 'var(--sp-3)', transition: 'all 0.15s' }}>
                  <input type="radio" name="mov-moneda" value={m} checked={form.moneda === m} onChange={f('moneda')} style={{ accentColor: 'var(--accent)' }} />
                  <span style={{ fontWeight: 600, color: form.moneda === m ? 'var(--accent)' : 'var(--ink-secondary)' }}>
                    {m === 'bs' ? 'Bolívares' : 'Dólares'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Método */}
          <div className="form-group">
            <label className="form-label" htmlFor="mov-metodo">Método de pago</label>
            <select id="mov-metodo" className="form-select" value={form.metodoPago} onChange={f('metodoPago')} disabled={form.moneda === 'usd'}>
              {form.moneda === 'usd' ? (
                <option value="efectivo_usd">Efectivo USD</option>
              ) : (
                <>
                  <option value="efectivo_bs">Efectivo Bs.</option>
                  <option value="pago_movil">Pago Móvil Bs.</option>
                  <option value="punto_venta">Tarjeta de Débito</option>
                </>
              )}
            </select>
          </div>

          {/* Monto */}
          <div className="form-group">
            <label className="form-label" htmlFor="mov-monto">
              Monto en {form.moneda === 'usd' ? 'USD' : 'Bs.'} *
            </label>
            <input id="mov-monto" type="number" step="0.01" min="0" className="form-input" value={form.montoInput} onChange={f('montoInput')} placeholder="0.00" />
            {formErrors.montoInput && <span className="form-error">{formErrors.montoInput}</span>}
            {montoPreview && (
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--r-md)', padding: 'var(--sp-3)', marginTop: 'var(--sp-2)', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ink-muted)' }}>Tasa: {tasa.toFixed(2)} Bs/$</span>
                {form.moneda === 'usd'
                  ? <span style={{ color: 'var(--accent)', fontWeight: 600 }}>= {formatBs(montoPreview.bs)}</span>
                  : <span style={{ color: 'var(--ink-secondary)', fontWeight: 600 }}>≈ {formatUSD(montoPreview.usd)}</span>}
              </div>
            )}
          </div>

          {/* Referencia */}
          {form.metodoPago === 'pago_movil' && (
            <div className="form-group">
              <label className="form-label" htmlFor="mov-ref">Número de referencia *</label>
              <input id="mov-ref" className="form-input" value={form.referencia} onChange={f('referencia')} placeholder="Ej: 00123456789" />
              {formErrors.referencia && <span className="form-error">{formErrors.referencia}</span>}
            </div>
          )}

          {/* Fecha */}
          <div className="form-group">
            <label className="form-label" htmlFor="mov-fecha">Fecha</label>
            <input id="mov-fecha" type="date" className="form-input" value={form.fecha} onChange={f('fecha')} />
          </div>

          {/* Notas */}
          <div className="form-group">
            <label className="form-label" htmlFor="mov-notas">Notas</label>
            <textarea id="mov-notas" className="form-textarea" value={form.notas} onChange={f('notas')} placeholder="Observaciones..." style={{ minHeight: 60 }} />
          </div>
        </Modal>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <Modal
          title="Eliminar movimiento"
          onClose={() => setConfirmDelete(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => { deleteMovimiento(confirmDelete); setConfirmDelete(null); addToast('Movimiento eliminado', 'error'); }}>
                Eliminar movimiento
              </button>
            </>
          }
        >
          <p style={{ color: 'var(--ink-primary)' }}>¿Eliminar este movimiento? Esta acción no se puede deshacer.</p>
        </Modal>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
