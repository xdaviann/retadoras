import { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { useToast } from '../hooks/useToast';
import { formatRelativa } from '../utils/format';
import { ToastContainer } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { RefreshIcon, DownloadIcon, UploadIcon, PlusIcon, TrashIcon } from '../components/ui/Icons';
import type { TipoMovimiento } from '../types';

export function Settings() {
  const { config, updateConfig, actualizarTasa, categoriasMovimientos, addCategoria, deleteCategoria, exportData, importData } = useStore();
  const { toasts, addToast, removeToast } = useToast();

  // Exchange rate
  const [tasaInput, setTasaInput] = useState(config.tasaBCV.toString());
  const [tasaLoading, setTasaLoading] = useState(false);

  // Academy config
  const [nombreInput, setNombreInput] = useState(config.nombreAcademia);
  const [mensualidadInput, setMensualidadInput] = useState(config.mensualidadBase.toString());

  // New category
  const [showCatModal, setShowCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ nombre: '', tipo: 'ingreso' as TipoMovimiento });
  const [catError, setCatError] = useState('');

  // Import
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmImport, setConfirmImport] = useState(false);
  const [pendingFile, setPendingFile] = useState<string | null>(null);

  // ── Exchange rate ──────────────────────────────────────────────────────────

  async function handleFetchTasa() {
    setTasaLoading(true);
    try {
      const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const tasa = data?.promedio;
      if (!tasa || isNaN(Number(tasa))) throw new Error('Formato inesperado');
      const t = Number(tasa);
      setTasaInput(t.toFixed(2));
      actualizarTasa(t);
      addToast(`Tasa actualizada: ${t.toFixed(2)} Bs/$`);
    } catch (err) {
      addToast('No se pudo obtener la tasa. Ingrésala manualmente.', 'error');
    } finally {
      setTasaLoading(false);
    }
  }

  function handleSaveTasa() {
    const t = parseFloat(tasaInput);
    if (isNaN(t) || t <= 0) { addToast('Ingresa una tasa válida', 'error'); return; }
    actualizarTasa(t);
    addToast('Tasa actualizada correctamente');
  }

  // ── Config ─────────────────────────────────────────────────────────────────

  function handleSaveConfig() {
    const m = parseFloat(mensualidadInput);
    if (!nombreInput.trim()) { addToast('El nombre no puede estar vacío', 'error'); return; }
    if (isNaN(m) || m <= 0) { addToast('Ingresa una mensualidad válida', 'error'); return; }
    updateConfig({ nombreAcademia: nombreInput.trim(), mensualidadBase: m });
    addToast('Configuración guardada');
  }

  // ── Categories ─────────────────────────────────────────────────────────────

  function handleAddCategoria() {
    if (!catForm.nombre.trim()) { setCatError('Ingresa un nombre'); return; }
    addCategoria({ nombre: catForm.nombre.trim(), tipo: catForm.tipo });
    addToast('Categoría agregada');
    setShowCatModal(false);
    setCatForm({ nombre: '', tipo: 'ingreso' });
    setCatError('');
  }

  // ── Export / Import ────────────────────────────────────────────────────────

  function handleExport() {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `academia-spike-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Datos exportados correctamente');
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setPendingFile(content);
      setConfirmImport(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleImportConfirm() {
    if (!pendingFile) return;
    try {
      importData(pendingFile);
      addToast('Datos importados correctamente');
    } catch {
      addToast('Error al importar el archivo', 'error');
    }
    setConfirmImport(false);
    setPendingFile(null);
  }

  const categoriasIngreso = categoriasMovimientos.filter((c) => c.tipo === 'ingreso');
  const categoriasGasto = categoriasMovimientos.filter((c) => c.tipo === 'gasto');

  return (
    <div>
      <div className="section-header" style={{ marginBottom: 'var(--sp-6)' }}>
        <div>
          <h1>Configuración</h1>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>Ajustes generales del sistema</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--sp-5)' }}>

        {/* Exchange Rate */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Tasa de Cambio BCV</span>
          </div>
          <p style={{ fontSize: '0.85rem', marginBottom: 'var(--sp-4)' }}>
            Última actualización: {formatRelativa(config.fechaTasaBCV)}
          </p>
          <div style={{ display: 'flex', gap: 'var(--sp-3)', marginBottom: 'var(--sp-3)' }}>
            <div style={{ flex: 1 }}>
              <input
                id="tasa-input"
                type="number"
                step="0.01"
                min="0"
                className="form-input"
                value={tasaInput}
                onChange={(e) => setTasaInput(e.target.value)}
                placeholder="Ej: 50.25"
              />
            </div>
            <button className="btn btn-ghost" onClick={handleSaveTasa}>
              Guardar
            </button>
          </div>
          <div style={{ display: 'flex', gap: 'var(--sp-2)', fontSize: '0.75rem', color: 'var(--ink-muted)', marginBottom: 'var(--sp-3)' }}>
            Tasa actual: <strong style={{ color: 'var(--accent)', marginLeft: 4 }}>{config.tasaBCV.toFixed(2)} Bs/$</strong>
          </div>
          <button
            className="btn btn-ghost"
            onClick={handleFetchTasa}
            disabled={tasaLoading}
            style={{ width: '100%' }}
            id="btn-fetch-rate"
          >
            <RefreshIcon size={14} className={tasaLoading ? 'animate-spin' : ''} />
            {tasaLoading ? 'Consultando...' : 'Obtener tasa BCV automática'}
          </button>
          <p style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', marginTop: 'var(--sp-2)', marginBottom: 0, maxWidth: '100%' }}>
            Si no funciona la consulta automática, ingresa la tasa manualmente consultando{' '}
            <a href="https://alcambio.app" target="_blank" rel="noopener noreferrer">alcambio.app</a>.
          </p>
        </div>

        {/* Academy Config */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Academia</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="nombre-academia">Nombre de la academia</label>
              <input
                id="nombre-academia"
                className="form-input"
                value={nombreInput}
                onChange={(e) => setNombreInput(e.target.value)}
                placeholder="Academia Spike"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="mensualidad-base">Mensualidad base (USD)</label>
              <input
                id="mensualidad-base"
                type="number"
                min="0"
                step="0.01"
                className="form-input"
                value={mensualidadInput}
                onChange={(e) => setMensualidadInput(e.target.value)}
                placeholder="20.00"
              />
              <span className="form-hint">Se usa como valor sugerido al registrar pagos</span>
            </div>
            <button className="btn btn-primary" onClick={handleSaveConfig} id="btn-save-config">
              Guardar cambios
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Categorías de movimientos</span>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowCatModal(true); setCatError(''); setCatForm({ nombre: '', tipo: 'ingreso' }); }}>
              <PlusIcon size={14} /> Agregar
            </button>
          </div>

          <div style={{ marginBottom: 'var(--sp-3)' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent)', marginBottom: 'var(--sp-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ingresos</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
              {categoriasIngreso.map((c) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--sp-2) var(--sp-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--r-md)' }}>
                  <span style={{ fontSize: '0.875rem' }}>{c.nombre}</span>
                  <button className="btn btn-icon btn-danger" style={{ width: 26, height: 26 }} onClick={() => deleteCategoria(c.id)} aria-label="Eliminar categoría">
                    <TrashIcon size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--red)', marginBottom: 'var(--sp-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Gastos</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
              {categoriasGasto.map((c) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--sp-2) var(--sp-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--r-md)' }}>
                  <span style={{ fontSize: '0.875rem' }}>{c.nombre}</span>
                  <button className="btn btn-icon btn-danger" style={{ width: 26, height: 26 }} onClick={() => deleteCategoria(c.id)} aria-label="Eliminar categoría">
                    <TrashIcon size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Respaldo de datos</span>
          </div>
          <p style={{ fontSize: '0.85rem', marginBottom: 'var(--sp-4)' }}>
            Los datos se guardan en el navegador (LocalStorage). Exporta un respaldo regularmente.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            <button className="btn btn-ghost" onClick={handleExport} id="btn-export">
              <DownloadIcon size={15} />
              Exportar datos (JSON)
            </button>
            <button className="btn btn-ghost" onClick={() => fileRef.current?.click()} id="btn-import">
              <UploadIcon size={15} />
              Importar datos (JSON)
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            <p style={{ fontSize: '0.72rem', color: 'var(--red)', marginBottom: 0, maxWidth: '100%' }}>
              ⚠ Importar datos reemplaza toda la información actual.
            </p>
          </div>
        </div>

      </div>

      {/* Add Category Modal */}
      {showCatModal && (
        <Modal
          title="Agregar categoría"
          onClose={() => setShowCatModal(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowCatModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAddCategoria}>Agregar categoría</button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
              {(['ingreso', 'gasto'] as TipoMovimiento[]).map((t) => (
                <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', cursor: 'pointer', flex: 1, background: catForm.tipo === t ? (t === 'ingreso' ? 'var(--accent-muted)' : 'var(--red-muted)') : 'var(--bg-elevated)', border: `1px solid ${catForm.tipo === t ? (t === 'ingreso' ? 'var(--accent)' : 'var(--red)') : 'var(--border)'}`, borderRadius: 'var(--r-md)', padding: 'var(--sp-3)', transition: 'all 0.15s' }}>
                  <input type="radio" name="cat-tipo" value={t} checked={catForm.tipo === t} onChange={() => setCatForm((p) => ({ ...p, tipo: t }))} style={{ accentColor: t === 'ingreso' ? 'var(--accent)' : 'var(--red)' }} />
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: catForm.tipo === t ? (t === 'ingreso' ? 'var(--accent)' : 'var(--red)') : 'var(--ink-secondary)' }}>
                    {t === 'ingreso' ? 'Ingreso' : 'Gasto'}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="cat-nombre">Nombre de la categoría *</label>
            <input
              id="cat-nombre"
              className="form-input"
              value={catForm.nombre}
              onChange={(e) => { setCatForm((p) => ({ ...p, nombre: e.target.value })); setCatError(''); }}
              placeholder="Ej: Venta de uniformes"
              autoFocus
            />
            {catError && <span className="form-error">{catError}</span>}
          </div>
        </Modal>
      )}

      {/* Confirm Import Modal */}
      {confirmImport && (
        <Modal
          title="Confirmar importación"
          onClose={() => { setConfirmImport(false); setPendingFile(null); }}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => { setConfirmImport(false); setPendingFile(null); }}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleImportConfirm}>Reemplazar datos</button>
            </>
          }
        >
          <p style={{ color: 'var(--ink-primary)' }}>
            Esta acción reemplazará <strong>todos los datos actuales</strong> (atletas, pagos, movimientos y configuración) con el contenido del archivo seleccionado. Esta acción no se puede deshacer.
          </p>
        </Modal>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
