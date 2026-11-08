import { useRef, useState, type FormEvent, type KeyboardEvent, type ClipboardEvent } from 'react';

export function DemoLogin() {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  function enter(value: string, index: number) {
    const numbers = value.replace(/\D/g, '');
    setError('');
    if (numbers.length > 1) {
      const next = ['', '', '', ''];
      numbers.slice(0, 4).split('').forEach((digit, i) => { next[i] = digit; });
      setDigits(next); inputs.current[Math.min(numbers.length, 3)]?.focus();
    } else {
      setDigits(previous => previous.map((digit, i) => i === index ? numbers : digit));
      if (numbers && index < 3) inputs.current[index + 1]?.focus();
    }
  }
  function paste(event: ClipboardEvent<HTMLInputElement>, index: number) {
    event.preventDefault(); enter(event.clipboardData.getData('text'), index);
  }
  function key(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key === 'ArrowLeft' && index > 0) { event.preventDefault(); inputs.current[index - 1]?.focus(); }
    if (event.key === 'ArrowRight' && index < 3) { event.preventDefault(); inputs.current[index + 1]?.focus(); }
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault(); setDigits(previous => previous.map((digit, i) => i === index - 1 ? '' : digit)); inputs.current[index - 1]?.focus();
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !/^\d{4}$/.test(digits.join(''))) return;
    setPending(true); setError('');
    try {
      const response = await fetch('/api/demo/session', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: digits.join('') }),
      });
      if (response.ok) { window.location.assign('/app/'); return; }
      setDigits(['', '', '', '']); inputs.current[0]?.focus();
      setError(response.status === 429 ? 'Demasiados intentos. Espera 15 minutos y vuelve a intentarlo.'
        : response.status === 503 || response.status === 404 ? 'El acceso aún no está disponible. Inténtalo más tarde.' : 'El PIN no es correcto. Vuelve a intentarlo.');
    } catch { setError('No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.'); }
    finally { setPending(false); }
  }
  return (
    <main className="proofly-login text-ink">
      <div className="proofly-login-card">
        <a href="/" className="font-script text-3xl text-ink inline-flex min-h-11 items-center">Proofly</a>
        <div className="mt-8 text-electric text-[11px] font-extrabold tracking-widest uppercase">Acceso seguro</div>
        <h1 className="mt-3 font-extrabold text-3xl tracking-tight">Entra a tu cuenta</h1>
        <p className="mt-4 text-sm text-ink-soft leading-relaxed">Ingresa tu PIN de cuatro dígitos para entrar a Proofly.</p>
        <form className="mt-7" onSubmit={submit}>
          <fieldset disabled={pending}>
            <legend className="block text-sm font-bold mb-3">PIN de acceso</legend>
            <div className="proofly-pin-grid">
              {digits.map((digit, i) => <input key={i} ref={element => { inputs.current[i] = element; }} data-pin-digit
                type="password" inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={i === 0 ? 4 : 1}
                required pattern="[0-9]" value={digit} aria-label={`Dígito ${i + 1} del PIN`}
                aria-invalid={Boolean(error)} aria-describedby={error ? 'pin-error' : undefined}
                onChange={event => enter(event.target.value, i)} onPaste={event => paste(event, i)} onKeyDown={event => key(event, i)} />)}
            </div>
          </fieldset>
          {error && <p id="pin-error" role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
          <button type="submit" disabled={pending} className="mt-7 min-h-12 w-full rounded-full bg-electric hover:bg-electric-dark text-white font-bold text-sm px-6 py-3 disabled:opacity-60 transition-colors">{pending ? 'Verificando…' : 'Entrar'}</button>
        </form>
        <a href="/" className="mt-5 min-h-11 flex items-center justify-center text-sm text-electric hover:underline">Volver al inicio</a>
      </div>
    </main>
  );
}
