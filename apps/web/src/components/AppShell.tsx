import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import '../styles/app-shell.css';

type Page = 'home' | 'invest' | 'raise' | 'activity';
type Operation = {
  id: string; freelancerId: string; title: string; assetType: 'INVOICE' | 'MILESTONE'; payerLegalName: string;
  nominalAmountCents: string; advanceAmountCents: string; prooflyFeeCents: string; commercialDiscountCents: string;
  fundedCapitalCents: string; remainingFundingCents: string; termDays: number; dueDate: string; status: string;
  effectiveAnnualRate: number; freelancerExecutionScore: number; payerSolvencyScore: number;
};
type Projection = { fundedCapitalCents: string; netEstimatedProfitCents: string; totalEstimatedPayoutCents: string; effectiveAnnualRate: number };
type Snapshot = {
  me: { id: string; name: string; tier: string; availableLimitCents: string; maxQuotaCents: string; executionScore: number };
  operations: Operation[];
  investments: { id: string; operationId: string; fundedCapitalCents: string; projection: Projection; settlement?: { profitEarnedCents: string; totalDistributedCents: string } }[];
  events: { id: string; operationId: string; kind: string; title: string; date: string }[];
};
const NAV: { id: Page; label: string; icon: string }[] = [
  { id: 'home', label: 'Inicio', icon: 'home' },
  { id: 'invest', label: 'Invertir', icon: 'growth' },
  { id: 'raise', label: 'Anticipar', icon: 'bolt' },
  { id: 'activity', label: 'Actividad', icon: 'clock' },
];
const STATUS: Record<string, string> = {
  PENDING_CLIENT_CONFIRMATION: 'Por confirmar', QUOTED: 'Cotización lista', APPROVED_PENDING_FUNDING: 'Disponible',
  ACTIVE_FUNDED: 'Fondeada', DISBURSED: 'Desembolsada', SETTLED: 'Liquidada', PARTIALLY_SETTLED_OVERDUE: 'Recaudo parcial',
};
const TIER: Record<string, string> = { TIER_1_SEED: 'Semilla', TIER_2_GROWTH: 'Crecimiento', TIER_3_PRO: 'Pro' };
const money = (value: string | bigint) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value) / 100);
const percent = (rate: number) => (rate * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + '% E.A.';
const sum = (values: string[]) => values.reduce((total, value) => total + BigInt(value || '0'), 0n);
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('') || 'P';
const firstName = (name: string) => name.split(/\s+/)[0] || name;
function cents(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error('Ingresa un valor positivo.');
  const [whole, decimals = ''] = value.split('.');
  const result = BigInt(whole) * 100n + BigInt(decimals.padEnd(2, '0'));
  if (result <= 0n) throw new Error('El valor debe ser mayor que cero.');
  return result.toString();
}
function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-8h6v8"/></>,
    growth: <><path d="M4 20V10M10 20V6M16 20V13M22 20H2M4 5l5-3 5 4 7-4M17 2h4v4"/></>,
    bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    bell: <><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    file: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6"/></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>, plus: <path d="M12 5v14M5 12h14"/>, close: <path d="m6 6 12 12M18 6 6 18"/>,
    check: <path d="m5 12 4 4L19 6"/>, exit: <><path d="M10 4H5v16h5M14 7l5 5-5 5M9 12h10"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.file}</svg>;
}
function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); return () => { ref.current?.close(); }; }, []);
  return <dialog ref={ref} className="app-sheet" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }} aria-labelledby="app-sheet-title">
    <div className="app-sheet-head"><h2 id="app-sheet-title">{title}</h2><button className="app-icon-btn" aria-label="Cerrar" onClick={onClose}><Icon name="close"/></button></div>{children}
  </dialog>;
}

