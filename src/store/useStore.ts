import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Atleta, Pago, Movimiento, CategoriaMovimiento, Config
} from '../types';

// ─── Default Categories ───────────────────────────────────────────────────────

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

const defaultConfig: Config = {
  nombreAcademia: 'Club Retadoras',
  tasaBCV: 50.0,
  fechaTasaBCV: new Date().toISOString(),
  mensualidadBase: 20,
};

// ─── Store Interface ──────────────────────────────────────────────────────────

interface AppState {
  // Entities
  atletas: Atleta[];
  pagos: Pago[];
  movimientos: Movimiento[];
  categoriasMovimientos: CategoriaMovimiento[];
  config: Config;

  // ── Atletas ──────────────────────────────────────────────────────────────
  addAtleta: (atleta: Omit<Atleta, 'id'>) => void;
  updateAtleta: (id: string, data: Partial<Atleta>) => void;
  toggleAtletaActiva: (id: string) => void;
  deleteAtleta: (id: string) => void;

  // ── Pagos ─────────────────────────────────────────────────────────────────
  addPago: (pago: Omit<Pago, 'id'>) => void;
  updatePago: (id: string, data: Partial<Pago>) => void;
  deletePago: (id: string) => void;

  // ── Movimientos ───────────────────────────────────────────────────────────
  addMovimiento: (mov: Omit<Movimiento, 'id'>) => void;
  updateMovimiento: (id: string, data: Partial<Movimiento>) => void;
  deleteMovimiento: (id: string) => void;

  // ── Categorías ────────────────────────────────────────────────────────────
  addCategoria: (cat: Omit<CategoriaMovimiento, 'id'>) => void;
  deleteCategoria: (id: string) => void;

  // ── Config ────────────────────────────────────────────────────────────────
  updateConfig: (data: Partial<Config>) => void;
  actualizarTasa: (tasa: number) => void;

  // ── Import / Export ───────────────────────────────────────────────────────
  exportData: () => string;
  importData: (json: string) => void;
}

// ─── ID Generator ─────────────────────────────────────────────────────────────

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      atletas: [],
      pagos: [],
      movimientos: [],
      categoriasMovimientos: [
        ...defaultCategoriasIngreso,
        ...defaultCategoriasGasto,
      ],
      config: defaultConfig,

      // ── Atletas ──────────────────────────────────────────────────────────
      addAtleta: (data) =>
        set((s) => ({
          atletas: [...s.atletas, { id: genId(), ...data }],
        })),

      updateAtleta: (id, data) =>
        set((s) => ({
          atletas: s.atletas.map((a) => (a.id === id ? { ...a, ...data } : a)),
        })),

      toggleAtletaActiva: (id) =>
        set((s) => ({
          atletas: s.atletas.map((a) =>
            a.id === id ? { ...a, activa: !a.activa } : a
          ),
        })),

      deleteAtleta: (id) =>
        set((s) => ({
          atletas: s.atletas.filter((a) => a.id !== id),
          pagos: s.pagos.filter((p) => p.atletaId !== id),
        })),

      // ── Pagos ─────────────────────────────────────────────────────────────
      addPago: (data) =>
        set((s) => ({
          pagos: [...s.pagos, { id: genId(), ...data }],
        })),

      updatePago: (id, data) =>
        set((s) => ({
          pagos: s.pagos.map((p) => (p.id === id ? { ...p, ...data } : p)),
        })),

      deletePago: (id) =>
        set((s) => ({ pagos: s.pagos.filter((p) => p.id !== id) })),

      // ── Movimientos ───────────────────────────────────────────────────────
      addMovimiento: (data) =>
        set((s) => ({
          movimientos: [...s.movimientos, { id: genId(), ...data }],
        })),

      updateMovimiento: (id, data) =>
        set((s) => ({
          movimientos: s.movimientos.map((m) =>
            m.id === id ? { ...m, ...data } : m
          ),
        })),

      deleteMovimiento: (id) =>
        set((s) => ({
          movimientos: s.movimientos.filter((m) => m.id !== id),
        })),

      // ── Categorías ────────────────────────────────────────────────────────
      addCategoria: (data) =>
        set((s) => ({
          categoriasMovimientos: [
            ...s.categoriasMovimientos,
            { id: genId(), ...data },
          ],
        })),

      deleteCategoria: (id) =>
        set((s) => ({
          categoriasMovimientos: s.categoriasMovimientos.filter(
            (c) => c.id !== id
          ),
        })),

      // ── Config ────────────────────────────────────────────────────────────
      updateConfig: (data) =>
        set((s) => ({ config: { ...s.config, ...data } })),

      actualizarTasa: (tasa) =>
        set((s) => ({
          config: {
            ...s.config,
            tasaBCV: tasa,
            fechaTasaBCV: new Date().toISOString(),
          },
        })),

      // ── Import / Export ───────────────────────────────────────────────────
      exportData: () => {
        const { atletas, pagos, movimientos, categoriasMovimientos, config } = get();
        return JSON.stringify(
          { atletas, pagos, movimientos, categoriasMovimientos, config, exportedAt: new Date().toISOString() },
          null,
          2
        );
      },

      importData: (json) => {
        try {
          const data = JSON.parse(json);
          set({
            atletas: data.atletas ?? [],
            pagos: data.pagos ?? [],
            movimientos: data.movimientos ?? [],
            categoriasMovimientos: data.categoriasMovimientos ?? [
              ...defaultCategoriasIngreso,
              ...defaultCategoriasGasto,
            ],
            config: data.config ?? defaultConfig,
          });
        } catch {
          throw new Error('Archivo de datos inválido');
        }
      },
    }),
    {
      name: 'academia-spike-data',
    }
  )
);
