import { useState, type FormEvent } from 'react';
import '../styles/auth.css';

type View = 'welcome' | 'login' | 'signup';

function BrandAside() {
  return (
    <aside className="auth-aside" aria-hidden="true">
      <a href="/" className="auth-aside-brand">Proofly</a>
      <div className="auth-aside-body">
        <img className="auth-aside-art" src="/assets/proofly/ilustracion-crecer.webp" alt="" width={400} height={400} decoding="async"/>
        <h2>Invierte y anticipa tu capital.</h2>
        <p>Haz crecer tu dinero con participaciones en operaciones, o anticipa el cobro de tus facturas e hitos. Todo desde una sola cuenta.</p>
      </div>
      <p className="auth-aside-foot">Montos en pesos colombianos · Respaldo sobre entregas confirmadas</p>
    </aside>
  );
}

function Welcome({ onSignup, onLogin }: { onSignup: () => void; onLogin: () => void }) {
  return (
    <div className="auth-welcome">
      {/* Brand pitch — shown on mobile, where the violet aside is hidden. */}
      <div className="auth-welcome-brand">
        <img className="auth-welcome-art" src="/assets/proofly/ilustracion-crecer.webp" alt="" width={400} height={400} decoding="async"/>
        <h1>Invierte y anticipa tu capital</h1>
        <p className="auth-welcome-sub">Todo desde una sola cuenta.</p>
        <p className="auth-welcome-lead">Haz crecer tu dinero con inversiones seleccionadas y obtén liquidez inmediata anticipando tus facturas o pagos.</p>
      </div>

      {/* Greeting + action — shown on desktop, where the aside already carries the pitch. */}
      <div className="auth-welcome-greeting">
        <span className="auth-welcome-eyebrow">Te damos la bienvenida</span>
        <h1>Empecemos</h1>
        <p className="auth-welcome-lead">Crea tu cuenta en un minuto o entra si ya tienes una. La verificación de identidad va después, sin fricción.</p>
      </div>

      <div className="auth-welcome-actions">
        <button className="auth-primary" onClick={onSignup}>Crear cuenta en Proofly</button>
        <button className="auth-secondary" onClick={onLogin}>Ya tengo cuenta</button>
      </div>
    </div>
  );
}

async function post(path: string, body: Record<string, unknown>) {
  const response = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data } as const;
}

export function AuthScreen() {
  const [view, setView] = useState<View>('welcome');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  function reset(next: View) { setView(next); setError(''); }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true); setError('');
    try {
      const { ok, status } = await post('/api/auth/login', { email: form.get('email'), password: form.get('password') });
      if (ok) { window.location.assign('/app/'); return; }
      setError(status === 429 ? 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.'
        : status === 401 ? 'Correo o contraseña incorrectos.'
        : 'No pudimos iniciar sesión. Inténtalo de nuevo.');
    } catch { setError('No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.'); }
    finally { setPending(false); }
  }

  async function signUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true); setError('');
    try {
      const { ok, status, data } = await post('/api/auth/signup', {
        email: form.get('email'), taxId: form.get('taxId'), password: form.get('password'),
      });
      if (ok) { window.location.assign('/app/'); return; }
      setError(status === 409 ? 'Ya existe una cuenta con este correo.'
        : status === 429 ? 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.'
        : (data as { message?: string }).message || 'Revisa los datos e inténtalo de nuevo.');
    } catch { setError('No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.'); }
    finally { setPending(false); }
  }

  return (
    <main className="auth-shell text-ink">
      <BrandAside />
      <section className="auth-panel">
        <div className="auth-card">
          {view === 'welcome' && <Welcome onSignup={() => reset('signup')} onLogin={() => reset('login')} />}

          {view === 'login' && (
            <div className="auth-form-wrap">
              <button className="auth-back" onClick={() => reset('welcome')} aria-label="Volver">←</button>
              <h1>Bienvenido de vuelta</h1>
              <p className="auth-form-lead">Entra con el correo y la contraseña de tu cuenta.</p>
              <form onSubmit={signIn} className="auth-form">
                <label className="auth-label">Correo electrónico
                  <input type="email" name="email" autoComplete="email" placeholder="tu@correo.com" required/>
                </label>
                <label className="auth-label">Contraseña
                  <input type="password" name="password" autoComplete="current-password" placeholder="Tu contraseña" required minLength={8}/>
                </label>
                {error && <p role="alert" className="auth-error">{error}</p>}
                <button type="submit" disabled={pending} className="auth-primary">{pending ? 'Verificando…' : 'Iniciar sesión'}</button>
              </form>
              <p className="auth-switch">¿Aún no tienes cuenta? <button onClick={() => reset('signup')}>Créala aquí</button></p>
            </div>
          )}

          {view === 'signup' && (
            <div className="auth-form-wrap">
              <button className="auth-back" onClick={() => reset('welcome')} aria-label="Volver">←</button>
              <h1>Crea tu cuenta</h1>
              <p className="auth-form-lead">Con una sola cuenta puedes invertir y anticipar tu capital.</p>
              <form onSubmit={signUp} className="auth-form">
                <label className="auth-label">Correo electrónico
                  <input type="email" name="email" autoComplete="email" placeholder="tu@correo.com" required/>
                </label>
                <label className="auth-label">Documento (NIT o cédula)
                  <input type="text" name="taxId" inputMode="numeric" pattern="\d{5,20}" placeholder="1098765432" required/>
                </label>
                <label className="auth-label">Contraseña
                  <input type="password" name="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" required minLength={8}/>
                </label>
                <p className="auth-note">Verificaremos tu identidad (KYC) después de crear tu cuenta. Tu nombre legal se toma de esa verificación.</p>
                {error && <p role="alert" className="auth-error">{error}</p>}
                <button type="submit" disabled={pending} className="auth-primary">{pending ? 'Creando cuenta…' : 'Crear cuenta'}</button>
              </form>
              <p className="auth-switch">¿Ya tienes cuenta? <button onClick={() => reset('login')}>Inicia sesión</button></p>
            </div>
          )}

          <a href="/" className="auth-home">Volver al inicio</a>
        </div>
      </section>
    </main>
  );
}
