import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import '../styles/demo-app.css';

type Page = 'home' | 'operations' | 'market' | 'portfolio' | 'history';
type Intent = 'raise' | 'invest';
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
  { id: 'home', label: 'Inicio', icon: 'home' }, { id: 'operations', label: 'Operaciones', icon: 'file' },
  { id: 'market', label: 'Mercado', icon: 'growth' }, { id: 'portfolio', label: 'Portafolio', icon: 'wallet' }, { id: 'history', label: 'Actividad', icon: 'clock' },
];
const STATUS: Record<string, string> = {
  PENDING_CLIENT_CONFIRMATION: 'Por confirmar', QUOTED: 'Cotización lista', APPROVED_PENDING_FUNDING: 'Disponible',
  ACTIVE_FUNDED: 'Fondeada', DISBURSED: 'Desembolsada', SETTLED: 'Liquidada', PARTIALLY_SETTLED_OVERDUE: 'Recaudo parcial',
};
const money = (value: string | bigint) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(Number(value) / 100);
const percent = (rate: number) => (rate * 100).toLocaleString('es-CO', { maximumFractionDigits: 2 }) + '% E.A.';
const sum = (values: string[]) => values.reduce((total, value) => total + BigInt(value || '0'), 0n);
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('') || 'P';
function cents(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error('Ingresa un valor positivo con máximo dos decimales.');
  const [whole, decimals = ''] = value.split('.');
  const result = BigInt(whole) * 100n + BigInt(decimals.padEnd(2, '0'));
  if (result <= 0n) throw new Error('El valor debe ser mayor que cero.');
  return result.toString();
}
function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-8h6v8"/></>,
    file: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></>,
    growth: <><path d="M4 20V10M10 20V6M16 20V13M22 20H2M4 5l5-3 5 4 7-4M17 2h4v4"/></>,
    wallet: <><rect x="3" y="5" width="18" height="16" rx="4"/><path d="M3 9h18M16 13h5v5h-5a2.5 2.5 0 0 1 0-5ZM6 5V3h11"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>, plus: <path d="M12 5v14M5 12h14"/>, close: <path d="m6 6 12 12M18 6 6 18"/>,
    check: <path d="m5 12 4 4L19 6"/>, exit: <><path d="M10 4H5v16h5M14 7l5 5-5 5M9 12h10"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.file}</svg>;
}
function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); return () => { ref.current?.close(); }; }, []);
  return <dialog ref={ref} className="demo-dialog" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }} aria-labelledby="demo-dialog-title">
    <div className="demo-dialog-heading"><h2 id="demo-dialog-title">{title}</h2><button className="demo-icon-button" aria-label="Cerrar" onClick={onClose}><Icon name="close"/></button></div>{children}
  </dialog>;
}

