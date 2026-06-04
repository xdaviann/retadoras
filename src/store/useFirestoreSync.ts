import { useEffect } from 'react';
import { onSnapshot, collection, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useStore, seedDefaultsIfEmpty } from './useStore';
import type { Atleta, Pago, Movimiento, CategoriaMovimiento, Config } from '../types';

/**
 * Subscribes to all Firestore collections and keeps the Zustand store in sync.
 * Mount this hook ONCE at the app root (inside the auth-gated zone).
 */
export function useFirestoreSync() {
  const _setData = useStore(s => s._setData);

  useEffect(() => {
    // Seed defaults on first run (idempotent)
    seedDefaultsIfEmpty().catch(console.error);

    let resolvedCount = 0;
    const TOTAL_COLLECTIONS = 5;

    function onResolved() {
      resolvedCount++;
      if (resolvedCount >= TOTAL_COLLECTIONS) {
        _setData({ dataLoading: false });
      }
    }

    // ── Atletas ───────────────────────────────────────────────────────────────
    const unsubAtletas = onSnapshot(collection(db, 'atletas'), (snap) => {
      const atletas = snap.docs.map(d => ({ id: d.id, ...d.data() } as Atleta));
      _setData({ atletas });
      onResolved();
    }, console.error);

    // ── Pagos ─────────────────────────────────────────────────────────────────
    const unsubPagos = onSnapshot(collection(db, 'pagos'), (snap) => {
      const pagos = snap.docs.map(d => ({ id: d.id, ...d.data() } as Pago));
      _setData({ pagos });
      onResolved();
    }, console.error);

    // ── Movimientos ───────────────────────────────────────────────────────────
    const unsubMovimientos = onSnapshot(collection(db, 'movimientos'), (snap) => {
      const movimientos = snap.docs.map(d => ({ id: d.id, ...d.data() } as Movimiento));
      _setData({ movimientos });
      onResolved();
    }, console.error);

    // ── Categorías ────────────────────────────────────────────────────────────
    const unsubCategorias = onSnapshot(collection(db, 'categorias'), (snap) => {
      const categoriasMovimientos = snap.docs.map(d => ({ id: d.id, ...d.data() } as CategoriaMovimiento));
      _setData({ categoriasMovimientos });
      onResolved();
    }, console.error);

    // ── Config (single document) ──────────────────────────────────────────────
    const unsubConfig = onSnapshot(doc(db, 'config', 'main'), (snap) => {
      if (snap.exists()) {
        _setData({ config: snap.data() as Config });
      }
      onResolved();
    }, console.error);

    return () => {
      unsubAtletas();
      unsubPagos();
      unsubMovimientos();
      unsubCategorias();
      unsubConfig();
    };
  }, [_setData]);
}