export default function AppShell() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [page, setPage] = useState<Page>(() => { const hash = location.hash.slice(1); return NAV.some(item => item.id === hash) ? hash as Page : 'home'; });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [kind, setKind] = useState('INVOICE');
  const [amount, setAmount] = useState('250000');
  const [accepted, setAccepted] = useState(false);
  const [notice, setNotice] = useState('');
  const [sheet, setSheet] = useState<'none' | 'settings' | 'notifications'>('none');
  const [seen, setSeen] = useState<string>(() => { try { return localStorage.getItem('proofly-seen-event') || ''; } catch { return ''; } });
  const [acctMsg, setAcctMsg] = useState('');
  const [acctErr, setAcctErr] = useState('');

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const legalName = new FormData(event.currentTarget).get('legalName');
    setAcctMsg(''); setAcctErr('');
    try {
      const r = await fetch('/api/account/profile', { method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ legalName }) });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((body as { message?: string }).message || 'No pudimos guardar tu nombre.');
      await refresh(); setAcctMsg('Nombre actualizado.');
    } catch (e) { setAcctErr(e instanceof Error ? e.message : 'No pudimos guardar.'); }
  }
  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setAcctMsg(''); setAcctErr('');
    try {
      const r = await fetch('/api/account/password', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: data.get('current'), newPassword: data.get('next') }) });
      const body = await r.json().catch(() => ({}));
      if (r.status === 403) throw new Error('Tu contraseña actual no es correcta.');
      if (!r.ok) throw new Error((body as { message?: string }).message || 'No pudimos cambiar la contraseña.');
      form.reset(); setAcctMsg('Contraseña actualizada.');
    } catch (e) { setAcctErr(e instanceof Error ? e.message : 'No pudimos cambiar la contraseña.'); }
  }

  async function request(path: string, init?: RequestInit) {
    const response = await fetch(path, { credentials: 'same-origin', ...init });
    if (response.status === 401) { location.assign('/login'); throw new Error('Tu sesión terminó.'); }
    const body = await response.json();
    if (!response.ok) {
      const message = String(body.message || '');
      const map: [RegExp, string][] = [
        [/active operation limit/i, 'Tu nivel permite una operación activa. Liquida la actual para crear otra.'],
        [/exceeds available limit/i, 'El monto supera tu cupo disponible.'],
        [/remaining|exceeds.*funding/i, 'El aporte supera el fondeo que falta.'],
        [/own operation/i, 'No puedes invertir en una operación tuya.'],
        [/already have a participation/i, 'Ya tienes un aporte en esta operación.'],
      ];
      throw new Error(map.find(([re]) => re.test(message))?.[1] || 'Acción no disponible. Revisa los datos.');
    }
    return body;
  }
  async function refresh() { setData(await request('/api/app')); }
  useEffect(() => { let alive = true; request('/api/app').then(v => { if (alive) setData(v); }).catch(r => { if (alive) setError(r.message); }); return () => { alive = false; }; }, []);
  useEffect(() => { const h = () => { const hash = location.hash.slice(1); if (NAV.some(i => i.id === hash)) setPage(hash as Page); }; addEventListener('hashchange', h); return () => removeEventListener('hashchange', h); }, []);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(''), 4000); return () => clearTimeout(t); }, [notice]);
  function go(next: Page) { setPage(next); location.hash = next; scrollTo({ top: 0, behavior: 'auto' }); }
  function open(op: Operation) { setSelected(op.id); setAmount('250000'); setAccepted(false); setError(''); }
  async function mutate(action: string, input: Record<string, unknown> = {}) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await request('/api/app/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...input }) });
      await refresh(); setNotice('Operación actualizada.');
      return result;
    } catch (r) { setError(r instanceof Error ? r.message : 'No pudimos completar la acción.'); }
    finally { setBusy(false); }
  }
  async function logout() {
    try { const r = await fetch('/api/auth/session', { method: 'DELETE', credentials: 'same-origin' }); if (!r.ok) throw new Error(); location.assign('/login'); }
    catch { setError('No pudimos cerrar la sesión.'); }
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const checks = kind === 'MILESTONE' ? form.has('ready') : ['validated', 'received', 'delivered', 'accepted'].every(k => form.has(k));
      const result = await mutate('create', { assetType: kind, title: form.get('title'), payerLegalName: form.get('company'), nominalAmountCents: cents(String(form.get('amount'))), termDays: Number(form.get('term')), checks });
      if (result) { setCreating(false); setSelected(result.id); go('raise'); }
    } catch (r) { setError(r instanceof Error ? r.message : 'Revisa los datos.'); }
  }

  if (!data) return <main className="app-boot"><div className="font-script text-3xl text-electric">Proofly</div><p role="status">{error || 'Preparando tu espacio…'}</p>{error && <button className="app-primary" onClick={() => location.reload()}>Reintentar</button>}</main>;

  const mine = data.operations.filter(op => op.freelancerId === data.me.id);
  const market = data.operations.filter(op => op.status === 'APPROVED_PENDING_FUNDING' && op.freelancerId !== data.me.id);
  const active = data.operations.find(op => op.id === selected);
  const invested = sum(data.investments.map(i => i.fundedCapitalCents));
  const profit = sum(data.investments.map(i => i.projection?.netEstimatedProfitCents || '0'));
  const tier = TIER[data.me.tier] || 'Semilla';
  const ownActive = active ? active.freelancerId === data.me.id : false;
  const unread = (() => { let n = 0; for (const ev of data.events) { if (ev.id === seen) break; n++; } return n; })();
  function openNotifications() { setSheet('notifications'); const latest = data?.events[0]?.id || ''; setSeen(latest); try { localStorage.setItem('proofly-seen-event', latest); } catch { /* ignore */ } }

  const opRow = (op: Operation) => <button key={op.id} className="app-row" onClick={() => open(op)}>
    <span className="app-row-icon"><Icon name={op.assetType === 'MILESTONE' ? 'growth' : 'file'} size={20}/></span>
    <span className="app-row-body"><strong>{op.title}</strong><span>{op.payerLegalName} · {op.termDays} días</span></span>
    <span className="app-row-end"><strong>{money(op.nominalAmountCents)}</strong><span className="app-row-rate">{percent(op.effectiveAnnualRate)}</span></span>
  </button>;

  return <div className="proofly-app">
    <div className="app-shell">
      <header className="app-top">
        <button className="app-id" onClick={() => setSheet('settings')} aria-label="Abrir tu cuenta"><span className="app-avatar">{initials(data.me.name)}</span><div><span>¡Hola, {firstName(data.me.name)}!</span><strong>Nivel {tier}</strong></div></button>
        <button className="app-icon-btn app-bell" onClick={openNotifications} aria-label={unread ? `Notificaciones, ${unread} sin leer` : 'Notificaciones'}><Icon name="bell" size={20}/>{unread > 0 && <span className="app-badge" aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}</button>
      </header>

      <main className="app-main">
        {error && !active && !creating && <p className="app-error" role="alert">{error}</p>}

        {page === 'home' && <>
          <h1 className="app-title">Tu capital,<br/>más flexible</h1>
          <div className="app-twin">
            <button className="app-twin-card" onClick={() => go('invest')}>
              <img src="/assets/proofly/ilustracion-crecer.png" alt="" width={96} height={96}/>
              <h3>Invertir</h3><p>Haz crecer tu capital en operaciones.</p><span className="app-twin-go"><Icon name="arrow" size={18}/></span>
            </button>
            <button className="app-twin-card" onClick={() => { setKind('INVOICE'); setCreating(true); }}>
              <img src="/assets/proofly/ilustracion-tiempo.png" alt="" width={96} height={96}/>
              <h3>Anticipar</h3><p>Adelanta el cobro de tus facturas.</p><span className="app-twin-go"><Icon name="arrow" size={18}/></span>
            </button>
          </div>
          <section className="app-balance">
            <div className="app-balance-row">
              <div><span>Capital invertido</span><strong>{money(invested)}</strong></div>
              <div><span>Cupo para anticipar</span><strong>{money(data.me.availableLimitCents)}</strong></div>
            </div>
            <p className="app-balance-note">Ganancia estimada {money(profit)} · retorno no garantizado</p>
          </section>
          <div className="app-sec-head"><h2>Actividad reciente</h2>{data.events.length > 0 && <button className="app-link" onClick={() => go('activity')}>Ver todo</button>}</div>
          {data.events.length
            ? <div className="app-list">{data.events.slice(0, 3).map(ev => <div key={ev.id} className="app-act"><span className="app-row-icon"><Icon name={ev.kind === 'settle' ? 'check' : 'clock'} size={18}/></span><div><strong>{ev.title}</strong><span>{new Date(ev.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</span></div></div>)}</div>
            : <p className="app-muted">Aún no tienes movimientos. Empieza invirtiendo o anticipando.</p>}
        </>}

        {page === 'invest' && <>
          <h1 className="app-title">Invertir</h1>
          <p className="app-lead">Aporta capital a operaciones de otros y recibe un retorno al vencimiento.</p>
          {market.length
            ? <div className="app-list">{market.map(opRow)}</div>
            : <p className="app-muted">Pronto habrá operaciones disponibles para invertir.</p>}
        </>}

        {page === 'raise' && <>
          <div className="app-sec-head"><h1 className="app-title">Anticipar</h1><button className="app-primary app-primary-sm" onClick={() => { setKind('INVOICE'); setCreating(true); }}><Icon name="plus" size={16}/>Nueva</button></div>
          <p className="app-lead">Adelanta el cobro de tus facturas e hitos. Cupo disponible {money(data.me.availableLimitCents)}.</p>
          {mine.length
            ? <div className="app-list">{mine.map(opRow)}</div>
            : <p className="app-muted">Crea tu primera factura o hito para ver una cotización.</p>}
        </>}

        {page === 'activity' && <>
          <h1 className="app-title">Actividad</h1>
          {data.events.length
            ? <div className="app-list">{data.events.map(ev => <button key={ev.id} className="app-act" onClick={() => { const op = data.operations.find(o => o.id === ev.operationId); if (op) open(op); }}><span className="app-row-icon"><Icon name={ev.kind === 'settle' ? 'check' : 'clock'} size={18}/></span><div><strong>{ev.title}</strong><span>{new Date(ev.date).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}</span></div><Icon name="arrow" size={16}/></button>)}</div>
            : <p className="app-muted">Aquí verás cada movimiento de tu cuenta.</p>}
        </>}
      </main>

      <nav className="app-dock" aria-label="Navegación">{NAV.map(item => <button key={item.id} onClick={() => go(item.id)} aria-current={page === item.id ? 'page' : undefined}><Icon name={item.icon} size={22}/><span>{item.label}</span></button>)}</nav>
    </div>

    {notice && <div className="app-toast" role="status">{notice}</div>}

    {sheet === 'settings' && <Modal title="Ajustes" onClose={() => { setSheet('none'); setAcctMsg(''); setAcctErr(''); }}>
      <div className="app-settings">
        <div className="app-settings-id"><span className="app-avatar app-avatar-lg">{initials(data.me.name)}</span><div><strong>{data.me.name}</strong><span>Nivel {tier} · cupo {money(data.me.availableLimitCents)}</span></div></div>

        {acctMsg && <p className="app-ok" role="status">{acctMsg}</p>}
        {acctErr && <p className="app-error" role="alert">{acctErr}</p>}

        <form className="app-settings-group" onSubmit={saveProfile}>
          <h3>Perfil</h3>
          <label className="app-form-label">Nombre completo<input name="legalName" defaultValue={data.me.name} required minLength={3} maxLength={80}/></label>
          <button className="app-secondary" type="submit">Guardar nombre</button>
        </form>

        <form className="app-settings-group" onSubmit={savePassword}>
          <h3>Contraseña</h3>
          <label className="app-form-label">Contraseña actual<input name="current" type="password" autoComplete="current-password" required minLength={8}/></label>
          <label className="app-form-label">Nueva contraseña<input name="next" type="password" autoComplete="new-password" required minLength={8} placeholder="Mínimo 8 caracteres"/></label>
          <button className="app-secondary" type="submit">Cambiar contraseña</button>
        </form>

        <div className="app-settings-group">
          <h3>Tu nivel</h3>
          <dl className="app-settings-facts">
            <div><dt>Nivel actual</dt><dd>{tier}</dd></div>
            <div><dt>Cupo máximo</dt><dd>{money(data.me.maxQuotaCents)}</dd></div>
            <div><dt>Puntaje de entrega</dt><dd>{data.me.executionScore}/100</dd></div>
            <div><dt>Capital invertido</dt><dd>{money(invested)}</dd></div>
          </dl>
          <p className="app-muted">Tu nivel sube al liquidar operaciones: Semilla → Crecimiento → Pro.</p>
        </div>

        <button className="app-signout" onClick={logout}><Icon name="exit" size={18}/>Salir de la cuenta</button>
      </div>
    </Modal>}

    {sheet === 'notifications' && <Modal title="Notificaciones" onClose={() => setSheet('none')}>
      {data.events.length
        ? <div className="app-list">{data.events.map(ev => <button key={ev.id} className="app-act" onClick={() => { const op = data.operations.find(o => o.id === ev.operationId); setSheet('none'); if (op) open(op); }}><span className="app-row-icon"><Icon name={ev.kind === 'settle' ? 'check' : ev.kind === 'participate' ? 'growth' : 'bell'} size={18}/></span><div><strong>{ev.title}</strong><span>{new Date(ev.date).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}</span></div><Icon name="chevron" size={16}/></button>)}</div>
        : <p className="app-muted">No tienes notificaciones. Aquí verás cuando tus operaciones avancen.</p>}
    </Modal>}

    {creating && <Modal title="Nueva operación" onClose={() => { setCreating(false); setError(''); }}><form onSubmit={create} className="app-form">
      <label>Tipo<select value={kind} onChange={e => setKind(e.target.value)}><option value="INVOICE">Factura</option><option value="MILESTONE">Hito</option></select></label>
      <label>Título<input name="title" required minLength={3} maxLength={80} placeholder="Diseño de identidad"/></label>
      <label>Empresa pagadora<input name="company" required maxLength={80} placeholder="Estudio Nube"/></label>
      <div className="app-form-pair"><label>Valor (COP)<input name="amount" type="number" required min="1000" step="1000" defaultValue="1000000"/></label><label>Plazo<select name="term" defaultValue="30"><option value="15">15 días</option><option value="30">30 días</option><option value="45">45 días</option><option value="60">60 días</option><option value="90">90 días</option></select></label></div>
      <fieldset className="app-checks"><legend>{kind === 'INVOICE' ? 'Confirma los eventos de la factura' : 'Confirma el entregable'}</legend>{(kind === 'INVOICE' ? [['validated','Validación DIAN'],['received','Acuse de recibo'],['delivered','Entrega realizada'],['accepted','Aceptación del pagador']] : [['ready','El entregable está listo']]).map(([n,l]) => <label key={n}><input name={n} type="checkbox" required/>{l}</label>)}</fieldset>
      {error && <p className="app-error" role="alert">{error}</p>}
      <button className="app-primary" disabled={busy}>{busy ? 'Creando…' : 'Crear y cotizar'}</button>
    </form></Modal>}

    {active && !creating && <Modal title={active.title} onClose={() => { setSelected(null); setError(''); }}>
      <div className="app-detail-top"><span className="app-tag">{active.assetType === 'INVOICE' ? 'Factura' : 'Hito'}</span><span className="app-tag app-tag-plain">{STATUS[active.status]}</span></div>
      <div className="app-detail-hero"><span>Valor del entregable</span><strong>{money(active.nominalAmountCents)}</strong><p>{active.payerLegalName} · {active.termDays} días · {percent(active.effectiveAnnualRate)}</p></div>
      <dl className="app-detail-facts"><div><dt>Adelanto neto</dt><dd>{money(active.advanceAmountCents)}</dd></div><div><dt>Comisión</dt><dd>{money(active.prooflyFeeCents)}</dd></div><div><dt>Fondeo pendiente</dt><dd>{money(active.remainingFundingCents)}</dd></div></dl>

      {active.status === 'PENDING_CLIENT_CONFIRMATION' && <button className="app-primary" disabled={busy} onClick={() => mutate('confirm', { id: active.id })}>Confirmar pago de la empresa</button>}
      {active.status === 'QUOTED' && <div className="app-panel"><label className="app-checkbox"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)}/>Acepto la cotización y la cesión de derechos.</label><button className="app-primary" disabled={!accepted || busy} onClick={() => mutate('accept', { id: active.id, accepted })}>Aceptar cotización</button></div>}
      {active.status === 'APPROVED_PENDING_FUNDING' && (ownActive
        ? <p className="app-muted">Esta operación está disponible para que otros financiadores aporten capital.</p>
        : (() => {
            let cents_ = 0n; try { cents_ = BigInt(cents(amount || '0')); } catch { /* invalid in-progress input */ }
            const remaining = BigInt(active.remainingFundingCents);
            const over = cents_ > remaining;
            const estProfit = cents_ > 0n ? (cents_ * BigInt(Math.round(active.effectiveAnnualRate * active.termDays / 365 * 1e6))) / 1000000n : 0n;
            const total = cents_ + estProfit;
            return <div className="app-invest">
              <div className="app-invest-rate"><span>Retorno</span><strong>{percent(active.effectiveAnnualRate)}</strong><span>a {active.termDays} días</span></div>
              <label className="app-form-label">¿Cuánto quieres invertir? (COP)<input type="number" min="1000" step="1000" data-remaining-cents={active.remainingFundingCents} value={amount} onChange={e => setAmount(e.target.value)}/></label>
              <p className="app-invest-hint">Disponible para invertir: {money(active.remainingFundingCents)}</p>
              <div className="app-invest-preview">
                <div><span>Ganancia estimada</span><strong className="app-positive">+{money(estProfit.toString())}</strong></div>
                <div><span>Recibes al vencimiento</span><strong>{money(total.toString())}</strong></div>
              </div>
              {over && <p className="app-error" role="alert">El monto supera el fondeo disponible.</p>}
              <button className="app-primary" disabled={busy || cents_ <= 0n || over} onClick={() => { try { void mutate('participate', { id: active.id, amountCents: cents(amount) }); } catch (r) { setError((r as Error).message); } }}>Invertir {cents_ > 0n ? money(cents_.toString()) : ''}</button>
              <p className="app-muted app-invest-note">Estimación; el retorno no está garantizado. El cálculo final lo confirma el sistema al invertir.</p>
            </div>;
          })())}
      {['ACTIVE_FUNDED','DISBURSED'].includes(active.status) && <div className="app-panel"><p className="app-muted">Operación fondeada. Registra el pago de la empresa para distribuir.</p><button className="app-primary" disabled={busy} onClick={() => mutate('settle', { id: active.id })}>Registrar recaudo</button></div>}
      {active.status === 'SETTLED' && <div className="app-done"><Icon name="check"/><strong>Recaudo distribuido</strong></div>}
      {error && <p className="app-error" role="alert">{error}</p>}
    </Modal>}
  </div>;
}
