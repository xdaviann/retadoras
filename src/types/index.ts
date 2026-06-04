// ─── Core Entities ───────────────────────────────────────────────────────────

export type Categoria = 'Grupo A' | 'Grupo B';

export type MetodoPago = 'pago_movil' | 'efectivo_bs' | 'efectivo_usd' | 'exonerado';

export type TipoMovimiento = 'ingreso' | 'gasto';

export type MonedaMovimiento = 'bs' | 'usd';

// ─── Atleta ──────────────────────────────────────────────────────────────────

export interface Atleta {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  fechaNacimiento: string; // ISO date string
  categoria: Categoria;
  telefono: string;
  email?: string;
  activa: boolean;
  fechaIngreso: string; // ISO date string
  notas?: string;
}

// ─── Pago de Mensualidad ─────────────────────────────────────────────────────

export interface Pago {
  id: string;
  atletaId: string;
  mes: number; // 1-12
  anio: number;
  monto: number;       // Monto en Bs.
  montoDolar?: number; // Si se pagó en USD
  metodoPago: MetodoPago;
  referencia?: string; // Número de referencia para pago móvil
  tasaCambio: number;  // Tasa BCV usada al momento del pago
  fecha: string;       // ISO date string
  notas?: string;
}

// ─── Movimiento Financiero General ───────────────────────────────────────────

export interface Movimiento {
  id: string;
  tipo: TipoMovimiento;
  categoriaId: string;
  descripcion: string;
  monto: number;          // Siempre en Bs.
  montoDolar?: number;    // Equivalente en USD (calculado)
  moneda: MonedaMovimiento;
  metodoPago: MetodoPago;
  referencia?: string;
  tasaCambio: number;
  fecha: string;          // ISO date string
  notas?: string;
}

// ─── Categoría de Movimiento ─────────────────────────────────────────────────

export interface CategoriaMovimiento {
  id: string;
  nombre: string;
  tipo: TipoMovimiento;
  icono?: string;
}

// ─── Configuración ───────────────────────────────────────────────────────────

export interface Config {
  nombreAcademia: string;
  tasaBCV: number;
  fechaTasaBCV: string;    // ISO date string
  mensualidadBase: number; // En USD
}

// ─── Estadísticas del Dashboard ──────────────────────────────────────────────

export interface ResumenMes {
  mes: number;
  anio: number;
  ingresosMensualidades: number;
  ingresosOtros: number;
  gastos: number;
  totalIngresos: number;
  balance: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const METODOS_PAGO: Record<MetodoPago, string> = {
  pago_movil: 'Pago Móvil Bs.',
  efectivo_bs: 'Efectivo Bs.',
  efectivo_usd: 'Efectivo USD',
  exonerado: 'Exonerado',
};

export const MESES: string[] = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
