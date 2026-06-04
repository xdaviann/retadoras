import { create } from 'zustand';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Atleta, Pago, Movimiento, CategoriaMovimiento, Config } from '../types';

// ─── Default Data ─────────────────────────────────────────────────────────────

const defaultCategoriasIngreso: CategoriaMovimiento[] = [
  { id: 'cat-ing-1', nombre: 'Otro Ingreso', tipo: 'ingreso' },
  { id: 'cat-ing-2', nombre: 'Venta de Uniformes', tipo: 'ingreso' },
  { id: 'cat-ing-3', nombre: 'Torneo', tipo: 'ingreso' },
  { id: 'cat-ing-4', nombre: 'Donación', tipo: 'ingreso' },
];

const defaultCategoriasGasto: CategoriaMovimiento[] = [
  { id: 'cat-gas-1', nombre: 'Alquiler de Cancha', tipo: 'gasto' },
  { id: 'cat-gas-2', nombre: 'Uniformes', tipo: 'gasto' },
  { id: 'cat-gas-3', nombre: 'Material Deportivo', tipo: 'gasto' },
  { id: 'cat-gas-4', nombre: 'Transporte', tipo: 'gasto' },
  { id: 'cat-gas-5', nombre: 'Arbitraje', tipo: 'gasto' },
  { id: 'cat-gas-6', nombre: 'Inscripción Torneo', tipo: 'gasto' },
  { id: 'cat-gas-7', nombre: 'Servicios Básicos', tipo: 'gasto' },
  { id: 'cat-gas-8', nombre: 'Otros Gastos', tipo: 'gasto' },
];

export const defaultConfig: Config = {
  nombreAcademia: 'Club Retadoras',
  tasaBCV: 50.0,
  fechaTasaBCV: new Date().toISOString(),
  mensualidadBase: 20,
};

// ─── Store Interface ──────────────────────────────────────────────────────────

interface AppState {
  // Data — populated by Firestore listeners in useFirestoreSync
  atletas: Atleta[];
  pagos: Pago[];
  movimientos: Movimiento[];
  categoriasMovimientos: CategoriaMovimiento[];
  config: Config;

  // UI state
  dataLoading: boolean;   // initial Firestore snapshot not yet received
  isSubmitting: boolean;  // any write operation in progress (prevents double submit)
  athletesFilterPayment: 'todas' | 'deudoras' | 'aldia';

  // Internal setter used by the sync hook (not exposed to UI)
  _setData: (partial: Partial<Pick<AppState, 'atletas' | 'pagos' | 'movimientos' | 'categoriasMovimientos' | 'config' | 'dataLoading'>>) => void;
  setAthletesFilterPayment: (f: 'todas' | 'deudoras' | 'aldia') => void;

  // ── Atletas ────────────────────────────────────────────────────────────────
  addAtleta: (atleta: Omit<Atleta, 'id'>) => Promise<void>;
  updateAtleta: (id: string, data: Partial<Atleta>) => Promise<void>;
  toggleAtletaActiva: (id: string) => Promise<void>;
  deleteAtleta: (id: string) => Promise<void>;

  // ── Pagos ──────────────────────────────────────────────────────────────────
  addPago: (pago: Omit<Pago, 'id'>) => Promise<void>;
  addPagos: (pagos: Omit<Pago, 'id'>[]) => Promise<void>;
  updatePago: (id: string, data: Partial<Pago>) => Promise<void>;
  deletePago: (id: string) => Promise<void>;

  // ── Movimientos ────────────────────────────────────────────────────────────
  addMovimiento: (mov: Omit<Movimiento, 'id'>) => Promise<void>;
  updateMovimiento: (id: string, data: Partial<Movimiento>) => Promise<void>;
  deleteMovimiento: (id: string) => Promise<void>;

  // ── Categorías ─────────────────────────────────────────────────────────────
  addCategoria: (cat: Omit<CategoriaMovimiento, 'id'>) => Promise<void>;
  deleteCategoria: (id: string) => Promise<void>;

  // ── Config ─────────────────────────────────────────────────────────────────
  updateConfig: (data: Partial<Config>) => Promise<void>;
  actualizarTasa: (tasa: number) => Promise<void>;

  // ── Import / Export ────────────────────────────────────────────────────────
  exportData: () => string;
  importData: (json: string) => Promise<void>;
}

// ─── Helper: guard against concurrent submits ─────────────────────────────────

function withSubmit<T extends unknown[]>(
  set: (fn: (s: AppState) => Partial<AppState>) => void,
  get: () => AppState,
  fn: (...args: T) => Promise<void>
) {
  return async (...args: T) => {
    if (get().isSubmitting) return; // prevent double submit
    set(() => ({ isSubmitting: true }));
    try {
      await fn(...args);
    } finally {
      set(() => ({ isSubmitting: false }));
    }
  };
}

// ─── Firestore collection refs ────────────────────────────────────────────────

