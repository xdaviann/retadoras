import { useStore } from '../store/useStore';

export function useExchangeRate() {
  const { config, actualizarTasa } = useStore();

  return {
    tasa: config.tasaBCV,
    fechaActualizacion: config.fechaTasaBCV,
    actualizarTasa,
  };
}
