import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useToast } from '../hooks/useToast';
import { useExchangeRate } from '../hooks/useExchangeRate';
import { formatFecha, getCurrentMonthYear } from '../utils/format';
import { Modal } from '../components/ui/Modal';
import { ToastContainer } from '../components/ui/Toast';
import { PlusIcon, SearchIcon, EditIcon, TrashIcon, UsersIcon } from '../components/ui/Icons';
import type { Atleta, Categoria } from '../types';

const CATEGORIAS: Categoria[] = ['Grupo A', 'Grupo B'];

type AtletaForm = Omit<Atleta, 'id' | 'activa' | 'fechaIngreso'>;

const emptyForm = (): AtletaForm => ({
  nombre: '',
  apellido: '',
  cedula: '',
  fechaNacimiento: '',
  categoria: 'Grupo A',
  telefono: '',
  email: '',
  notas: '',
});

export function Athletes() {
  const { atletas, pagos, addAtleta, updateAtleta, toggleAtletaActiva, deleteAtleta, isSubmitting } = useStore();
  const { toasts, addToast, removeToast } = useToast();
  const { mes, anio } = getCurrentMonthYear();

  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<Categoria | 'todas'>('todas');
  const [filterStatus, setFilterStatus] = useState<'todas' | 'activa' | 'inactiva'>('activa');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<AtletaForm>(emptyForm());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof AtletaForm, string>>>({});

  const pagosMes = useMemo(
    () => pagos.filter((p) => p.mes === mes && p.anio === anio),
    [pagos, mes, anio]
  );

  function getDeuda(atleta: Atleta) {
    if (!atleta.fechaIngreso) return 0;
    const fecha = new Date(atleta.fechaIngreso);
    const mIngreso = fecha.getMonth() + 1;
    const aIngreso = fecha.getFullYear();
    
    // Meses esperados desde ingreso hasta el mes actual (inclusivo)
    const esperados = (anio - aIngreso) * 12 + (mes - mIngreso) + 1;
    if (esperados <= 0) return 0;

    const pagosAtleta = pagos.filter(p => p.atletaId === atleta.id);
    const pagados = new Set(pagosAtleta.map(p => `${p.anio}-${p.mes}`)).size;

    return Math.max(0, esperados - pagados);
  }

  const filtered = useMemo(() => {
    return atletas.filter((a) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        a.nombre.toLowerCase().includes(q) ||
        a.apellido.toLowerCase().includes(q) ||
        a.cedula.includes(q) ||
        a.telefono.includes(q);
      const matchCat = filterCat === 'todas' || a.categoria === filterCat;
      const matchStatus =
        filterStatus === 'todas' ||
        (filterStatus === 'activa' && a.activa) ||
        (filterStatus === 'inactiva' && !a.activa);
      return matchSearch && matchCat && matchStatus;
    });
  }, [atletas, search, filterCat, filterStatus]);

  function validate(): boolean {
    const errs: Partial<Record<keyof AtletaForm, string>> = {};
    if (!form.nombre.trim()) errs.nombre = 'El nombre es requerido';
    if (!form.apellido.trim()) errs.apellido = 'El apellido es requerido';
    if (!form.cedula.trim()) errs.cedula = 'La cédula es requerida';
    if (!form.fechaNacimiento) errs.fechaNacimiento = 'La fecha de nacimiento es requerida';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    if (isSubmitting) return;
    if (editId) {
      await updateAtleta(editId, form);
      addToast('Atleta actualizada correctamente');
    } else {
      await addAtleta({ ...form, activa: true, fechaIngreso: new Date().toISOString() });
      addToast('Atleta registrada correctamente');
    }
    closeModal();
  }

  function openCreate() {
    setEditId(null);
    setForm(emptyForm());
    setFormErrors({});
    setShowModal(true);
  }

  function openEdit(atleta: Atleta) {
    setEditId(atleta.id);
    setForm({
      nombre: atleta.nombre,
      apellido: atleta.apellido,
      cedula: atleta.cedula,
      fechaNacimiento: atleta.fechaNacimiento,
      categoria: atleta.categoria,
      telefono: atleta.telefono,
      email: atleta.email ?? '',
      notas: atleta.notas ?? '',
    });
    setFormErrors({});
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditId(null);
    setForm(emptyForm());
    setFormErrors({});
  }

  async function handleDelete(id: string) {
    await deleteAtleta(id);
    setConfirmDelete(null);
    addToast('Atleta eliminada', 'error');
  }

  function f(field: keyof AtletaForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    };
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>Atletas</h1>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>
            {atletas.filter((a) => a.activa).length} activas · {atletas.length} total
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} id="btn-add-athlete">
          <PlusIcon size={16} />
          Agregar atleta
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-input-wrap">
          <SearchIcon />
          <input
            className="form-input"
            type="search"
            placeholder="Buscar por nombre, cédula..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="athlete-search"
          />
        </div>
        <select className="form-select" style={{ width: 'auto', minWidth: 130 }} value={filterCat} onChange={(e) => setFilterCat(e.target.value as Categoria | 'todas')}>
          <option value="todas">Todas las categorías</option>
          {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="form-select" style={{ width: 'auto', minWidth: 120 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as 'todas' | 'activa' | 'inactiva')}>
          <option value="activa">Activas</option>
          <option value="inactiva">Inactivas</option>
          <option value="todas">Todas</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <UsersIcon size={48} />
          <h3>Sin atletas</h3>
          <p>{search ? 'No se encontraron resultados para tu búsqueda.' : 'Agrega la primera atleta para comenzar.'}</p>
          {!search && <button className="btn btn-primary" onClick={openCreate}><PlusIcon size={16} /> Agregar atleta</button>}
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Atleta</th>
                <th>Cédula</th>
                <th>Categoría</th>
                <th>Teléfono</th>
                <th>Deuda</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((atleta) => {
                const deuda = getDeuda(atleta);
                return (
                  <tr key={atleta.id}>
                    <td data-label="Atleta">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                        <div className="avatar">
                          {atleta.nombre.charAt(0)}{atleta.apellido.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{atleta.nombre} {atleta.apellido}</div>
                          {atleta.email && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{atleta.email}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td data-label="Cédula" style={{ color: 'var(--ink-secondary)', fontFamily: 'var(--font-display)' }}>{atleta.cedula}</td>
                    <td data-label="Categoría">
                      <span className={`badge ${atleta.categoria === 'Grupo A' ? 'badge-green' : 'badge-blue'}`}>
                        {atleta.categoria}
                      </span>
                    </td>
                    <td data-label="Teléfono" style={{ color: 'var(--ink-secondary)' }}>{atleta.telefono}</td>
                    <td data-label="Deuda">
                      {atleta.activa ? (
                        <span className={`badge ${deuda === 0 ? 'badge-green' : deuda === 1 ? 'badge-yellow' : 'badge-red'}`}>
                          {deuda === 0 ? 'Al día' : deuda === 1 ? '1 mes' : `${deuda} meses`}
                        </span>
                      ) : (
                        <span className="badge badge-gray">—</span>
                      )}
                    </td>
                    <td data-label="Estado">
                      <span className={`badge ${atleta.activa ? 'badge-green' : 'badge-gray'}`}>
                        {atleta.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td data-label="Acciones">
                      <div style={{ display: 'flex', gap: 'var(--sp-2)', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-icon btn-ghost"
                          onClick={() => openEdit(atleta)}
                          data-tooltip="Editar"
                          aria-label="Editar atleta"
                        >
                          <EditIcon />
                        </button>
                        <button
                          className="btn btn-icon btn-ghost"
                          onClick={() => toggleAtletaActiva(atleta.id)}
                          data-tooltip={atleta.activa ? 'Desactivar' : 'Activar'}
                          aria-label={atleta.activa ? 'Desactivar atleta' : 'Activar atleta'}
                          style={{ color: atleta.activa ? 'var(--yellow)' : 'var(--accent)' }}
                        >
                          {atleta.activa ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
                          )}
                        </button>
                        <button
                          className="btn btn-icon btn-danger"
                          onClick={() => setConfirmDelete(atleta.id)}
                          data-tooltip="Eliminar"
                          aria-label="Eliminar atleta"
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

      {/* Create / Edit Modal */}
      {showModal && (
        <Modal
          title={editId ? 'Editar atleta' : 'Registrar atleta'}
          onClose={closeModal}
          footer={
            <>
              <button className="btn btn-ghost" onClick={closeModal}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSubmit} id="btn-save-athlete">
                {editId ? 'Guardar cambios' : 'Registrar atleta'}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="nombre">Nombre *</label>
              <input id="nombre" className="form-input" value={form.nombre} onChange={f('nombre')} placeholder="María" />
              {formErrors.nombre && <span className="form-error">{formErrors.nombre}</span>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="apellido">Apellido *</label>
              <input id="apellido" className="form-input" value={form.apellido} onChange={f('apellido')} placeholder="González" />
              {formErrors.apellido && <span className="form-error">{formErrors.apellido}</span>}
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="cedula">Cédula *</label>
              <input id="cedula" className="form-input" value={form.cedula} onChange={f('cedula')} placeholder="V-12345678" />
              {formErrors.cedula && <span className="form-error">{formErrors.cedula}</span>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="fecha-nac">Fecha de nacimiento *</label>
              <input id="fecha-nac" type="date" className="form-input" value={form.fechaNacimiento} onChange={f('fechaNacimiento')} />
              {formErrors.fechaNacimiento && <span className="form-error">{formErrors.fechaNacimiento}</span>}
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="telefono">Teléfono</label>
              <input id="telefono" className="form-input" value={form.telefono} onChange={f('telefono')} placeholder="0414-1234567" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email</label>
              <input id="email" type="email" className="form-input" value={form.email} onChange={f('email')} placeholder="maria@email.com" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="categoria">Categoría *</label>
            <select id="categoria" className="form-select" value={form.categoria} onChange={f('categoria')}>
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="notas">Notas</label>
            <textarea id="notas" className="form-textarea" value={form.notas} onChange={f('notas')} placeholder="Información adicional..." />
          </div>
        </Modal>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <Modal
          title="Eliminar atleta"
          onClose={() => setConfirmDelete(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete)}>Eliminar atleta</button>
            </>
          }
        >
          <p style={{ color: 'var(--ink-primary)' }}>
            ¿Estás seguro de eliminar esta atleta? También se eliminarán todos sus registros de pago.
            Esta acción no se puede deshacer.
          </p>
        </Modal>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
