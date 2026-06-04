import { CheckIcon, AlertCircleIcon, XIcon } from './Icons';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

export function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`} role="alert">
          {toast.type === 'success' ? (
            <CheckIcon size={16} />
          ) : (
            <AlertCircleIcon size={16} />
          )}
          <span style={{ flex: 1, fontSize: '0.875rem' }}>{toast.message}</span>
          <button
            className="btn btn-icon btn-ghost"
            style={{ width: 28, height: 28, minWidth: 28 }}
            onClick={() => removeToast(toast.id)}
            aria-label="Cerrar"
          >
            <XIcon size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