const col = (name: string) => collection(db, name);
const docRef = (name: string, id: string) => doc(db, name, id);
const clean = <T extends Record<string, any>>(obj: T): T => {
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined)) as T;
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<AppState>((set, get) => ({
  atletas: [],
  pagos: [],
  movimientos: [],
  categoriasMovimientos: [],
  config: defaultConfig,
  dataLoading: true,
  isSubmitting: false,
  athletesFilterPayment: 'todas',

  _setData: (partial) => set(partial),
  setAthletesFilterPayment: (f) => set({ athletesFilterPayment: f }),

  // ── Atletas ────────────────────────────────────────────────────────────────

  addAtleta: withSubmit(set, get, async (data: Omit<Atleta, 'id'>) => {
    await addDoc(col('atletas'), clean(data));
  }),

  updateAtleta: withSubmit(set, get, async (id: string, data: Partial<Atleta>) => {
    await updateDoc(docRef('atletas', id), clean(data) as Record<string, unknown>);
  }),

  toggleAtletaActiva: withSubmit(set, get, async (id: string) => {
    const current = get().atletas.find(a => a.id === id);
    if (!current) return;
    await updateDoc(docRef('atletas', id), { activa: !current.activa });
  }),

  deleteAtleta: withSubmit(set, get, async (id: string) => {
    await deleteDoc(docRef('atletas', id));
    // Also delete all payments for this athlete
    const pagosAtleta = get().pagos.filter(p => p.atletaId === id);
    await Promise.all(pagosAtleta.map(p => deleteDoc(docRef('pagos', p.id))));
  }),

  // ── Pagos ──────────────────────────────────────────────────────────────────

  addPago: withSubmit(set, get, async (data: Omit<Pago, 'id'>) => {
    await addDoc(col('pagos'), clean(data));
  }),

  addPagos: withSubmit(set, get, async (pagosData: Omit<Pago, 'id'>[]) => {
    await Promise.all(pagosData.map(data => addDoc(col('pagos'), clean(data))));
  }),

  updatePago: withSubmit(set, get, async (id: string, data: Partial<Pago>) => {
    await updateDoc(docRef('pagos', id), clean(data) as Record<string, unknown>);
  }),

  deletePago: withSubmit(set, get, async (id: string) => {
    await deleteDoc(docRef('pagos', id));
  }),

  // ── Movimientos ────────────────────────────────────────────────────────────

  addMovimiento: withSubmit(set, get, async (data: Omit<Movimiento, 'id'>) => {
    await addDoc(col('movimientos'), clean(data));
  }),

  updateMovimiento: withSubmit(set, get, async (id: string, data: Partial<Movimiento>) => {
    await updateDoc(docRef('movimientos', id), clean(data) as Record<string, unknown>);
  }),

  deleteMovimiento: withSubmit(set, get, async (id: string) => {
    await deleteDoc(docRef('movimientos', id));
  }),

  // ── Categorías ─────────────────────────────────────────────────────────────

  addCategoria: withSubmit(set, get, async (data: Omit<CategoriaMovimiento, 'id'>) => {
    await addDoc(col('categorias'), clean(data));
  }),

  deleteCategoria: withSubmit(set, get, async (id: string) => {
    await deleteDoc(docRef('categorias', id));
  }),

  // ── Config ─────────────────────────────────────────────────────────────────

  updateConfig: withSubmit(set, get, async (data: Partial<Config>) => {
    const merged = { ...get().config, ...data };
    await setDoc(docRef('config', 'main'), merged);
  }),

  actualizarTasa: withSubmit(set, get, async (tasa: number) => {
    const merged = {
      ...get().config,
      tasaBCV: tasa,
      fechaTasaBCV: new Date().toISOString(),
    };
    await setDoc(docRef('config', 'main'), merged);
  }),

  // ── Import / Export ────────────────────────────────────────────────────────

  exportData: () => {
    const { atletas, pagos, movimientos, categoriasMovimientos, config } = get();
    return JSON.stringify(
      { atletas, pagos, movimientos, categoriasMovimientos, config, exportedAt: new Date().toISOString() },
      null,
      2
    );
  },

  importData: withSubmit(set, get, async (json: string) => {
    const data = JSON.parse(json);

    const atletas: Atleta[] = data.atletas ?? [];
    const pagos: Pago[] = data.pagos ?? [];
    const movimientos: Movimiento[] = data.movimientos ?? [];
    const categorias: CategoriaMovimiento[] = data.categoriasMovimientos ?? [
      ...defaultCategoriasIngreso,
      ...defaultCategoriasGasto,
    ];
    const config: Config = data.config ?? defaultConfig;

    // Write everything to Firestore in parallel
    await Promise.all([
      ...atletas.map(a => setDoc(docRef('atletas', a.id), a)),
      ...pagos.map(p => setDoc(docRef('pagos', p.id), p)),
      ...movimientos.map(m => setDoc(docRef('movimientos', m.id), m)),
      ...categorias.map(c => setDoc(docRef('categorias', c.id), c)),
      setDoc(docRef('config', 'main'), config),
    ]);
  }),

  // ── Seed default categories if Firestore is empty ─────────────────────────
  // Called from useFirestoreSync after first snapshot
}));

/**
 * Seeds Firestore with default categories and config if they are missing.
 * Safe to call multiple times — checks for existence first.
 */
export async function seedDefaultsIfEmpty() {
  const configSnap = await getDoc(docRef('config', 'main'));
  if (!configSnap.exists()) {
    await setDoc(docRef('config', 'main'), defaultConfig);
  }

  const allDefaults = [...defaultCategoriasIngreso, ...defaultCategoriasGasto];
  await Promise.all(
    allDefaults.map(async (cat) => {
      const snap = await getDoc(docRef('categorias', cat.id));
      if (!snap.exists()) {
        await setDoc(docRef('categorias', cat.id), cat);
      }
    })
  );
}
