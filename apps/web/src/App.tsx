import { lazy, Suspense } from 'react';
import './styles/tokens.css';
import { Hero } from './components/Hero';
import { ValueProposition } from './components/ValueProposition';
import { BentoCarousel } from './components/BentoCarousel';
import { Footer } from './components/Footer';
import { AuthScreen } from './components/AuthScreen';
import { PrivacyPolicy, CookiePolicy, DemoNotice } from './components/LegalPages';
import { CookieConsent } from './components/CookieConsent';
const AppShell = lazy(() => import('./components/AppShell'));

export type Milestone = {
  title: string;
  company: string;
  initial: string;
  amount: number;
  returnPct: string;
  ea: string;
  days: number;
};

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export default function App() {
  const openDemo = () => { window.location.assign('/login'); };

  if (/^\/login\/?$/.test(window.location.pathname)) return <AuthScreen />;
  if (/^\/privacidad\/?$/.test(window.location.pathname)) return <PrivacyPolicy />;
  if (/^\/cookies\/?$/.test(window.location.pathname)) return <CookiePolicy />;
  if (/^\/aviso\/?$/.test(window.location.pathname)) return <DemoNotice />;
  if (/^\/app(?:\/|$)/.test(window.location.pathname)) return <Suspense fallback={<main className="proofly-login text-electric" role="status">Abriendo Proofly…</main>}><AppShell /></Suspense>;

  return (
    <div className="min-h-screen bg-canvas text-ink selection:bg-electric selection:text-white">

      {/* Global SVG gradient defs reused by every component */}
      <svg width="0" height="0" className="absolute pointer-events-none" aria-hidden="true">
        <defs>
          <linearGradient id="clayViolet" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#C292FF" />
            <stop offset="48%"  stopColor="#7300FF" />
            <stop offset="100%" stopColor="#4A00A8" />
          </linearGradient>
          <linearGradient id="clayLilac" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#FFFFFF" />
            <stop offset="55%"  stopColor="#F8D4FD" />
            <stop offset="100%" stopColor="#E49BF0" />
          </linearGradient>
          <linearGradient id="clayLavender" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#FFFFFF" />
            <stop offset="50%"  stopColor="#EFE5FF" />
            <stop offset="100%" stopColor="#C8A8FF" />
          </linearGradient>
          <linearGradient id="coinRim" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#7300FF" />
            <stop offset="100%" stopColor="#4B00A8" />
          </linearGradient>
          <filter id="soft3DShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#7300FF" floodOpacity="0.18" />
          </filter>
        </defs>
      </svg>

      <main id="main-content">
        <Hero
          onPublish={openDemo}
          onSimulate={openDemo}
          onEcosistema={() => scrollTo('ecosistema')}
          onAppMovil={() => scrollTo('ventajas')}
        />
        <ValueProposition onPublish={openDemo} />
        <BentoCarousel
          onFund={openDemo}
          onPublish={openDemo}
          onSimulate={openDemo}
        />
      </main>
      <Footer onPublish={openDemo} />
      <CookieConsent />

    </div>
  );
}
