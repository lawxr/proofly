import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import '../styles/app-shell.css';

type Page = 'home' | 'invest' | 'raise' | 'contracts' | 'settings';
const PAGES: Page[] = ['home', 'invest', 'raise', 'contracts', 'settings'];
type Operation = {
  id: string; freelancerId: string; title: string; assetType: 'INVOICE' | 'MILESTONE'; payerLegalName: string;
  nominalAmountCents: string; advanceAmountCents: string; prooflyFeeCents: string; commercialDiscountCents: string;
  fundedCapitalCents: string; remainingFundingCents: string; termDays: number; dueDate: string; status: string;
  effectiveAnnualRate: number; freelancerExecutionScore: number; payerSolvencyScore: number;
  contractId?: string; milestoneIndex?: number;
};
type Projection = { fundedCapitalCents: string; netEstimatedProfitCents: string; totalEstimatedPayoutCents: string; effectiveAnnualRate: number };
type Snapshot = {
  me: { id: string; name: string; tier: string; kycStatus: string; availableLimitCents: string; maxQuotaCents: string; executionScore: number };
  operations: Operation[];
  investments: { id: string; operationId: string; fundedCapitalCents: string; createdAt: string; projection: Projection; settlement?: { profitEarnedCents: string; totalDistributedCents: string } }[];
  events: { id: string; operationId: string; kind: string; title: string; date: string }[];
};
const NAV: { id: Page; label: string; icon: string }[] = [
  { id: 'home', label: 'Inicio', icon: 'home' },
  { id: 'invest', label: 'Invertir', icon: 'growth' },
  { id: 'raise', label: 'Anticipar', icon: 'bolt' },
  { id: 'contracts', label: 'Contratos', icon: 'folder' },
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
// Animate a number from its previous value to the next one. Honors
// prefers-reduced-motion by snapping straight to the target.
function useCountUp(target: number, duration = 650) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { fromRef.current = target; setValue(target); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

// A money amount (in cents) that counts up on change.
function CountUpMoney({ cents }: { cents: bigint }) {
  const value = useCountUp(Number(cents));
  return <>{money(Math.round(value).toString())}</>;
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
    folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>,
    layers: <><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>, plus: <path d="M12 5v14M5 12h14"/>, close: <path d="m6 6 12 12M18 6 6 18"/>,
    check: <path d="m5 12 4 4L19 6"/>, exit: <><path d="M10 4H5v16h5M14 7l5 5-5 5M9 12h10"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.file}</svg>;
}
function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); return () => { ref.current?.close(); }; }, []);
  return <dialog ref={ref} className="app-sheet" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }} aria-labelledby="app-sheet-title">
    <div className="app-sheet-head"><h2 id="app-sheet-title" tabIndex={-1}>{title}</h2><button className="app-icon-btn" aria-label="Cerrar" onClick={onClose}><Icon name="close"/></button></div>{children}
  </dialog>;
}