export default function DemoApp() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [page, setPage] = useState<Page>(() => { const hash = location.hash.slice(1); return NAV.some(item => item.id === hash) ? hash as Page : 'home'; });
  const [intent, setIntent] = useState<Intent>('invest');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [kind, setKind] = useState('INVOICE');
  const [amount, setAmount] = useState('250000');
  const [preview, setPreview] = useState<Projection | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [notice, setNotice] = useState('');

  async function request(path: string, init?: RequestInit) {
    const response = await fetch(path, { credentials: 'same-origin', ...init });
    if (response.status === 401) { location.assign('/login'); throw new Error('Tu sesión terminó. Ingresa de nuevo.'); }
    const body = await response.json();
    if (!response.ok) {
      const message = String(body.message || '');
      const translations: [RegExp, string][] = [
        [/active operation limit/i, 'Tu nivel ya tiene el máximo de operaciones activas. Liquida la actual para crear otra.'],
        [/exceeds available limit/i, 'El monto supera tu cupo disponible.'],
        [/remaining|exceeds.*funding/i, 'El aporte supera el fondeo que falta.'],
        [/own operation/i, 'No puedes invertir en una operación tuya.'],
        [/already have a participation/i, 'Ya tienes un aporte en esta operación.'],
        [/duplicate/i, 'Ya existe una operación con estos datos.'],
        [/acceptance checks/i, 'Completa las validaciones antes de continuar.'],
      ];
      throw new Error(translations.find(([pattern]) => pattern.test(message))?.[1] || 'Esta acción no está disponible. Revisa los datos y el estado de la operación.');
    }
    return body;
  }
  async function refresh() { setData(await request('/api/app')); }
  useEffect(() => { let alive = true; request('/api/app').then(value => { if (alive) setData(value); }).catch(reason => { if (alive) setError(reason.message); }); return () => { alive = false; }; }, []);
  useEffect(() => { const handler = () => { const hash = location.hash.slice(1); if (NAV.some(item => item.id === hash)) setPage(hash as Page); }; window.addEventListener('hashchange', handler); return () => window.removeEventListener('hashchange', handler); }, []);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 4500); return () => clearTimeout(timer); }, [notice]);
  function go(next: Page) { setPage(next); location.hash = next; setFilter('ALL'); setSearch(''); window.scrollTo({ top: 0, behavior: 'auto' }); }
  function open(operation: Operation) { setSelected(operation.id); setAmount('250000'); setPreview(null); setAccepted(false); setError(''); }
  async function mutate(action: string, input: Record<string, unknown> = {}) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await request('/api/app/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...input }) });
      if (action === 'simulate') setPreview(result);
      else { await refresh(); setPreview(null); setNotice('Operación actualizada.'); }
      return result;
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No pudimos completar esta acción.'); }
    finally { setBusy(false); }
  }
  async function logout() {
    try { const response = await fetch('/api/auth/session', { method: 'DELETE', credentials: 'same-origin' }); if (!response.ok) throw new Error(); location.assign('/login'); }
    catch { setError('No pudimos cerrar la sesión. Inténtalo de nuevo.'); }
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const checks = kind === 'MILESTONE' ? form.has('ready') : ['validated', 'received', 'delivered', 'accepted'].every(key => form.has(key));
      const result = await mutate('create', { assetType: kind, title: form.get('title'), payerLegalName: form.get('company'), nominalAmountCents: cents(String(form.get('amount'))), termDays: Number(form.get('term')), checks });
      if (result) { setCreating(false); setSelected(result.id); go('operations'); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Revisa los datos.'); }
  }
  if (!data) return <main className="proofly-login"><div className="proofly-login-card"><div className="font-script text-3xl text-electric">Proofly</div><p role="status" className="mt-5">{error || 'Preparando tu espacio…'}</p>{error && <button className="demo-primary" onClick={() => location.reload()}>Reintentar</button>}</div></main>;
  const investing = intent === 'invest';
  const mine = data.operations.filter(op => op.freelancerId === data.me.id);
  const market = data.operations.filter(op => op.status === 'APPROVED_PENDING_FUNDING' && op.freelancerId !== data.me.id);
  const active = data.operations.find(op => op.id === selected);
  const invested = sum(data.investments.map(item => item.fundedCapitalCents));
  const profit = sum(data.investments.map(item => item.projection?.netEstimatedProfitCents || '0'));
  const paid = sum(data.investments.map(item => item.settlement?.profitEarnedCents || '0'));
  const cards = (page === 'operations' ? mine : market).filter(op => (filter === 'ALL' || op.assetType === filter) && `${op.title} ${op.payerLegalName}`.toLowerCase().includes(search.toLowerCase()));
  const tier = data.me.tier.endsWith('PRO') ? 'Pro' : data.me.tier.includes('GROWTH') ? 'Crecimiento' : 'Semilla';
  const heading = NAV.find(item => item.id === page)!.label;
  const ownInvestment = active ? active.freelancerId === data.me.id : false;
  const operationCard = (op: Operation) => <button key={op.id} className="demo-operation" onClick={() => open(op)}>
    <div className="demo-operation-top"><span className="demo-asset-icon"><Icon name={op.assetType === 'MILESTONE' ? 'growth' : 'file'}/></span><span className="demo-tag">{op.assetType === 'MILESTONE' ? 'Hito' : 'Factura'}</span><span className="demo-operation-arrow"><Icon name="arrow" size={18}/></span></div>
    <h3>{op.title}</h3><p>{op.payerLegalName}</p><div className="demo-operation-amount">{money(op.nominalAmountCents)}</div>
    <div className="demo-operation-meta"><span>{op.termDays} días</span><strong>{percent(op.effectiveAnnualRate)}</strong></div>
    <div className="demo-progress"><span style={{ width: `${Math.min(100, Number(op.fundedCapitalCents) / Number(op.advanceAmountCents) * 100)}%` }}/></div>
    <div className="demo-operation-meta"><span>{STATUS[op.status] || op.status}</span><span>{Math.round(Number(op.fundedCapitalCents) / Number(op.advanceAmountCents) * 100)}% fondeado</span></div>
  </button>;

  return <div className="proofly-demo">
    <aside className="demo-sidebar"><a href="/" className="demo-brand"><img src="/assets/proofly/proofly-symbol.svg" alt=""/>Proofly</a><div className="demo-sidebar-label">TU ESPACIO</div><nav aria-label="Navegación de la app">{NAV.map(item => <button key={item.id} onClick={() => go(item.id)} aria-current={page === item.id ? 'page' : undefined}><Icon name={item.icon}/>{item.label}</button>)}</nav><div className="demo-sidebar-note">Tu capital, a tiempo<br/><span>Adelanta tu trabajo o haz crecer tu dinero desde un mismo lugar.</span></div><button className="demo-signout" onClick={logout}><Icon name="exit"/>Salir</button></aside>
    <div className="demo-workspace">
      <header className="demo-app-header"><div className="demo-greeting"><span className="demo-avatar">{initials(data.me.name)}</span><div><span>Tu espacio en Proofly</span><strong>{data.me.name}</strong></div></div><div className="demo-header-actions"><span className="demo-private-tag">Nivel {tier}</span><button className="demo-icon-button" onClick={logout} aria-label="Salir"><Icon name="exit"/></button></div></header>
      <main className="demo-content">
        <div className={`demo-page-heading ${page === 'home' ? 'demo-page-heading-home' : ''}`}><div><p className="demo-overline">UN SOLO LUGAR PARA TU CAPITAL</p><h1>{page === 'home' ? 'Tu capital, más flexible' : heading}</h1></div>{page !== 'home' && <div className="demo-intent-toggle" role="group" aria-label="Qué quieres hacer"><button type="button" aria-pressed={investing} onClick={() => setIntent('invest')}>Invertir</button><button type="button" aria-pressed={!investing} onClick={() => setIntent('raise')}>Anticipar</button></div>}</div>
        {error && !active && !creating && <p className="demo-error" role="alert">{error}</p>}
        {page === 'home' && <>
          <p className="demo-home-lead">Haz crecer tu dinero con participaciones en operaciones, o anticipa el cobro de tus facturas e hitos. Todo desde una sola cuenta.</p>
          <section className="demo-dual" aria-label="Qué quieres hacer">
            <button className="demo-dual-card" onClick={() => { setIntent('invest'); go('market'); }}>
              <img className="demo-dual-art" src="/assets/proofly/ilustracion-crecer.png" alt="" width={120} height={120}/>
              <h3>Invertir</h3><p>Haz crecer tu capital con participaciones en operaciones.</p><span className="demo-dual-go"><Icon name="arrow" size={18}/></span>
            </button>
            <button className="demo-dual-card" onClick={() => { setIntent('raise'); setCreating(true); }}>
              <img className="demo-dual-art" src="/assets/proofly/ilustracion-tiempo.png" alt="" width={120} height={120}/>
              <h3>Anticipar</h3><p>Obtén liquidez inmediata de tus facturas o hitos.</p><span className="demo-dual-go"><Icon name="arrow" size={18}/></span>
            </button>
          </section>
          <section className="demo-metrics" aria-label="Tus saldos">
            <div className="demo-metric demo-metric-lilac"><span>Capital invertido</span><strong>{money(invested)}</strong><p>Ganancia estimada {money(profit)} · {data.investments.length} participaciones</p><span className="demo-tag">Retorno no garantizado</span></div>
            <div className="demo-metric demo-metric-chart"><span>Cupo para anticipar</span><strong>{money(data.me.availableLimitCents)}</strong><div className="demo-mini-bars" aria-hidden="true">{[24,40,32,65,50,78,60].map((height, i) => <i key={i} style={{ height: `${height}%`, background: i === 5 ? '#7300FF' : '#EADCF9' }}/>)}</div><small>Nivel {tier} · cupo máximo {money(data.me.maxQuotaCents)}</small></div>
          </section>
          <div className="demo-section-heading"><h2>{investing ? 'Operaciones para explorar' : 'Tus operaciones'}</h2><button className="demo-text-button" onClick={() => go(investing ? 'market' : 'operations')}>Ver todas <Icon name="arrow" size={16}/></button></div>
          {(investing ? market : mine).length ? <div className="demo-operation-grid">{(investing ? market : mine).slice(0, 2).map(operationCard)}</div> : <div className="demo-empty"><Icon name="file" size={32}/><h3>{investing ? 'Pronto habrá operaciones para ti' : 'Tu primer anticipo empieza aquí'}</h3><p>{investing ? 'Las nuevas operaciones disponibles aparecen en el mercado.' : 'Agrega una factura o un entregable para ver una cotización.'}</p><button className="demo-secondary" onClick={() => investing ? go('market') : setCreating(true)}>{investing ? 'Ir al mercado' : 'Crear operación'}</button></div>}
        </>}
        {(page === 'operations' || page === 'market') && <>
          <div className="demo-list-tools"><label className="demo-search"><span>Buscar operaciones</span><input type="search" placeholder="Proyecto o empresa" value={search} onChange={event => setSearch(event.target.value)}/></label>{page === 'operations' && <button className="demo-primary" onClick={() => { setCreating(true); setError(''); }}><Icon name="plus" size={18}/>Nueva operación</button>}</div>
          <div className="demo-segments" aria-label="Tipo de operación">{[['ALL','Todas'],['INVOICE','Facturas'],['MILESTONE','Hitos']].map(([value,label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
          <div className="demo-operation-grid">{cards.map(operationCard)}</div>{!cards.length && <div className="demo-empty"><Icon name="file" size={32}/><h2>No hay operaciones con estos filtros</h2><p>{page === 'market' ? 'Las nuevas operaciones aparecen después de su aceptación.' : 'Crea una factura o un hito para empezar.'}</p></div>}
        </>}
        {page === 'portfolio' && <>
          <section className="demo-metrics"><div className="demo-metric demo-metric-lilac"><span>Capital invertido</span><strong>{money(invested)}</strong><p>{data.investments.length} participaciones</p></div><div className="demo-metric"><span>Ganancia distribuida</span><strong>{money(paid)}</strong><p>Estimado pendiente: {money(profit)}</p></div></section>
          <div className="demo-section-heading"><h2>Tus participaciones</h2></div>
          {data.investments.length ? <div className="demo-position-list">{data.investments.map(item => { const op = data.operations.find(operation => operation.id === item.operationId)!; return <button className="demo-position" key={item.id} onClick={() => open(op)}><span className="demo-asset-icon"><Icon name="growth"/></span><div><strong>{op.title}</strong><span>{STATUS[op.status]}</span></div><div><strong>{money(item.fundedCapitalCents)}</strong><span className="demo-positive">+{money(item.projection?.netEstimatedProfitCents || '0')} estimado</span></div></button>; })}</div> : <div className="demo-empty"><Icon name="wallet" size={36}/><h2>Tu portafolio empieza con una participación</h2><p>Explora el mercado y revisa el retorno antes de aportar.</p><button className="demo-primary" onClick={() => go('market')}>Explorar mercado</button></div>}
        </>}
        {page === 'history' && <section className="demo-history"><h2>Actividad</h2>{data.events.map(event => <button key={event.id} onClick={() => { const op = data.operations.find(item => item.id === event.operationId); if (op) open(op); }}><span className="demo-asset-icon"><Icon name={event.kind === 'settle' ? 'check' : 'clock'}/></span><div><strong>{event.title}</strong><span>{new Date(event.date).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}</span></div><Icon name="arrow" size={18}/></button>)}</section>}
        <footer className="demo-app-footer"><span>Proofly · Liquidez para freelancers, retornos para financiadores</span><span>Montos en pesos colombianos (COP).</span></footer>
      </main>
    </div>
    <nav className="demo-mobile-dock" aria-label="Navegación móvil">{NAV.map(item => <button key={item.id} onClick={() => go(item.id)} aria-current={page === item.id ? 'page' : undefined}><Icon name={item.icon} size={20}/><span>{item.label}</span></button>)}</nav>
    {notice && <div className="demo-toast" role="status">{notice}</div>}
    {creating && <Modal title="Crear una operación" onClose={() => { setCreating(false); setError(''); }}><form onSubmit={create} className="demo-form">
      <label>Tipo de operación<select value={kind} onChange={event => setKind(event.target.value)}><option value="INVOICE">Factura</option><option value="MILESTONE">Hito contractual</option></select></label>
      <label>Título del proyecto<input name="title" required minLength={3} maxLength={80} placeholder="Diseño de identidad"/></label>
      <label>Empresa pagadora<input name="company" required maxLength={80} placeholder="Estudio Nube"/></label>
      <div className="demo-form-pair"><label>Valor en COP<input name="amount" type="number" required min="1000" step="0.01" defaultValue="1000000"/></label><label>Plazo<select name="term" aria-label="Plazo" defaultValue="30"><option value="15">15 días</option><option value="30">30 días</option><option value="45">45 días</option><option value="60">60 días</option><option value="90">90 días</option></select></label></div>
      <fieldset className="demo-checks"><legend>{kind === 'INVOICE' ? 'Eventos de la factura' : 'Entregable del hito'}</legend>{(kind === 'INVOICE' ? [['validated','Validación DIAN'],['received','Acuse de recibo'],['delivered','Entrega de bienes o servicios'],['accepted','Aceptación del pagador']] : [['ready','El entregable está listo para confirmar']]).map(([name,label]) => <label key={name}><input name={name} type="checkbox" required/>{label}</label>)}</fieldset>
      <p className="demo-help">Tu cupo disponible es {money(data.me.availableLimitCents)}.</p>
      {error && <p className="demo-error" role="alert">{error}</p>}<button className="demo-primary" disabled={busy}>{busy ? 'Creando…' : 'Crear y cotizar'}</button>
    </form></Modal>}
    {active && !creating && <Modal title={active.title} onClose={() => { setSelected(null); setError(''); }}>
      <div className="demo-detail-intro"><span className="demo-tag">{active.assetType === 'INVOICE' ? 'Factura' : 'Hito contractual'}</span><span className="demo-status">{STATUS[active.status]}</span><p>{active.payerLegalName}</p></div>
      <div className="demo-detail-hero"><span>Valor del entregable</span><strong>{money(active.nominalAmountCents)}</strong><div>{active.termDays} días · {percent(active.effectiveAnnualRate)}</div></div>
      <dl className="demo-quote-grid"><div><dt>Adelanto neto</dt><dd>{money(active.advanceAmountCents)}</dd></div><div><dt>Comisión Proofly</dt><dd>{money(active.prooflyFeeCents)}</dd></div><div><dt>Descuento comercial</dt><dd>{money(active.commercialDiscountCents)}</dd></div><div><dt>Fondeo pendiente</dt><dd>{money(active.remainingFundingCents)}</dd></div></dl>
      <div className="demo-risk-grid"><div><span>Entrega del freelancer</span><strong>{active.freelancerExecutionScore}/100</strong><meter min="0" max="100" value={active.freelancerExecutionScore}/></div><div><span>Solvencia de la empresa</span><strong>{active.payerSolvencyScore}/100</strong><meter min="0" max="100" value={active.payerSolvencyScore}/></div></div>
      {active.status === 'PENDING_CLIENT_CONFIRMATION' && <button className="demo-primary" disabled={busy} onClick={() => mutate('confirm', { id: active.id })}>Confirmar pago de la empresa</button>}
      {active.status === 'QUOTED' && <div className="demo-action-panel"><label className="demo-checkbox"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)}/>Acepto la cotización y la cesión de derechos económicos.</label><button className="demo-primary" disabled={!accepted || busy} onClick={() => mutate('accept', { id: active.id, accepted })}>Aceptar cotización</button></div>}
      {active.status === 'APPROVED_PENDING_FUNDING' && (ownInvestment
        ? <div className="demo-action-panel"><p>Esta es una de tus operaciones. Está disponible para que otros financiadores aporten capital.</p></div>
        : <div className="demo-action-panel"><h3>Tu participación</h3><label className="demo-form-label">Monto del aporte en COP<input type="number" min="0.01" step="0.01" data-remaining-cents={active.remainingFundingCents} value={amount} onChange={event => { setAmount(event.target.value); setPreview(null); }}/></label><button className="demo-secondary" disabled={busy} onClick={() => { try { void mutate('simulate', { id: active.id, amountCents: cents(amount) }); } catch (reason) { setError((reason as Error).message); } }}>Ver retorno estimado</button>
        {preview && <div className="demo-participation-preview"><div><span>Ganancia estimada</span><strong>{money(preview.netEstimatedProfitCents)}</strong></div><div><span>Total estimado al vencimiento</span><strong>{money(preview.totalEstimatedPayoutCents)}</strong></div><p>{percent(preview.effectiveAnnualRate)} · no garantizada</p><button className="demo-primary" disabled={busy} onClick={() => mutate('participate', { id: active.id, amountCents: preview.fundedCapitalCents })}>Confirmar participación</button></div>}
      </div>)}
      {['ACTIVE_FUNDED','DISBURSED'].includes(active.status) && <div className="demo-action-panel"><p>La operación está completamente fondeada. Puedes registrar el pago total de la empresa y ver la distribución.</p><button className="demo-primary" disabled={busy} onClick={() => mutate('settle', { id: active.id })}>Registrar recaudo total</button></div>}
      {active.status === 'SETTLED' && <div className="demo-settled"><Icon name="check"/><strong>Recaudo distribuido</strong><p>Comisión, capital y rendimiento calculados automáticamente.</p></div>}
      {error && <p className="demo-error" role="alert">{error}</p>}
    </Modal>}
  </div>;
}
