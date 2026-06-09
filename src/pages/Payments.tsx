import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useToast } from '../hooks/useToast';
import { useExchangeRate } from '../hooks/useExchangeRate';
import { formatBs, formatUSD, formatFecha, getMesNombre, getCurrentMonthYear, usdToBs, bsToUsd } from '../utils/format';
import { Modal } from '../components/ui/Modal';
import { ToastContainer } from '../components/ui/Toast';
import { PlusIcon, SearchIcon, TrashIcon, CreditCardIcon } from '../components/ui/Icons';
import { METODOS_PAGO, MESES } from '../types';
import type { MetodoPago, Pago } from '../types';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 4 }, (_, i) => CURRENT_YEAR - 1 + i);

type PaymentForm = {
  atletaId: string;
  mesesSeleccionados: { mes: number; anio: number }[];
  isExonerado: boolean;
  montoInput: string;       // Raw input
  moneda: 'bs' | 'usd';
  metodoPago: MetodoPago;
  referencia: string;
  notas: string;
};

const emptyForm = (): PaymentForm => ({
  atletaId: '',
  mesesSeleccionados: [],
  isExonerado: false,
  montoInput: '',
  moneda: 'bs',
  metodoPago: 'efectivo_bs',
  referencia: '',
  notas: '',
});

