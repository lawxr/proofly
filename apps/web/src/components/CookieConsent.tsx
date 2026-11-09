import { useEffect, useState } from 'react';
import '../styles/cookie-consent.css';

const KEY = 'proofly-cookie-consent';

// Minimal cookie-consent banner. The only cookie is the strictly-necessary
// session cookie, so "reject" does not disable anything required to browse;
// the choice is stored locally (never sent to the server) so the banner does
// not reappear. Honest copy, no dark patterns: Accept and Reject are equal.
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try { if (!localStorage.getItem(KEY)) setVisible(true); }
    catch { /* storage blocked: show once, do not crash */ setVisible(true); }
  }, []);

  function decide(choice: 'accepted' | 'rejected') {
    try { localStorage.setItem(KEY, choice); } catch { /* ignore */ }
    setVisible(false);
  }

  if (!visible) return null;
  return (
    <div className="cookie-consent" role="dialog" aria-live="polite" aria-label="Aviso de cookies">
      <div className="cookie-consent-body">
        <p>
          Usamos solo una cookie de sesión necesaria para mantener tu sesión segura y guardamos tu preferencia en
          este navegador. No usamos cookies de publicidad ni de rastreo de terceros. Consulta la{' '}
          <a href="/cookies">política de cookies</a> y la <a href="/privacidad">política de privacidad</a>.
        </p>
        <div className="cookie-consent-actions">
          <button type="button" className="cookie-consent-reject" onClick={() => decide('rejected')}>Rechazar</button>
          <button type="button" className="cookie-consent-accept" onClick={() => decide('accepted')}>Aceptar</button>
        </div>
      </div>
    </div>
  );
}
