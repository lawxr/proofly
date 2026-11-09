import { useState } from 'react';
import type { Milestone } from '../App';

function formatCOP(val: number) {
  return '$ ' + Math.round(val).toLocaleString('es-CO');
}

const ACTIVITY = [
  { title: 'Recaudo · Sura',     company: 'Liquidado hoy · 10:00 AM',  amount: '+$ 1.531.500' },
  { title: 'Hito UX · Nubank',  company: 'Liquidado ayer · 4:15 PM',   amount: '+$ 2.042.000' },
  { title: 'Adelanto Sofía V.', company: 'Abonado en cuenta',           amount: '+$ 4.200.000' },
];

interface MobileShowcaseProps {
  milestones:  Milestone[];
  selectedIdx: number;
  onSelect:    (idx: number) => void;
  onFund:      (idx: number) => void;
  onPublish:   () => void;
  onSimulate:  () => void;
}

export function MobileShowcase({
  milestones, selectedIdx, onSelect, onFund, onPublish, onSimulate,
}: MobileShowcaseProps) {
  const [tab, setTab] = useState<'resumen' | 'actividad'>('resumen');

  const current = milestones[selectedIdx] ?? milestones[0];
  const estimatedTotal = Math.round((current?.amount ?? 0) * 1.021);

  function cycleProject(dir: number) {
    onSelect((selectedIdx + dir + milestones.length) % milestones.length);
  }

  return (
    <section id="app-movil" className="space-y-10 pt-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-electric block mb-2">EXPERIENCIA MÓVIL · MODO CLARO</span>
          <h2 className="balance-text font-extrabold text-3xl sm:text-5xl tracking-tight text-ink">
            Adelanta tus pagos o financia desde el celular.
          </h2>
        </div>
        <p className="text-sm text-zinc-600 max-w-md font-medium">
          Interactúa con las tres pantallas: cambia pestañas, explora los proyectos o haz clic en cualquier hito para respaldarlo.
        </p>
      </div>

      {/* Stage */}
      <div className="rounded-[44px] bg-gradient-to-b from-lilac/55 via-lilac/20 to-lilac-soft border border-ink/12/15 p-6 sm:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-center justify-items-center">

          {/* ── Phone 1: Onboarding ── */}
          <div className="w-full max-w-[336px] h-[688px] bg-lilac rounded-[46px] shadow-phone flex flex-col justify-between overflow-hidden relative">
            <div className="px-7 pt-4 flex items-center justify-between text-[11px] font-extrabold text-ink tabular-nums">
              <span>19:27</span>
              <div className="flex items-center gap-1.5" aria-hidden="true">
                <span className="tracking-tighter">•••</span>
                <span className="w-4 h-2.5 rounded-sm bg-ink inline-block" />
              </div>
            </div>

            <div className="relative flex-1 flex flex-col items-center justify-center px-4">
              <svg className="w-64 h-64" viewBox="0 0 260 250" fill="none" aria-hidden="true" filter="url(#soft3DShadow)">
                <path d="M182 32H192V22H200V32H210V40H200V50H192V40H182V32Z" fill="#7300FF" stroke="#1E0B3B" strokeWidth="1.8"/>
                <path d="M212 52H224V40H234V52H246V62H234V74H224V62H212V52Z" fill="#E056FD" stroke="#1E0B3B" strokeWidth="2"/>
                <path d="M38 48 L112 132 L152 100 L226 196" stroke="#7300FF" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M38 40 L112 124 L152 92 L226 188" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
                <polygon points="24,24 62,34 36,62" fill="#FFFFFF" stroke="#1E0B3B" strokeWidth="2.2"/>
                <ellipse cx="120" cy="116" rx="24" ry="12" fill="url(#clayViolet)" stroke="#1E0B3B" strokeWidth="2.2"/>
                <g transform="translate(34,126)">
                  <ellipse cx="34" cy="76" rx="28" ry="12" fill="url(#coinRim)" stroke="#1E0B3B" strokeWidth="2"/>
                  <ellipse cx="34" cy="64" rx="28" ry="12" fill="url(#clayViolet)" stroke="#1E0B3B" strokeWidth="2"/>
                  <ellipse cx="34" cy="52" rx="28" ry="12" fill="url(#coinRim)" stroke="#1E0B3B" strokeWidth="2"/>
                  <ellipse cx="34" cy="40" rx="28" ry="12" fill="url(#clayViolet)" stroke="#1E0B3B" strokeWidth="2"/>
                  <ellipse cx="34" cy="28" rx="28" ry="12" fill="url(#clayLilac)" stroke="#1E0B3B" strokeWidth="2"/>
                  <ellipse cx="34" cy="16" rx="28" ry="12" fill="url(#clayViolet)" stroke="#1E0B3B" strokeWidth="2"/>
                </g>
                <g transform="translate(94,152)">
                  <ellipse cx="32" cy="50" rx="28" ry="12" fill="url(#coinRim)" stroke="#1E0B3B" strokeWidth="2"/>
                  <ellipse cx="32" cy="38" rx="28" ry="12" fill="url(#clayViolet)" stroke="#1E0B3B" strokeWidth="2"/>
                  <ellipse cx="32" cy="26" rx="28" ry="12" fill="url(#clayLilac)" stroke="#1E0B3B" strokeWidth="2"/>
                  <ellipse cx="32" cy="14" rx="28" ry="12" fill="url(#clayViolet)" stroke="#1E0B3B" strokeWidth="2"/>
                </g>
              </svg>
            </div>

            <div className="bg-white rounded-t-[36px] px-6 pt-7 pb-6 shadow-lg">
              <h3 className="balance-text font-extrabold text-[23px] leading-tight text-center text-ink">
                Tu <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-lilac align-middle text-base">🔥</span> Puente a<br />Liquidez y Retornos
              </h3>
              <p className="text-xs text-zinc-500 text-center mt-2.5 leading-relaxed px-2">
                Adelanta tus hitos o respalda contratos verificados con retornos de hasta{' '}
                <strong className="text-electric font-extrabold tabular-nums">16,8% E.A.</strong>
              </p>
              <button
                type="button"
                onClick={() => document.getElementById('app-movil')?.scrollIntoView({ behavior: 'smooth' })}
                className="mt-6 w-full bg-electric hover:bg-electric text-white font-extrabold text-xs py-4 rounded-full transition-colors"
              >
                Explorar oportunidades
              </button>
              <button
                type="button"
                onClick={onPublish}
                className="mt-2.5 w-full text-center text-xs font-extrabold text-zinc-700 hover:text-electric py-1"
              >
                Soy Freelancer
              </button>
            </div>
          </div>

          {/* ── Phone 2: Marketplace ── */}
          <div className="w-full max-w-[336px] h-[688px] bg-white rounded-[46px] shadow-phone flex flex-col justify-between overflow-hidden relative">
            <div className="px-7 pt-4 flex items-center justify-between text-[11px] font-extrabold text-ink tabular-nums">
              <span>19:27</span>
              <div className="flex items-center gap-1.5" aria-hidden="true">
                <span className="tracking-tighter">•••</span>
                <span className="w-4 h-2.5 rounded-sm bg-ink inline-block" />
              </div>
            </div>

            <div className="px-6 pt-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-ink/12 bg-lilac">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                    alt="Avatar de Sofía Vargas" width="40" height="40" loading="lazy" decoding="async"
                    className="editorial-photo w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 font-bold">Nivel Pro 🔥</div>
                  <div className="text-xs font-extrabold text-ink">Sofía Vargas</div>
                </div>
              </div>
              <button
                type="button"
                onClick={onPublish}
                aria-label="Publicar nuevo hito"
                className="w-9 h-9 rounded-full bg-lilac/60 hover:bg-lilac border border-ink/15 flex items-center justify-center text-ink font-extrabold text-sm transition-colors"
              >+</button>
            </div>

            <div className="px-6 pt-2 pb-20 overflow-y-auto no-scrollbar space-y-3.5 flex-1">
              <h3 className="font-extrabold text-2xl text-ink tracking-tight">Participaciones</h3>

              <div className="flex flex-col items-center text-center">
                <div className="relative flex items-center justify-center py-1">
                  <div className="w-32 h-24 rounded-full bg-lilac/80 blur-xl absolute" />
                  <svg className="w-36 h-28 relative z-10" viewBox="0 0 200 145" fill="none" aria-hidden="true" filter="url(#soft3DShadow)">
                    <rect x="30" y="34" width="54" height="30" rx="6" transform="rotate(-22 30 34)" fill="url(#clayViolet)" stroke="#1E0B3B" strokeWidth="2"/>
                    <rect x="114" y="22" width="54" height="30" rx="6" transform="rotate(20 114 22)" fill="url(#clayViolet)" stroke="#1E0B3B" strokeWidth="2"/>
                    <rect x="28" y="80" width="54" height="30" rx="6" transform="rotate(14 28 80)" fill="url(#clayLilac)" stroke="#1E0B3B" strokeWidth="2"/>
                    <rect x="112" y="76" width="54" height="30" rx="6" transform="rotate(-16 112 76)" fill="url(#clayViolet)" stroke="#1E0B3B" strokeWidth="2"/>
                    <circle cx="100" cy="72" r="25" fill="#FFFFFF" stroke="#1E0B3B" strokeWidth="2.2"/>
                    <circle cx="100" cy="72" r="19" fill="url(#clayLilac)"/>
                    <path d="M100 59V72L109 77" stroke="#1E0B3B" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <h4 className="font-extrabold text-base text-ink">Haz crecer tu capital hoy</h4>
                <p className="text-[11px] text-zinc-500 mt-0.5 max-w-[220px]">
                  Respalda entregas confirmadas desde <span className="text-ink font-bold tabular-nums">$ 500.000</span>.
                </p>
                <button
                  type="button"
                  onClick={() => onFund(selectedIdx)}
                  className="mt-3 w-full bg-electric hover:bg-electric text-white font-extrabold text-xs py-3.5 rounded-full transition-colors"
                >
                  Explorar más operaciones
                </button>
              </div>

              {/* Tabs */}
              <div className="bg-surface p-1 rounded-full grid grid-cols-2" role="tablist">
                {(['resumen', 'actividad'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => setTab(t)}
                    className={`py-1.5 rounded-full text-xs transition-all ${
                      tab === t
                        ? 'font-extrabold bg-white text-ink shadow-sm'
                        : 'font-semibold text-zinc-500 hover:text-ink'
                    }`}
                  >
                    {t === 'resumen' ? 'Disponibles' : 'Actividad'}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {tab === 'resumen'
                  ? milestones.map((m, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => { onSelect(idx); onFund(idx); }}
                        className="w-full p-3 rounded-2xl bg-surface hover:bg-lilac/45 cursor-pointer transition-colors flex items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-white border border-ink/15 flex items-center justify-center font-extrabold text-xs text-electric shrink-0">
                            {m.initial}
                          </div>
                          <div>
                            <div className="text-xs font-extrabold text-ink">{m.title}</div>
                            <div className="text-[10px] text-zinc-500">{m.company} · {m.returnPct}</div>
                          </div>
                        </div>
                        <div className="font-extrabold text-xs text-emerald-600 tabular-nums">+{formatCOP(m.amount)}</div>
                      </button>
                    ))
                  : ACTIVITY.map((a, i) => (
                      <div key={i} className="p-3 rounded-2xl bg-surface flex items-center justify-between">
                        <div>
                          <div className="text-xs font-extrabold text-ink">{a.title}</div>
                          <div className="text-[10px] text-zinc-500">{a.company}</div>
                        </div>
                        <div className="font-extrabold text-xs text-emerald-600 tabular-nums">{a.amount}</div>
                      </div>
                    ))
                }
              </div>
            </div>

            {/* Bottom nav */}
            <div className="absolute bottom-3 inset-x-5 bg-white/90 backdrop-blur-md border border-ink/15 rounded-full p-1.5 flex items-center justify-between shadow-sm">
              <button type="button" onClick={() => setTab('resumen')} aria-label="Inicio" className="w-9 h-9 rounded-full bg-surface flex items-center justify-center text-xs font-bold">⌂</button>
              <button type="button" onClick={() => onFund(selectedIdx)} className="px-4 py-2 rounded-full bg-electric text-white text-[11px] font-extrabold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-lilac" />
                <span>Participar</span>
              </button>
              <button type="button" onClick={onPublish}  aria-label="Publicar Hito"  className="w-9 h-9 rounded-full bg-surface flex items-center justify-center text-xs font-bold">+</button>
              <button type="button" onClick={onSimulate} aria-label="Simulador"       className="w-9 h-9 rounded-full bg-surface flex items-center justify-center text-xs font-bold">★</button>
            </div>
          </div>

          {/* ── Phone 3: Analytics ── */}
          <div className="w-full max-w-[336px] h-[688px] bg-white rounded-[46px] shadow-phone flex flex-col justify-between overflow-hidden relative">
            <div className="px-7 pt-4 flex items-center justify-between text-[11px] font-extrabold text-ink tabular-nums">
              <span>19:27</span>
              <div className="flex items-center gap-1.5" aria-hidden="true">
                <span className="tracking-tighter">•••</span>
                <span className="w-4 h-2.5 rounded-sm bg-ink inline-block" />
              </div>
            </div>

            <div className="px-6 pt-3 flex items-center justify-between">
              <button type="button" onClick={() => cycleProject(-1)} aria-label="Proyecto anterior" className="w-9 h-9 rounded-full bg-surface hover:bg-lilac flex items-center justify-center text-xs font-extrabold transition-colors">←</button>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => cycleProject(1)} aria-label="Siguiente proyecto" className="w-9 h-9 rounded-full bg-surface hover:bg-lilac flex items-center justify-center text-xs font-extrabold transition-colors">→</button>
                <button type="button" onClick={() => onFund(selectedIdx)} aria-label="Destacar proyecto" className="w-9 h-9 rounded-full bg-surface hover:bg-lilac flex items-center justify-center text-xs font-extrabold transition-colors">☆</button>
              </div>
            </div>

            <div className="px-6 pt-3 pb-6 overflow-y-auto no-scrollbar space-y-4 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-extrabold text-xl leading-tight text-ink">{current?.title}</h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Confirmado por <span className="text-electric font-bold">{current?.company}</span> · {current?.days} días
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-lilac border border-ink/15 flex items-center justify-center font-extrabold text-sm text-ink shrink-0">
                  {current?.initial}
                </div>
              </div>

              {/* Twin bento analytics */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-surface rounded-2xl p-3.5 flex flex-col justify-between border border-ink/5">
                  <div>
                    <div className="text-xs font-extrabold text-ink leading-snug">Análisis de <span className="text-electric">entregas</span></div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Historial activo</div>
                  </div>
                  <div className="pt-4">
                    <div className="flex items-end justify-between h-14 gap-1.5 px-0.5">
                      {[28, 40, 24, 32, 56, 36, 44].map((h, i) => (
                        <div key={i} className={`w-2 rounded-full ${i === 4 ? 'bg-electric' : 'bg-lilac-deep/60'}`} style={{ height: h }} />
                      ))}
                    </div>
                    <div className="flex justify-between text-[9px] font-bold text-zinc-400 mt-1.5 px-0.5">
                      {['L','M','M','J','V','S','D'].map((d, i) => (
                        <span key={i} className={i === 4 ? 'text-electric' : ''}>{d}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-lilac/65 rounded-2xl p-3.5 flex flex-col justify-between border border-ink/10">
                  <div>
                    <div className="text-xs font-extrabold text-ink leading-snug">Retorno <span className="italic font-semibold">estimado</span></div>
                    <div className="text-[10px] text-zinc-700 mt-0.5">Por participación</div>
                  </div>
                  <div className="pt-4">
                    <div className="font-extrabold text-base text-ink tracking-tight tabular-nums">{formatCOP(estimatedTotal)}</div>
                    <div className="text-[11px] font-extrabold text-electric mt-0.5 tabular-nums">{current?.ea}</div>
                  </div>
                </div>
              </div>

              {/* Promo banner */}
              <div className="bg-gradient-to-r from-electric to-[#5600C4] text-white rounded-2xl p-4 border border-ink/12 flex items-center justify-between relative overflow-hidden shadow-card">
                <div className="space-y-1 relative z-10">
                  <h4 className="font-extrabold text-sm leading-tight">Financia Inteligente</h4>
                  <p className="text-[10px] text-lilac/95 max-w-[148px]">Respaldo directo con pago empresarial en cuenta de recaudo.</p>
                  <button
                    type="button"
                    onClick={() => onFund(selectedIdx)}
                    className="mt-2 inline-block bg-lilac hover:bg-white text-ink font-extrabold text-[11px] px-4 py-1.5 rounded-full border border-ink/15 transition-colors"
                  >
                    Participar
                  </button>
                </div>
                <svg className="w-16 h-16 shrink-0 relative z-10" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                  <circle cx="44" cy="24" r="12" fill="url(#clayLilac)" stroke="#1E0B3B" strokeWidth="1.5"/>
                  <ellipse cx="26" cy="46" rx="14" ry="7" fill="url(#clayLavender)" stroke="#1E0B3B" strokeWidth="1.2"/>
                  <ellipse cx="26" cy="38" rx="14" ry="7" fill="url(#clayLilac)" stroke="#1E0B3B" strokeWidth="1.2"/>
                </svg>
              </div>

              {/* Recent milestones */}
              <div>
                <div className="text-xs font-extrabold text-ink mb-2">Hitos Recientes</div>
                <div className="space-y-2">
                  {milestones.slice(0, 2).map((m, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSelect(idx)}
                      className={`w-full p-3 rounded-2xl ${idx === 0 ? 'bg-lilac/45' : 'bg-surface'} flex items-center justify-between cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-white border border-ink/10 flex items-center justify-center font-extrabold text-xs text-ink shrink-0">{m.initial}</div>
                        <div>
                          <div className="text-xs font-extrabold text-ink">{m.company}</div>
                          <div className="text-[10px] text-zinc-500">{m.title}</div>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-emerald-600 tabular-nums">+{formatCOP(m.amount)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
