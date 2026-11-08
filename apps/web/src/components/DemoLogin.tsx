import { useRef, useState, type FormEvent, type KeyboardEvent, type ClipboardEvent } from 'react';
import '../styles/auth.css';

type View = 'welcome' | 'login' | 'signup';

function BrandAside() {
  return (
    <aside className="auth-aside" aria-hidden="true">
      <a href="/" className="auth-aside-brand"><img src="/assets/proofly/proofly-symbol-white.svg" alt=""/>Proofly</a>
      <div className="auth-aside-body">
        <img className="auth-aside-art" src="/assets/proofly/ilustracion-crecer.png" alt=""/>
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
      <img className="auth-welcome-art" src="/assets/proofly/ilustracion-crecer.png" alt=""/>
      <h1>Invierte y anticipa tu capital</h1>
      <p className="auth-welcome-sub">Todo desde una sola cuenta.</p>
      <p className="auth-welcome-lead">Haz crecer tu dinero con inversiones seleccionadas y obtén liquidez inmediata anticipando tus facturas o pagos.</p>
      <button className="auth-primary" onClick={onSignup}>Crear cuenta en Proofly</button>
      <button className="auth-link" onClick={onLogin}>Iniciar sesión</button>
      <div className="auth-dots" aria-hidden="true"><i className="is-active"/><i/><i/></div>
    </div>
  );
}

function PinField({ digits, setDigits, disabled, invalid }: {
  digits: string[]; setDigits: (next: string[]) => void; disabled: boolean; invalid: boolean;
}) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  function enter(value: string, index: number) {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length > 1) {
      const next = ['', '', '', ''];
      numbers.slice(0, 4).split('').forEach((digit, i) => { next[i] = digit; });
      setDigits(next); inputs.current[Math.min(numbers.length, 3)]?.focus();
    } else {
      setDigits(digits.map((digit, i) => i === index ? numbers : digit));
      if (numbers && index < 3) inputs.current[index + 1]?.focus();
    }
  }
  function paste(event: ClipboardEvent<HTMLInputElement>, index: number) { event.preventDefault(); enter(event.clipboardData.getData('text'), index); }
  function key(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key === 'ArrowLeft' && index > 0) { event.preventDefault(); inputs.current[index - 1]?.focus(); }
    if (event.key === 'ArrowRight' && index < 3) { event.preventDefault(); inputs.current[index + 1]?.focus(); }
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault(); setDigits(digits.map((digit, i) => i === index - 1 ? '' : digit)); inputs.current[index - 1]?.focus();
    }
  }
  return (
    <fieldset className="auth-pin" disabled={disabled}>
      <legend>PIN de acceso</legend>
      <div className="proofly-pin-grid">
        {digits.map((digit, i) => <input key={i} ref={element => { inputs.current[i] = element; }} data-pin-digit
          type="password" inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={i === 0 ? 4 : 1}
          required pattern="[0-9]" value={digit} aria-label={`Dígito ${i + 1} del PIN`} aria-invalid={invalid}
          onChange={event => enter(event.target.value, i)} onPaste={event => paste(event, i)} onKeyDown={event => key(event, i)} />)}
      </div>
    </fieldset>
  );
}

export function DemoLogin() {
  const [view, setView] = useState<View>('welcome');
  const [digits, setDigits] = useState(['', '', '', '']);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  function reset(next: View) { setView(next); setError(''); setDigits(['', '', '', '']); }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !/^\d{4}$/.test(digits.join(''))) { setError('Ingresa tu PIN de cuatro dígitos.'); return; }
    setPending(true); setError('');
    try {
      const response = await fetch('/api/demo/session', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: digits.join('') }),
      });
      if (response.ok) { window.location.assign('/app/'); return; }
      setDigits(['', '', '', '']);
      setError(response.status === 429 ? 'Demasiados intentos. Espera 15 minutos y vuelve a intentarlo.'
        : response.status === 503 || response.status === 404 ? 'El acceso aún no está disponible. Inténtalo más tarde.'
        : 'El PIN no es correcto. Vuelve a intentarlo.');
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
              <p className="auth-form-lead">Entra con el correo de tu cuenta y tu PIN de acceso.</p>
              <form onSubmit={signIn} className="auth-form">
                <label className="auth-label">Correo electrónico
                  <input type="email" name="email" autoComplete="email" placeholder="tu@correo.com" required/>
                </label>
                <PinField digits={digits} setDigits={setDigits} disabled={pending} invalid={Boolean(error)} />
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
              <p className="auth-form-lead">Déjanos tus datos y te damos acceso a Proofly.</p>
              <form onSubmit={event => { event.preventDefault(); reset('login'); }} className="auth-form">
                <label className="auth-label">Nombre completo
                  <input type="text" name="name" autoComplete="name" placeholder="Tu nombre" required minLength={3} maxLength={80}/>
                </label>
                <label className="auth-label">Correo electrónico
                  <input type="email" name="email" autoComplete="email" placeholder="tu@correo.com" required/>
                </label>
                <label className="auth-label">Documento (NIT o cédula)
                  <input type="text" name="taxId" inputMode="numeric" placeholder="1098765432" required/>
                </label>
                <p className="auth-note">El registro abierto está en preparación. Por ahora el acceso se habilita con un PIN que te compartimos; al continuar te llevamos al inicio de sesión.</p>
                <button type="submit" className="auth-primary">Continuar</button>
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