export default function AppShell() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [page, setPage] = useState<Page>(() => { const hash = location.hash.slice(1); return PAGES.includes(hash as Page) ? hash as Page : 'home'; });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [kind, setKind] = useState('INVOICE');
  const [amount, setAmount] = useState('250000');
  const [raiseAmount, setRaiseAmount] = useState('1000000');
  const [raiseTerm, setRaiseTerm] = useState('30');
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [createStep, setCreateStep] = useState(0);
  const [raiseDetails, setRaiseDetails] = useState({ title: '', payer: '' });
  const [investStage, setInvestStage] = useState<'detail' | 'review' | 'receipt'>('detail');
  const [riskAccepted, setRiskAccepted] = useState(false);
  const [investFilter, setInvestFilter] = useState<'ALL' | 'INVOICE' | 'MILESTONE'>('ALL');
  const [contractId, setContractId] = useState('');
  const [accepted, setAccepted] = useState(false);
  function toggleCheck(key: string) { setChecks(c => ({ ...c, [key]: !c[key] })); }
  const [notice, setNotice] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [seen, setSeen] = useState<string>(() => { try { return localStorage.getItem('proofly-seen-event') || ''; } catch { return ''; } });
  const [acctMsg, setAcctMsg] = useState('');
  const [acctErr, setAcctErr] = useState('');

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const dialog = document.querySelector<HTMLDialogElement>('.app-sheet[open]');
      if (!dialog) return;
      dialog.scrollTop = 0;
      const heading = dialog.querySelector<HTMLElement>('.app-wizard-panel:not([hidden]) legend, .app-review-heading h3, .app-receipt h3') ?? dialog.querySelector<HTMLElement>('h2');
      heading?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [createStep, investStage, creating, selected]);

  async function verifyKyc(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const legalName = new FormData(event.currentTarget).get('legalName');
    setAcctMsg(''); setAcctErr('');
    try {
      const r = await fetch('/api/account/kyc', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ legalName }) });
      const body = await r.json().catch(() => ({}));
      if (r.status === 422) throw new Error('No pudimos verificar tu identidad. Revisa tus datos.');
      if (!r.ok) throw new Error((body as { message?: string }).message || 'No pudimos verificar tu identidad.');
      await refresh(); setAcctMsg('Identidad verificada.');
    } catch (e) { setAcctErr(e instanceof Error ? e.message : 'No pudimos verificar tu identidad.'); }
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
  useEffect(() => { const h = () => { const hash = location.hash.slice(1); if (PAGES.includes(hash as Page)) setPage(hash as Page); }; addEventListener('hashchange', h); return () => removeEventListener('hashchange', h); }, []);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(''), 4000); return () => clearTimeout(t); }, [notice]);
  // Close the notifications dropdown on an outside click or Escape.
  useEffect(() => {
    if (!notifOpen) return;
    const onDown = (e: MouseEvent) => { if (!(e.target as HTMLElement)?.closest('.app-notif-anchor')) setNotifOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setNotifOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [notifOpen]);
  function go(next: Page) { setPage(next); setNotifOpen(false); location.hash = next; scrollTo({ top: 0, behavior: 'auto' }); }
  function open(op: Operation) { setInvestStage('detail'); setRiskAccepted(false); setSelected(op.id); setAmount('250000'); setAccepted(false); setError(''); }
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
    if (createStep !== 2) return;
    const form = new FormData(event.currentTarget);
    try {
      const required = kind === 'MILESTONE' ? ['ready'] : ['validated', 'received', 'delivered', 'accepted'];
      const allConfirmed = required.every(k => checks[k]);
      const result = await mutate('create', { assetType: kind, title: form.get('title'), payerLegalName: form.get('company'), nominalAmountCents: cents(String(form.get('amount'))), termDays: Number(form.get('term')), checks: allConfirmed, contractId: kind === 'MILESTONE' && contractId ? contractId : undefined });
      if (result) { setCreating(false); setSelected(result.id); setInvestStage('detail'); setNotice('Solicitud registrada. Consulta el siguiente paso en tu operación.'); go('raise'); }
    } catch (r) { setError(r instanceof Error ? r.message : 'Revisa los datos.'); }
  }
  function openCreate(assetKind: string, contractId?: string) { setKind(assetKind); setChecks({}); setCreateStep(0); setRaiseDetails({ title: '', payer: '' }); setSelected(null); setRaiseAmount('1000000'); setRaiseTerm('30'); setContractId(contractId ?? ''); setError(''); setCreating(true); }

  if (!data) return <main className="app-boot"><div className="font-script text-3xl text-electric">Proofly</div><p role="status">{error || 'Preparando tu espacio…'}</p>{error && <button className="app-primary" onClick={() => location.reload()}>Reintentar</button>}</main>;

  const mine = data.operations.filter(op => op.freelancerId === data.me.id);
  const market = data.operations.filter(op => op.status === 'APPROVED_PENDING_FUNDING' && op.freelancerId !== data.me.id);

  // Group the user's own milestones by contract. Each group is a contract with
  // its milestones ordered by index; invoices and ungrouped milestones become
  // single-item groups so the Contracts tab shows everything the user raised.
  type Group = { contractId: string | null; title: string; payer: string; isContract: boolean; ops: Operation[] };
  const groups: Group[] = (() => {
    const byContract = new Map<string, Operation[]>();
    const singles: Operation[] = [];
    for (const op of mine) {
      if (op.assetType === 'MILESTONE' && op.contractId) {
        const list = byContract.get(op.contractId) || [];
        list.push(op); byContract.set(op.contractId, list);
      } else singles.push(op);
    }
    const contractGroups: Group[] = [...byContract.entries()].map(([contractId, ops]) => {
      const ordered = [...ops].sort((a, b) => (a.milestoneIndex || 0) - (b.milestoneIndex || 0));
      return { contractId, title: ordered[0].title, payer: ordered[0].payerLegalName, isContract: ops.length > 1, ops: ordered };
    });
    const singleGroups: Group[] = singles.map(op => ({ contractId: op.contractId ?? null, title: op.title, payer: op.payerLegalName, isContract: false, ops: [op] }));
    return [...contractGroups, ...singleGroups];
  })();
  const active = data.operations.find(op => op.id === selected);
  const invested = sum(data.investments.map(i => i.fundedCapitalCents));
  const profit = sum(data.investments.map(i => i.projection?.netEstimatedProfitCents || '0'));

  // Real capital trend: cumulative invested capital over time, built from the
  // investments ordered by date. Each bar is a real cumulative point; no data
  // means no chart (we show a flat baseline instead of inventing a trend).
  const spark = (() => {
    const ordered = [...data.investments].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (ordered.length < 2) return [] as number[];
    let acc = 0n;
    const cumulative = ordered.map(i => { acc += BigInt(i.fundedCapitalCents); return Number(acc); });
    const peak = cumulative[cumulative.length - 1] || 1;
    // Keep the last 7 points and scale to a 24..100% band so bars read well.
    return cumulative.slice(-7).map(v => 24 + Math.round((v / peak) * 76));
  })();
  const tier = TIER[data.me.tier] || 'Semilla';
  const ownActive = active ? active.freelancerId === data.me.id : false;
  const unread = (() => { let n = 0; for (const ev of data.events) { if (ev.id === seen) break; n++; } return n; })();
  function toggleNotifications() {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next) { const latest = data?.events[0]?.id || ''; setSeen(latest); try { localStorage.setItem('proofly-seen-event', latest); } catch { /* ignore */ } }
  }

  // Rich opportunity card for the invest market: sells the return and shows risk + funding.
  const opCard = (op: Operation) => {
    const funded = Number(op.fundedCapitalCents);
    const advance = Number(op.advanceAmountCents);
    const pct = advance > 0 ? Math.min(100, Math.round(funded / advance * 100)) : 0;
    // Estimated profit on the remaining fundable amount, at the operation's E.A. over its term.
    const remaining = BigInt(op.remainingFundingCents);
    const estProfit = remaining > 0n ? (remaining * BigInt(Math.round(op.effectiveAnnualRate * op.termDays / 365 * 1e6))) / 1000000n : 0n;
    return <button key={op.id} className="app-op-card" onClick={() => open(op)}>
      <div className="app-op-top">
        <span className="app-op-icon"><Icon name={op.assetType === 'MILESTONE' ? 'growth' : 'file'} size={18}/></span>
        <div className="app-op-ident"><strong>{op.title}</strong><span>{op.payerLegalName}</span></div>
        <span className="app-op-rate">{percent(op.effectiveAnnualRate)}</span>
      </div>
      <div className="app-op-figures">
        <div><span>Monto</span><strong>{money(op.nominalAmountCents)}</strong></div>
        <div><span>Estimación sobre el saldo</span><strong className="app-positive">+{money(estProfit.toString())}</strong></div>
        <div><span>Plazo</span><strong>{op.termDays} días</strong></div>
      </div>
      <div className="app-op-progress"><i style={{ width: `${pct}%` }}/></div>
      <div className="app-op-foot">
        <span>{pct}% fondeada · faltan {money(op.remainingFundingCents)}</span>
        <span className="app-op-scores" title="Entrega del freelancer · Solvencia de la empresa"><Icon name="check" size={13}/> {op.freelancerExecutionScore}/100 · {op.payerSolvencyScore}/100</span>
      </div>
    </button>;
  };
  // Own operations show the lifecycle step, so the raise flow reads as a tracker.
  const mineRow = (op: Operation) => <button key={op.id} className="app-row" onClick={() => open(op)}>
    <span className="app-row-icon"><Icon name={op.assetType === 'MILESTONE' ? 'growth' : 'file'} size={20}/></span>
    <span className="app-row-body"><strong>{op.title}</strong><span className={`app-step app-step-${op.status.startsWith('SETTLED') ? 'done' : op.status === 'APPROVED_PENDING_FUNDING' || op.status === 'ACTIVE_FUNDED' || op.status === 'DISBURSED' ? 'go' : 'wait'}`}>{STATUS[op.status] || op.status}</span></span>
    <span className="app-row-end"><strong>{money(op.advanceAmountCents)}</strong><span className="app-row-sub">por anticipar</span></span>
  </button>;

  // Settings is a full-screen stacked page: its own nav header, no dock, no profile/bell.
  if (page === 'settings') return <div className="proofly-app">
    <div className="app-shell app-shell-plain">
      <header className="app-screen-head">
        <button className="app-back" onClick={() => go('home')} aria-label="Volver"><Icon name="arrow" size={18}/></button>
        <h1>Ajustes</h1>
      </header>
      <main className="app-main app-main-plain">
        <div className="app-settings">
          <div className="app-settings-id"><span className="app-avatar app-avatar-lg">{initials(data.me.name)}</span><div><strong>{data.me.name}</strong><span>Nivel {tier} · cupo {money(data.me.availableLimitCents)}</span></div></div>

          {acctMsg && <p className="app-ok" role="status">{acctMsg}</p>}
          {acctErr && <p className="app-error" role="alert">{acctErr}</p>}

          {data.me.kycStatus === 'VERIFIED'
            ? <div className="app-settings-group">
                <h3>Identidad</h3>
                <div className="app-kyc-row">
                  <div><dt className="app-kyc-label">Nombre</dt><dd className="app-kyc-value">{data.me.name}</dd></div>
                  <span className="app-kyc-badge is-verified">Verificado</span>
                </div>
                <p className="app-muted">Estado de identidad registrado en tu cuenta.</p>
              </div>
            : <form className="app-settings-group" onSubmit={verifyKyc}>
                <h3>Verifica tu identidad</h3>
                <div className="app-kyc-row"><div><dt className="app-kyc-label">Estado</dt><dd className="app-kyc-value">Sin verificar</dd></div><span className="app-kyc-badge is-pending">Pendiente</span></div>
                <p className="app-muted">Para invertir o anticipar debes verificar tu identidad. Ingresa tu nombre tal como aparece en tu documento.</p>
                <label className="app-form-label">Nombre legal completo<input name="legalName" placeholder="Como aparece en tu documento" required minLength={3} maxLength={80}/></label>
                <button className="app-primary" type="submit">Verificar identidad</button>
              </form>}

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
      </main>
    </div>
  </div>;

  return <div className="proofly-app">
    <div className="app-shell">
      <header className="app-top">
        <button className="app-id" onClick={() => go('settings')} aria-label="Abrir tu cuenta"><span className="app-avatar">{initials(data.me.name)}</span><div><span>¡Hola, {firstName(data.me.name)}!</span><strong>Nivel {tier}</strong></div><span className="app-id-chevron" aria-hidden="true"><Icon name="chevron" size={16}/></span></button>
        <div className="app-notif-anchor">
          <button className="app-icon-btn app-bell" onClick={toggleNotifications} aria-haspopup="true" aria-expanded={notifOpen} aria-label={unread ? `Notificaciones, ${unread} sin leer` : 'Notificaciones'}><Icon name="bell" size={20}/>{unread > 0 && <span className="app-badge" aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}</button>
          {notifOpen && <>
            <div className="app-notif-scrim" aria-hidden="true"/>
            <div className="app-notif-menu" role="menu">
              <div className="app-notif-head">Notificaciones</div>
              {data.events.length
                ? <div className="app-notif-list">{data.events.map(ev => <button key={ev.id} role="menuitem" className="app-notif-item" onClick={() => { const op = data.operations.find(o => o.id === ev.operationId); setNotifOpen(false); if (op) open(op); }}><span className="app-row-icon"><Icon name={ev.kind === 'settle' ? 'check' : ev.kind === 'participate' ? 'growth' : 'bell'} size={16}/></span><div><strong>{ev.title}</strong><span>{new Date(ev.date).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}</span></div></button>)}</div>
                : <p className="app-notif-empty">No tienes notificaciones todavía.</p>}
            </div>
          </>}
        </div>
      </header>

      <main className="app-main" key={page}>
        {error && !active && !creating && <p className="app-error" role="alert">{error}</p>}

        {page === 'home' && <>
          <div className="app-page-intro"><span className="app-eyebrow">Resumen de tu cuenta · COP</span><h1 className="app-title">Tu capital, más flexible</h1><p className="app-lead">Tus inversiones y tu financiación, en un solo lugar.</p></div>

          {/* Balance hero: the two sides of the account, with a live spark. */}
          <section className="app-hero-balance">
            <div className="app-hero-main">
              <span className="app-hero-label">Capital invertido</span>
              <strong className="app-hero-amount"><CountUpMoney cents={invested}/></strong>
              <span className={`app-hero-trend ${profit > 0n ? 'is-up' : ''}`}>{profit > 0n ? <>▲ <CountUpMoney cents={profit}/> de ganancia estimada</> : 'Empieza a invertir y haz crecer tu capital'}</span>
            </div>
            {spark.length
              ? <div className="app-hero-spark" aria-hidden="true">{spark.map((h, i) => <i key={i} style={{ height: `${h}%` }}/>)}</div>
              : <div className="app-hero-baseline" aria-hidden="true"/>}
            <div className="app-hero-quota">
              <span><Icon name="bolt" size={15}/> Cupo para anticipar</span>
              <strong><CountUpMoney cents={BigInt(data.me.availableLimitCents)}/></strong>
            </div>
          </section>

          {/* Two actions with color accent and depth. */}
          <div className="app-twin">
            <button className="app-twin-card app-twin-invest" onClick={() => go('invest')}>
              <img className="app-twin-art" src="/assets/proofly/ilustracion-crecer.webp" alt="" width={72} height={72} loading="lazy" decoding="async"/>
              <h3>Invertir</h3><p>Haz crecer tu capital en operaciones.</p><span className="app-twin-go"><Icon name="arrow" size={18}/></span>
            </button>
            <button className="app-twin-card app-twin-raise" onClick={() => openCreate('INVOICE')}>
              <img className="app-twin-art" src="/assets/proofly/ilustracion-tiempo.webp" alt="" width={72} height={72} loading="lazy" decoding="async"/>
              <h3>Anticipar</h3><p>Adelanta el cobro de tus facturas.</p><span className="app-twin-go"><Icon name="arrow" size={18}/></span>
            </button>
          </div>

          {data.me.kycStatus !== 'VERIFIED' && <div className="app-account-prompt"><span className="app-row-icon"><Icon name="file" size={20}/></span><div><strong>Prepara tu cuenta para operar</strong><p>La verificación de identidad es necesaria para invertir y solicitar financiación.</p></div><button className="app-link" onClick={() => go('settings')}>Verificar identidad<Icon name="chevron" size={16}/></button></div>}
          <div className="app-sec-head"><h2>Actividad reciente</h2>{mine.some(op => op.contractId) && <button className="app-link" onClick={() => go('contracts')}>Ver contratos</button>}</div>
          {data.events.length
            ? <div className="app-list">{data.events.slice(0, 4).map(ev => <div key={ev.id} className="app-act"><span className="app-row-icon"><Icon name={ev.kind === 'settle' ? 'check' : ev.kind === 'participate' ? 'growth' : 'clock'} size={18}/></span><div><strong>{ev.title}</strong><span>{new Date(ev.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</span></div></div>)}</div>
            : <div className="app-empty">
                <span className="app-empty-icon"><Icon name="clock" size={26}/></span>
                <strong>Tu actividad aparecerá aquí</strong>
                <p>Haz tu primera inversión o anticipa una factura para empezar a mover tu capital.</p>
                <div className="app-empty-actions">
                  <button className="app-primary app-primary-sm" onClick={() => go('invest')}>Explorar inversiones</button>
                  <button className="app-chip" onClick={() => openCreate('INVOICE')}>Anticipar</button>
                </div>
              </div>}
        </>}

        {page === 'invest' && (() => {
          const filtered = market.filter(op => investFilter === 'ALL' || op.assetType === investFilter);
          const bestRate = market.reduce((m, op) => Math.max(m, op.effectiveAnnualRate), 0);
          return <>
            <h1 className="app-title">Invertir</h1>
            <p className="app-lead">Consulta operaciones, compara sus condiciones y revisa los riesgos antes de aportar capital.</p>
            {market.length > 0 && <section className="app-invest-summary">
              <div><span>Oportunidades</span><strong>{market.length}</strong></div>
              <div><span>Tasa anual hasta</span><strong className="app-positive">{percent(bestRate)}</strong></div>
              <div><span>Moneda</span><strong>Pesos colombianos</strong></div>
            </section>}
            {market.length > 0 && <div className="app-segments" role="tablist">
              {([['ALL', 'Todas'], ['INVOICE', 'Facturas'], ['MILESTONE', 'Hitos']] as const).map(([k, label]) =>
                <button key={k} role="tab" aria-selected={investFilter === k} className={investFilter === k ? 'is-on' : ''} onClick={() => setInvestFilter(k)}>{label}</button>)}
            </div>}
            {filtered.length
              ? <div className="app-op-grid">{filtered.map(opCard)}</div>
              : <div className="app-empty">
                  <span className="app-empty-icon"><Icon name="growth" size={26}/></span>
                  <strong>{market.length ? 'Nada en este filtro' : 'Aún no hay operaciones'}</strong>
                  <p>{market.length ? 'Prueba con otro tipo de operación.' : 'Cuando haya facturas o hitos disponibles para invertir, aparecerán aquí.'}</p>
                </div>}
          </>;
        })()}

        {page === 'raise' && <>
          <div className="app-sec-head"><h1 className="app-title">Anticipar</h1><button className="app-primary app-primary-sm" onClick={() => openCreate('INVOICE')}><Icon name="plus" size={16}/>Nueva</button></div>
          <p className="app-lead">Adelanta el cobro de tus facturas e hitos. Cupo disponible {money(data.me.availableLimitCents)}.</p>
          {mine.length
            ? <div className="app-list">{mine.map(mineRow)}</div>
            : <p className="app-muted">Crea tu primera factura o hito para ver una cotización.</p>}
        </>}

        {page === 'contracts' && <>
          <div className="app-sec-head"><h1 className="app-title">Contratos</h1><button className="app-primary app-primary-sm" onClick={() => openCreate('MILESTONE')}><Icon name="plus" size={16}/>Nuevo</button></div>
          <p className="app-lead">Agrupa los hitos de un mismo proyecto y sigue el recaudo tramo a tramo.</p>
          {groups.length
            ? <div className="app-contract-grid">{groups.map(group => {
                const total = sum(group.ops.map(o => o.advanceAmountCents));
                const settled = group.ops.filter(o => o.status === 'SETTLED');
                const collected = sum(settled.map(o => o.advanceAmountCents));
                const pct = total > 0n ? Math.min(100, Math.round(Number(collected) / Number(total) * 100)) : 0;
                return <section key={group.contractId ?? group.ops[0].id} className={`app-contract ${group.isContract ? '' : 'is-single'}`}>
                  <header className="app-contract-head">
                    <span className="app-contract-icon"><Icon name={group.isContract ? 'layers' : group.ops[0].assetType === 'MILESTONE' ? 'bolt' : 'file'} size={18}/></span>
                    <div className="app-contract-ident">
                      <strong>{group.isContract ? `Contrato · ${group.payer}` : group.title}</strong>
                      <span>{group.isContract ? `${group.ops.length} hitos · ${group.payer}` : group.payer}</span>
                    </div>
                  </header>
                  {group.isContract && <>
                    <div className="app-contract-figures">
                      <div><span>Recaudado</span><strong className="app-positive">{money(collected)}</strong></div>
                      <div><span>Total del contrato</span><strong>{money(total)}</strong></div>
                      <div><span>Hitos liquidados</span><strong>{settled.length}/{group.ops.length}</strong></div>
                    </div>
                    <div className="app-op-progress"><i style={{ width: `${pct}%` }}/></div>
                  </>}
                  <div className="app-contract-steps">{group.ops.map(op => <button key={op.id} className="app-milestone" onClick={() => open(op)}>
                    {group.isContract && <span className="app-milestone-idx">{op.milestoneIndex}</span>}
                    <span className="app-milestone-body"><strong>{op.title}</strong><span className={`app-step app-step-${op.status.startsWith('SETTLED') ? 'done' : op.status === 'APPROVED_PENDING_FUNDING' || op.status === 'ACTIVE_FUNDED' || op.status === 'DISBURSED' ? 'go' : 'wait'}`}>{STATUS[op.status] || op.status}</span></span>
                    <span className="app-milestone-amount">{money(op.advanceAmountCents)}</span>
                    <Icon name="chevron" size={16}/>
                  </button>)}</div>
                  {group.isContract && settled.length < group.ops.length && <button className="app-contract-add" onClick={() => openCreate('MILESTONE', group.contractId ?? undefined)}><Icon name="plus" size={14}/>Añadir hito a este contrato</button>}
                </section>;
              })}</div>
            : <div className="app-empty">
                <span className="app-empty-icon"><Icon name="folder" size={26}/></span>
                <strong>Aún no tienes contratos</strong>
                <p>Crea un contrato por hitos para financiar un proyecto por tramos y seguir su recaudo aquí.</p>
                <div className="app-empty-actions"><button className="app-primary app-primary-sm" onClick={() => openCreate('MILESTONE')}>Crear contrato por hitos</button></div>
              </div>}
        </>}

      </main>

      <nav className="app-dock" aria-label="Navegación">{NAV.map(item => <button key={item.id} onClick={() => go(item.id)} aria-current={page === item.id ? 'page' : undefined}><Icon name={item.icon} size={22}/><span>{item.label}</span></button>)}</nav>
    </div>

    {notice && <div className="app-toast" role="status">{notice}</div>}

    {creating && (() => {
      // Live advance estimate, mirroring the canonical quote (2% monthly discount, 1% fee).
      const nominal = /^\d+$/.test(raiseAmount) ? BigInt(raiseAmount) * 100n : 0n;
      const days = Number(raiseTerm);
      const discount = nominal > 0n ? BigInt(Math.floor(Number(nominal) * (0.02 * days / 30))) : 0n;
      const fee = nominal > 0n ? BigInt(Math.floor(Number(nominal) * 0.01)) : 0n;
      const advance = nominal - discount - fee;
      const isInvoice = kind === 'INVOICE';
      const events = isInvoice
        ? [['validated', 'Validación DIAN'], ['received', 'Acuse de recibo'], ['delivered', 'Entrega realizada'], ['accepted', 'Aceptación del pagador']]
        : [['ready', 'El entregable está listo']];
      const required = events.map(([k]) => k);
      const allConfirmed = required.every(k => checks[k]);
      // Adding a milestone to an existing contract: lock to MILESTONE, inherit the payer.
      const contractOps = contractId ? mine.filter(op => op.contractId === contractId) : [];
      const inContract = contractId !== '' && contractOps.length > 0;
      const contractPayer = contractOps[0]?.payerLegalName ?? '';
      const nextIndex = contractOps.reduce((max, op) => Math.max(max, op.milestoneIndex || 0), 0) + 1;
      return <Modal title={inContract ? 'Añadir hito al contrato' : 'Anticipar cobro'} onClose={() => { if (!busy) { setCreating(false); setError(''); } }}>
        {data.me.kycStatus !== 'VERIFIED' ? <div className="app-onboarding">
          <span className="app-action-icon"><Icon name="file" size={26}/></span><h3>Tu primer paso: la identidad</h3>
          <p>Verifica tu identidad antes de solicitar financiación.</p><p className="app-muted">Después podrás indicar qué quieres financiar, revisar los requisitos y consultar tu anticipo estimado.</p>
          <button className="app-primary" onClick={() => { setCreating(false); go('settings'); }}>Ir a verificar identidad<Icon name="arrow" size={18}/></button>
        </div> : <>
        <ol className="app-stepper" aria-label="Pasos de la solicitud">{['Datos', 'Requisitos', 'Revisión'].map((label, i) => <li key={label} aria-current={i === createStep ? 'step' : undefined} className={i < createStep ? 'is-complete' : ''}><span>{i < createStep ? <Icon name="check" size={13}/> : i + 1}</span>{label}</li>)}</ol>
        <form onSubmit={create} className="app-form">
        <fieldset className="app-wizard-panel" hidden={createStep !== 0}><legend tabIndex={-1}>¿Qué quieres financiar?</legend><p className="app-muted">Una factura por cobrar o una entrega de tu proyecto. Elige el tipo y cuéntanos sus datos.</p>
        {inContract
          ? <div className="app-contract-note"><Icon name="layers" size={16}/> Hito {nextIndex} de un contrato con {contractPayer}. Hereda la empresa pagadora.</div>
          : <div className="app-asset-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={isInvoice} className={isInvoice ? 'is-on' : ''} onClick={() => { setKind('INVOICE'); setChecks({}); }}><Icon name="file" size={16}/> Factura</button>
              <button type="button" role="tab" aria-selected={!isInvoice} className={!isInvoice ? 'is-on' : ''} onClick={() => { setKind('MILESTONE'); setChecks({}); }}><Icon name="bolt" size={16}/> Hito</button>
            </div>}
          <label>Título<input name="title" required minLength={3} maxLength={80} placeholder={inContract ? `Hito ${nextIndex}: entrega` : 'Diseño de identidad'}/></label>
          <label>Empresa pagadora<input name="company" aria-label="Empresa pagadora" required maxLength={80} placeholder="Estudio Nube" defaultValue={contractPayer} readOnly={inContract}/><small>La empresa que debe pagar la factura o el entregable.</small></label>
          <div className="app-form-pair"><label>Valor (COP)<input name="amount" type="number" required min="1000" step="1000" value={raiseAmount} onChange={e => setRaiseAmount(e.target.value)}/></label><label>Plazo<select name="term" value={raiseTerm} onChange={e => setRaiseTerm(e.target.value)}><option value="15">15 días</option><option value="30">30 días</option><option value="45">45 días</option><option value="60">60 días</option><option value="90">90 días</option></select></label></div>

          <p className="app-muted">El plazo se usa para estimar el descuento. No es una promesa de desembolso.</p>
          <button type="button" className="app-primary" onClick={event => { const form = event.currentTarget.form; if (form?.reportValidity()) { const values = new FormData(form); setRaiseDetails({ title: String(values.get('title')), payer: String(values.get('company')) }); setCreateStep(1); } }}>Continuar a requisitos<Icon name="arrow" size={18}/></button>
        </fieldset>
        <fieldset className="app-wizard-panel" hidden={createStep !== 1}><legend tabIndex={-1}>Requisitos de tu {isInvoice ? 'factura' : 'entregable'}</legend><p className="app-muted">Declara solo lo que puedes respaldar. Estas declaraciones no sustituyen una verificación externa.</p>
          <div className="app-events">
            <div className="app-events-head">{isInvoice ? 'Verifica tu factura' : 'Confirma tu entregable'}</div>
            {events.map(([k, label]) => <button type="button" key={k} className={`app-event ${checks[k] ? 'is-on' : ''}`} aria-pressed={!!checks[k]} onClick={() => toggleCheck(k)}>
              <span className="app-event-box" aria-hidden="true">{checks[k] && <Icon name="check" size={14}/>}</span>
              <span className="app-event-label">{label}</span>
              <span className={`app-event-state ${checks[k] ? 'is-ok' : ''}`}>{checks[k] ? 'Declarado' : 'Pendiente'}</span>
            </button>)}

          </div>
          <p className="app-events-note">Se necesitan todas las declaraciones para solicitar la cotización. No adjuntes documentos sensibles: esta pantalla todavía no admite su envío.</p>
          <button type="button" className="app-primary" disabled={!allConfirmed} onClick={() => setCreateStep(2)}>Revisar solicitud<Icon name="arrow" size={18}/></button>
          <button type="button" className="app-link app-link-center" onClick={() => setCreateStep(0)}>Volver a datos</button>
        </fieldset>
        <fieldset className="app-wizard-panel" hidden={createStep !== 2}><legend tabIndex={-1}>Revisa tu solicitud</legend><p className="app-muted">Comprueba los valores antes de enviarla. Todavía no estás recibiendo dinero.</p><dl className="app-receipt-facts"><div><dt>Concepto</dt><dd>{raiseDetails.title}</dd></div><div><dt>Empresa pagadora</dt><dd>{raiseDetails.payer}</dd></div></dl>
          {advance > 0n && <div className="app-quote">
            <div className="app-quote-advance"><div><span>Anticipo estimado</span><strong>{money(advance.toString())}</strong></div><span className="app-quote-fast"><Icon name="bolt" size={13}/> Sujeto a aprobación</span></div>
            <div className="app-quote-break"><span>Valor nominal</span><span>{money(nominal.toString())}</span></div>
            <div className="app-quote-break"><span>Descuento ({days} días)</span><span>−{money(discount.toString())}</span></div>
            <div className="app-quote-break"><span>Comisión Proofly</span><span>−{money(fee.toString())}</span></div>
          </div>}

          <div className="app-disclosure"><Icon name="clock" size={18}/><p>El desembolso depende de la aprobación y del fondeo. Al enviar, podrás consultar el estado y el siguiente paso de tu operación.</p></div>
          {error && <p className="app-error" role="alert">{error}</p>}
          <button className="app-primary" disabled={busy || !allConfirmed}>{busy ? 'Enviando…' : 'Enviar solicitud'} <Icon name="arrow" size={18}/></button>
          <button type="button" className="app-link app-link-center" disabled={busy} onClick={() => setCreateStep(1)}>Volver a requisitos</button>
        </fieldset>
        </form></>}
      </Modal>;
    })()}

    {active && !creating && <Modal title={active.title} onClose={() => { if (!busy) { setSelected(null); setError(''); } }}>
      {investStage === 'receipt' ? <div className="app-receipt"><div className="app-done"><Icon name="check" size={28}/><h3 tabIndex={-1}>Inversión registrada</h3><p>Tu aporte ya aparece en esta operación.</p></div>{data.investments.filter(i => i.operationId === active.id).map(i => <dl className="app-receipt-facts" key={i.id}><div><dt>Aporte registrado</dt><dd>{money(i.fundedCapitalCents)}</dd></div><div><dt>Referencia</dt><dd>{i.id}</dd></div><div><dt>Fecha de registro</dt><dd>{new Date(i.createdAt).toLocaleString('es-CO')}</dd></div></dl>)}<p className="app-muted">El registro del aporte no garantiza su rentabilidad ni el pago al vencimiento.</p><button className="app-primary" onClick={() => setInvestStage('detail')}>Ver operación<Icon name="arrow" size={18}/></button></div> : <>
      {investStage === 'detail' && <><div className="app-detail-top"><span className="app-tag">{active.assetType === 'INVOICE' ? 'Factura' : 'Hito'}</span><span className="app-tag app-tag-plain">{STATUS[active.status]}</span></div>
      <div className="app-detail-hero"><span>Valor del entregable</span><strong>{money(active.nominalAmountCents)}</strong><p>{active.payerLegalName} · {active.termDays} días · {percent(active.effectiveAnnualRate)}</p></div>
      <dl className="app-detail-facts"><div><dt>Adelanto neto</dt><dd>{money(active.advanceAmountCents)}</dd></div><div><dt>Comisión</dt><dd>{money(active.prooflyFeeCents)}</dd></div><div><dt>Fondeo pendiente</dt><dd>{money(active.remainingFundingCents)}</dd></div></dl></>}

      {ownActive && <div className="app-disclosure"><Icon name="clock" size={18}/><p><strong>{STATUS[active.status] || active.status}.</strong> {active.status === 'PENDING_CLIENT_CONFIRMATION' ? 'Falta la confirmación del pagador. No se ha desembolsado el anticipo.' : active.status === 'QUOTED' ? 'Revisa la cotización y sus condiciones antes de aceptarla.' : active.status === 'APPROVED_PENDING_FUNDING' ? 'Tu operación espera aportes de financiadores. Aún no equivale a un desembolso.' : 'Consulta las acciones disponibles y los movimientos de tu operación.'}</p></div>}
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
              <div className="app-invest-rate"><span>Tasa efectiva anual</span><strong>{percent(active.effectiveAnnualRate)}</strong><span>Plazo de la operación: {active.termDays} días</span></div>
              {investStage === 'detail' ? <>
              <div className="app-evidence"><h3>Información de la operación</h3><dl><div><dt>Empresa pagadora</dt><dd>{active.payerLegalName}</dd></div><div><dt>Puntaje de entrega</dt><dd>{active.freelancerExecutionScore}/100</dd></div><div><dt>Puntaje del pagador</dt><dd>{active.payerSolvencyScore}/100</dd></div></dl><p>Los puntajes son indicadores, no garantías de pago. No hay documentos de soporte consultables en esta vista.</p></div>
              <label className="app-form-label">¿Cuánto quieres invertir? (COP)<input type="number" min="1000" step="1000" data-remaining-cents={active.remainingFundingCents} value={amount} onChange={e => setAmount(e.target.value)}/></label>
              <p className="app-invest-hint">Disponible para invertir: {money(active.remainingFundingCents)}</p>
              </> : <div className="app-review-heading"><span className="app-eyebrow">Último paso · Confirmación</span><h3 tabIndex={-1}>Revisa tu inversión</h3><p>Aportarás <strong>{money(cents_)}</strong> a {active.title}, con un plazo de {active.termDays} días.</p></div>}
              <div className="app-invest-preview">
                <div><span>Ganancia estimada</span><strong className="app-positive">+{money(estProfit.toString())}</strong></div>
                <div><span>Total estimado al vencimiento</span><strong>{money(total.toString())}</strong></div>
              </div>
              {over && <p className="app-error" role="alert">El monto supera el fondeo disponible.</p>}
              <div className="app-disclosure app-disclosure-risk"><Icon name="file" size={18}/><p>Puedes perder parte o todo el capital aportado. El pago puede retrasarse y el retorno no está garantizado. Esta vista no ofrece una opción de retiro anticipado.</p></div>
              {data.me.kycStatus !== 'VERIFIED' ? <button className="app-primary" onClick={() => { setSelected(null); go('settings'); }}>Verificar identidad para invertir</button> : investStage === 'detail'
                ? <button className="app-primary" disabled={cents_ <= 0n || over} onClick={() => { setRiskAccepted(false); setInvestStage('review'); }}>Revisar inversión<Icon name="arrow" size={18}/></button>
                : <><label className="app-checkbox"><input type="checkbox" checked={riskAccepted} onChange={e => setRiskAccepted(e.target.checked)}/>Entiendo los riesgos y quiero realizar este aporte.</label><button className="app-primary" disabled={busy || !riskAccepted || cents_ <= 0n || over} onClick={async () => { const result = await mutate('participate', { id: active.id, amountCents: cents_.toString() }); if (result) { setInvestStage('receipt'); setNotice('Inversión registrada.'); } }}>{busy ? 'Registrando…' : `Confirmar inversión ${money(cents_)}`}</button><button className="app-link app-link-center" disabled={busy} onClick={() => setInvestStage('detail')}>Editar aporte</button></>}
              <p className="app-muted app-invest-note">Estimación orientativa para el plazo indicado, no una promesa de rentabilidad. El cálculo final lo confirma el sistema al invertir.</p>
            </div>;
          })())}
      {['ACTIVE_FUNDED','DISBURSED'].includes(active.status) && <div className="app-panel"><p className="app-muted">Operación fondeada. Registra el pago de la empresa para distribuir.</p><button className="app-primary" disabled={busy} onClick={() => mutate('settle', { id: active.id })}>Registrar recaudo</button></div>}
      {active.status === 'SETTLED' && <div className="app-done"><Icon name="check"/><strong>Recaudo distribuido</strong></div>}
      {error && <p className="app-error" role="alert">{error}</p>}
      </>}
    </Modal>}
  </div>;
}
