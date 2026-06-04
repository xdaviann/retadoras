import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import logoUrl from '../assets/logo-retadoras.png';

export function Login() {
  const { login, isSubmitting } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Por favor ingresa tu correo y contraseña.');
      return;
    }

    try {
      await login(email.trim(), password);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        setError('Correo o contraseña incorrectos.');
      } else if (code === 'auth/email-already-in-use') {
        setError('Este correo ya está registrado. Inicia sesión.');
      } else if (code === 'auth/invalid-email') {
        setError('El correo no es válido.');
      } else if (code === 'auth/too-many-requests') {
        setError('Demasiados intentos fallidos. Intenta más tarde.');
      } else {
        setError('Ocurrió un error. Intenta nuevamente.');
        console.error(err);
      }
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
      padding: 'var(--sp-4)',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, oklch(0.25 0.07 160 / 0.35) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: 400,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)',
        padding: 'var(--sp-8)',
        boxShadow: '0 24px 64px oklch(0 0 0 / 0.4)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 'var(--sp-6)', gap: 'var(--sp-3)' }}>
          <img src={logoUrl} alt="Logo Club Retadoras" style={{ width: 64, height: 64, objectFit: 'contain' }} />
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--ink-primary)' }}>
              Club Retadoras
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
              Sistema de Finanzas · Administración
            </p>
          </div>
        </div>

        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="auth-email">Correo electrónico</label>
            <input
              id="auth-email"
              type="email"
              className="form-input"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              placeholder="admin@ejemplo.com"
              autoComplete="email"
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="auth-password">Contraseña</label>
            <input
              id="auth-password"
              type="password"
              className="form-input"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div style={{
              background: 'oklch(0.25 0.08 25 / 0.3)',
              border: '1px solid oklch(0.4 0.15 25)',
              borderRadius: 'var(--r-md)',
              padding: 'var(--sp-3)',
              marginBottom: 'var(--sp-3)',
              fontSize: '0.85rem',
              color: 'oklch(0.75 0.15 25)',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--sp-2)' }}
          >
            {isSubmitting ? 'Procesando...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