export function Payments() {
  const { atletas, pagos, config, addPagos, deletePago, isSubmitting } = useStore();
  const { tasa } = useExchangeRate();
  const { toasts, addToast, removeToast } = useToast();
  const { mes, anio } = getCurrentMonthYear();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<PaymentForm>(emptyForm());
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof PaymentForm | 'mesesSeleccionados', string>>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [atletaSearch, setAtletaSearch] = useState('');
  const [isAtletaDropdownOpen, setIsAtletaDropdownOpen] = useState(false);

  // Filters
  const [filterAtleta, setFilterAtleta] = useState('');
  const [filterMes, setFilterMes] = useState<number | 'todos'>('todos');
  const [filterAnio, setFilterAnio] = useState(anio);
  const [filterMetodo, setFilterMetodo] = useState<MetodoPago | 'todos'>('todos');

  const atletasActivas = atletas.filter((a) => a.activa).sort((a, b) => a.nombre.localeCompare(b.nombre) || a.apellido.localeCompare(b.apellido));

  // Monto conversion preview
  const montoPreview = useMemo(() => {
    const v = parseFloat(form.montoInput);
    if (isNaN(v) || v <= 0) return null;
    if (form.moneda === 'usd') {
      const bs = usdToBs(v, tasa);
      return { bs, usd: v };
    }
    return { bs: v, usd: bsToUsd(v, tasa) };
  }, [form.montoInput, form.moneda, tasa]);

  const filtered = useMemo(() => {
    return pagos.filter((p) => {
      const atleta = atletas.find((a) => a.id === p.atletaId);
      const q = filterAtleta.toLowerCase();
      const matchAtleta =
        !q ||
        (atleta && `${atleta.nombre} ${atleta.apellido}`.toLowerCase().includes(q));
      const matchMes = filterMes === 'todos' || p.mes === filterMes;
      const matchAnio = p.anio === filterAnio;
      const matchMetodo = filterMetodo === 'todos' || p.metodoPago === filterMetodo;
      return matchAtleta && matchMes && matchAnio && matchMetodo;
    });
  }, [pagos, atletas, filterAtleta, filterMes, filterAnio, filterMetodo]);

  const totalFiltrado = useMemo(() => filtered.reduce((s, p) => s + p.monto, 0), [filtered]);

  function getMesesPendientes(atletaId: string) {
    if (!atletaId) return [];
    const atleta = atletas.find(a => a.id === atletaId);
    if (!atleta || !atleta.fechaIngreso) return [];
    
    const fecha = new Date(atleta.fechaIngreso);
    const mIngreso = fecha.getMonth() + 1;
    const aIngreso = fecha.getFullYear();
    
    const maxMonths = (anio - aIngreso) * 12 + (mes - mIngreso) + 1;
    
    const pagosAtleta = pagos.filter(p => p.atletaId === atletaId);
    const pagados = new Set(pagosAtleta.map(p => `${p.anio}-${p.mes}`));
    
    const pendientes = [];
    for (let i = 0; i < maxMonths; i++) {
      let m = mIngreso + i;
      let y = aIngreso;
      while (m > 12) { m -= 12; y++; }
      if (!pagados.has(`${y}-${m}`)) {
        pendientes.push({ mes: m, anio: y, label: `${MESES[m-1]} ${y}` });
      }
    }
    
    if (pendientes.length === 0) {
      let nextM = mes + 1;
      let nextY = anio;
      if (nextM > 12) { nextM = 1; nextY++; }
      if (!pagados.has(`${nextY}-${nextM}`)) {
        pendientes.push({ mes: nextM, anio: nextY, label: `${MESES[nextM-1]} ${nextY}` });
      }
      let nextM2 = nextM + 1;
      let nextY2 = nextY;
      if (nextM2 > 12) { nextM2 = 1; nextY2++; }
      if (!pagados.has(`${nextY2}-${nextM2}`)) {
        pendientes.push({ mes: nextM2, anio: nextY2, label: `${MESES[nextM2-1]} ${nextY2}` });
      }
    }
    
    return pendientes;
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof PaymentForm | 'mesesSeleccionados', string>> = {};
    if (!form.atletaId) errs.atletaId = 'Selecciona una atleta';
    if (form.mesesSeleccionados.length === 0) errs.mesesSeleccionados = 'Selecciona al menos un mes';
    
    if (!form.isExonerado) {
      const v = parseFloat(form.montoInput);
      if (isNaN(v) || v <= 0) errs.montoInput = 'Ingresa un monto válido';
      if (form.metodoPago === 'pago_movil' && !form.referencia.trim()) {
        errs.referencia = 'El número de referencia es requerido para Pago Móvil';
      }
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    if (isSubmitting) return;
    
    let montoBs = 0;
    let montoDolar: number | undefined = undefined;
    let metodoPago: MetodoPago = 'exonerado';
    const qty = form.mesesSeleccionados.length;

    if (!form.isExonerado) {
      const v = parseFloat(form.montoInput);
      const totalBs = form.moneda === 'usd' ? usdToBs(v, tasa) : v;
      const totalDolar = form.moneda === 'usd' ? v : undefined;
      
      montoBs = totalBs / qty;
      montoDolar = totalDolar ? totalDolar / qty : undefined;

      metodoPago = form.metodoPago;
      if (form.moneda === 'usd') metodoPago = 'efectivo_usd';
      if (form.moneda === 'bs' && form.metodoPago === 'efectivo_usd') metodoPago = 'efectivo_bs';
    }

    try {
      const pagosToSave = form.mesesSeleccionados.map(m => {
        const payload: Omit<Pago, 'id'> = {
          atletaId: form.atletaId,
          mes: m.mes,
          anio: m.anio,
          monto: montoBs,
          metodoPago,
          tasaCambio: tasa,
          fecha: new Date().toISOString(),
        };
        if (montoDolar !== undefined) payload.montoDolar = montoDolar;
        if (!form.isExonerado && form.referencia) payload.referencia = form.referencia;
        if (form.notas) payload.notas = form.notas;
        return payload;
      });

      setShowModal(false);
      setForm(emptyForm());
      setFormErrors({});

      addPagos(pagosToSave)
        .then(() => addToast(`Pago${qty > 1 ? 's' : ''} registrado${qty > 1 ? 's' : ''} correctamente`))
        .catch((error) => {
          console.error(error);
          addToast('Ocurrió un error al registrar el pago', 'error');
        });
    } catch (error) {
      console.error(error);
      addToast('Ocurrió un error al preparar el pago', 'error');
    }
  }

  function openModal() {
    setForm(emptyForm());
    setFormErrors({});
    setShowModal(true);
  }

  function f(field: keyof PaymentForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => {
        const val = e.target.value;
        let next = { ...prev, [field]: val };
        // Auto-match metodoPago with moneda
        if (field === 'moneda') {
          if (val === 'usd') next.metodoPago = 'efectivo_usd';
          if (val === 'bs' && prev.metodoPago === 'efectivo_usd') next.metodoPago = 'efectivo_bs';
        }
        if (field === 'atletaId') {
          next.mesesSeleccionados = [];
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
          <h1>Mensualidades</h1>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>
            Registro y control de pagos de atletas
          </p>
        </div>
        <button className="btn btn-primary" onClick={openModal} id="btn-add-payment">
          <PlusIcon size={16} />
          Registrar pago
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-input-wrap">
          <SearchIcon />
          <input
            className="form-input"
            type="search"
            placeholder="Buscar atleta..."
            value={filterAtleta}
            onChange={(e) => setFilterAtleta(e.target.value)}
          />
        </div>
        <select className="form-select" style={{ width: 'auto', minWidth: 130 }} value={filterMes} onChange={(e) => setFilterMes(e.target.value === 'todos' ? 'todos' : parseInt(e.target.value))}>
          <option value="todos">Todos los meses</option>
          {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select className="form-select" style={{ width: 'auto', minWidth: 90 }} value={filterAnio} onChange={(e) => setFilterAnio(parseInt(e.target.value))}>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="form-select" style={{ width: 'auto', minWidth: 160 }} value={filterMetodo} onChange={(e) => setFilterMetodo(e.target.value as MetodoPago | 'todos')}>
          <option value="todos">Todos los métodos</option>
          {Object.entries(METODOS_PAGO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Summary */}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', gap: 'var(--sp-4)', marginBottom: 'var(--sp-4)', flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--accent-muted)', border: '1px solid oklch(0.30 0.07 160)', borderRadius: 'var(--r-md)', padding: 'var(--sp-3) var(--sp-4)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>Total filtrado: </span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--accent)' }}>
              {formatBs(totalFiltrado)}
            </span>
          </div>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 'var(--sp-3) var(--sp-4)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>Registros: </span>
            <span style={{ fontWeight: 600 }}>{filtered.length}</span>
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <CreditCardIcon size={48} />
          <h3>Sin pagos registrados</h3>
          <p>No hay pagos que coincidan con los filtros seleccionados.</p>
          <button className="btn btn-primary" onClick={openModal}><PlusIcon size={16} /> Registrar pago</button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Atleta</th>
                <th>Período</th>
                <th>Método</th>
                <th>Monto Bs.</th>
                <th>Equivalente USD</th>
                <th>Referencia</th>
                <th>Fecha</th>
                <th style={{ textAlign: 'right' }}>Acc.</th>
              </tr>
            </thead>
            <tbody className="stagger-list">
              {filtered
                .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                .map((pago) => {
                  const atleta = atletas.find((a) => a.id === pago.atletaId);
                  const usdEq = bsToUsd(pago.monto, pago.tasaCambio);
                  return (
                    <tr key={pago.id}>
                      <td data-label="Atleta">
                        {atleta ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                            <div className="avatar" style={{ width: 28, height: 28, fontSize: '0.7rem' }}>
                              {atleta.nombre.charAt(0)}{atleta.apellido.charAt(0)}
                            </div>
                            <span style={{ fontWeight: 500 }}>{atleta.nombre} {atleta.apellido}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--ink-muted)' }}>Atleta eliminada</span>
                        )}
                      </td>
                      <td data-label="Período" style={{ fontFamily: 'var(--font-display)', fontWeight: 500 }}>
                        {getMesNombre(pago.mes)} {pago.anio}
                      </td>
                      <td data-label="Método">
                        <span className={`badge ${pago.metodoPago === 'pago_movil' ? 'badge-blue' : pago.metodoPago === 'efectivo_usd' ? 'badge-yellow' : 'badge-gray'}`}>
                          {METODOS_PAGO[pago.metodoPago]}
                        </span>
                      </td>
                      <td data-label="Monto Bs.">
                        <span className="amount-bs">{formatBs(pago.monto)}</span>
                        {pago.montoDolar && (
                          <div className="amount-usd">{formatUSD(pago.montoDolar)} pagado</div>
                        )}
                      </td>
                      <td data-label="Equivalente USD" className="amount-usd">{formatUSD(usdEq)}</td>
                      <td data-label="Referencia" style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', fontFamily: 'var(--font-display)' }}>
                        {pago.referencia || '—'}
                      </td>
                      <td data-label="Fecha" style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                        {formatFecha(pago.fecha)}
                      </td>
                      <td data-label="Acc.">
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-icon btn-danger"
                            onClick={() => setConfirmDelete(pago.id)}
                            aria-label="Eliminar pago"
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
          title="Registrar pago de mensualidad"
          onClose={() => { setShowModal(false); setFormErrors({}); }}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => { setShowModal(false); setFormErrors({}); }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSubmit} id="btn-save-payment" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Registrar pago'}</button>
            </>
          }
        >
          {/* Atleta */}
          <div className="form-group">
            <label className="form-label" htmlFor="pago-atleta">Atleta *</label>
            <div style={{ position: 'relative' }}>
              <input
                id="pago-atleta"
                type="text"
                className="form-input"
                placeholder="Buscar atleta por nombre o cédula..."
                value={form.atletaId ? (atletasActivas.find(a => a.id === form.atletaId)?.nombre + ' ' + atletasActivas.find(a => a.id === form.atletaId)?.apellido) : atletaSearch}
                onChange={(e) => {
                  setAtletaSearch(e.target.value);
                  setIsAtletaDropdownOpen(true);
                  if (form.atletaId) {
                    setForm(prev => ({ ...prev, atletaId: '', mesesSeleccionados: [] }));
                  }
                  if (formErrors.atletaId) setFormErrors(prev => ({ ...prev, atletaId: undefined }));
                }}
                onFocus={() => setIsAtletaDropdownOpen(true)}
              />
              {isAtletaDropdownOpen && (
                <>
                  <div 
                    style={{ position: 'fixed', inset: 0, zIndex: 9 }} 
                    onClick={() => setIsAtletaDropdownOpen(false)} 
                  />
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-md)', marginTop: '4px', maxHeight: '200px', overflowY: 'auto', zIndex: 10, boxShadow: 'var(--shadow-lg)' }}>
                    {atletasActivas
                      .filter(a => (a.nombre + ' ' + a.apellido + ' ' + a.cedula).toLowerCase().includes(atletaSearch.toLowerCase()))
                      .map(a => (
                        <div 
                          key={a.id} 
                          style={{ padding: 'var(--sp-2) var(--sp-3)', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                          onClick={() => {
                            setForm(prev => ({ ...prev, atletaId: a.id, mesesSeleccionados: [] }));
                            setAtletaSearch('');
                            setIsAtletaDropdownOpen(false);
                            if (formErrors.atletaId) setFormErrors(prev => ({ ...prev, atletaId: undefined }));
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{ fontWeight: 500, color: 'var(--ink-primary)' }}>{a.nombre} {a.apellido}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>C.I: {a.cedula} · {a.categoria}</div>
                        </div>
                      ))}
                    {atletasActivas.filter(a => (a.nombre + ' ' + a.apellido + ' ' + a.cedula).toLowerCase().includes(atletaSearch.toLowerCase())).length === 0 && (
                      <div style={{ padding: 'var(--sp-3)', textAlign: 'center', color: 'var(--ink-muted)', fontSize: '0.85rem' }}>
                        No se encontraron atletas
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            {formErrors.atletaId && <span className="form-error">{formErrors.atletaId}</span>}
          </div>

          {/* Meses Pendientes */}
          <div className="form-group">
            <label className="form-label">Meses a pagar *</label>
            {!form.atletaId ? (
              <div style={{ padding: 'var(--sp-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--r-md)', color: 'var(--ink-muted)', fontSize: '0.85rem', textAlign: 'center', border: '1px dashed var(--border)' }}>
                Selecciona una atleta para ver sus meses pendientes
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
                {getMesesPendientes(form.atletaId).map((m) => {
                  const isSelected = form.mesesSeleccionados.some(s => s.mes === m.mes && s.anio === m.anio);
                  return (
                    <button
                      key={`${m.anio}-${m.mes}`}
                      type="button"
                      onClick={() => {
                        setForm(prev => {
                          const exists = prev.mesesSeleccionados.some(s => s.mes === m.mes && s.anio === m.anio);
                          return {
                            ...prev,
                            mesesSeleccionados: exists
                              ? prev.mesesSeleccionados.filter(s => !(s.mes === m.mes && s.anio === m.anio))
                              : [...prev.mesesSeleccionados, { mes: m.mes, anio: m.anio }]
                          };
                        });
                        if (formErrors.mesesSeleccionados) setFormErrors(pr => ({ ...pr, mesesSeleccionados: undefined }));
                      }}
                      style={{
                        padding: 'var(--sp-2) var(--sp-3)',
                        borderRadius: 'var(--r-full)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                        background: isSelected ? 'var(--accent)' : 'var(--bg-surface)',
                        color: isSelected ? 'var(--bg-base)' : 'var(--ink-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            )}
            {formErrors.mesesSeleccionados && <span className="form-error">{formErrors.mesesSeleccionados}</span>}
          </div>

          {/* Tipo de registro */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={form.isExonerado} 
                onChange={(e) => setForm(prev => ({ ...prev, isExonerado: e.target.checked }))} 
                style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} 
              />
              Exonerar mensualidad (No registrar monto)
            </label>
          </div>

          {!form.isExonerado && (
            <>
              {/* Moneda */}
              <div className="form-group">
                <label className="form-label">Moneda</label>
                <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
                  {(['bs', 'usd'] as const).map((m) => (
                    <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', cursor: 'pointer', flex: 1, background: form.moneda === m ? 'var(--accent-muted)' : 'var(--bg-elevated)', border: `1px solid ${form.moneda === m ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--r-md)', padding: 'var(--sp-3)', transition: 'all 0.15s' }}>
                      <input type="radio" name="moneda" value={m} checked={form.moneda === m} onChange={f('moneda')} style={{ accentColor: 'var(--accent)' }} />
                      <span style={{ fontWeight: 600, color: form.moneda === m ? 'var(--accent)' : 'var(--ink-secondary)' }}>
                        {m === 'bs' ? 'Bolívares (Bs.)' : 'Dólares (USD)'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Método de pago */}
              <div className="form-group">
                <label className="form-label" htmlFor="pago-metodo">Método de pago *</label>
                <select id="pago-metodo" className="form-select" value={form.metodoPago} onChange={f('metodoPago')} disabled={form.moneda === 'usd'}>
                  {form.moneda === 'usd' ? (
                    <option value="efectivo_usd">Efectivo USD</option>
                  ) : (
                    <>
                      <option value="efectivo_bs">Efectivo Bs.</option>
                      <option value="pago_movil">Pago Móvil Bs.</option>
                    </>
                  )}
                </select>
              </div>

              {/* Monto */}
              <div className="form-group">
                <label className="form-label" htmlFor="pago-monto">
                  Monto en {form.moneda === 'usd' ? 'USD' : 'Bs.'} *
                </label>
                <input
                  id="pago-monto"
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  value={form.montoInput}
                  onChange={f('montoInput')}
                  placeholder={form.moneda === 'usd' ? (config.mensualidadBase * Math.max(1, form.mesesSeleccionados.length)).toFixed(2) : (config.mensualidadBase * tasa * Math.max(1, form.mesesSeleccionados.length)).toFixed(2)}
                />
                {formErrors.montoInput && <span className="form-error">{formErrors.montoInput}</span>}
                {montoPreview && (
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--r-md)', padding: 'var(--sp-3)', marginTop: 'var(--sp-2)', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--ink-muted)' }}>Tasa BCV: {tasa.toFixed(2)} Bs/$</span>
                    {form.moneda === 'usd'
                      ? <span style={{ color: 'var(--accent)', fontWeight: 600 }}>= {formatBs(montoPreview.bs)}</span>
                      : <span style={{ color: 'var(--ink-secondary)', fontWeight: 600 }}>≈ {formatUSD(montoPreview.usd)}</span>
                    }
                  </div>
                )}
              </div>

              {/* Referencia (only for pago móvil) */}
              {form.metodoPago === 'pago_movil' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="pago-ref">Número de referencia *</label>
                  <input id="pago-ref" className="form-input" value={form.referencia} onChange={f('referencia')} placeholder="Ej: 00123456789" />
                  {formErrors.referencia && <span className="form-error">{formErrors.referencia}</span>}
                </div>
              )}
            </>
          )}

          {/* Notas */}
          <div className="form-group">
            <label className="form-label" htmlFor="pago-notas">Notas</label>
            <textarea id="pago-notas" className="form-textarea" value={form.notas} onChange={f('notas')} placeholder="Observaciones adicionales..." style={{ minHeight: 60 }} />
          </div>
        </Modal>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <Modal
          title="Eliminar pago"
          onClose={() => setConfirmDelete(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn btn-danger" disabled={isSubmitting} onClick={async () => { await deletePago(confirmDelete!); setConfirmDelete(null); addToast('Pago eliminado', 'error'); }}>
                Eliminar pago
              </button>
            </>
          }
        >
          <p style={{ color: 'var(--ink-primary)' }}>¿Eliminar este registro de pago? Esta acción no se puede deshacer.</p>
        </Modal>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
