import { type ReactNode } from 'react';
import '../styles/legal.css';

const UPDATED = '7 de noviembre de 2026';

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="legal">
      <header className="legal-head">
        <a className="legal-back" href="/">← Volver</a>
        <a className="legal-brand" href="/">Proofly</a>
      </header>
      <main className="legal-main">
        <h1>{title}</h1>
        <p className="legal-updated">Última actualización: {UPDATED}</p>
        {children}
        <nav className="legal-foot">
          <a href="/aviso">Aviso de demostración</a>
          <a href="/privacidad">Política de privacidad</a>
          <a href="/cookies">Política de cookies</a>
          <a href="/">Inicio</a>
        </nav>
      </main>
    </div>
  );
}

export function PrivacyPolicy() {
  return (
    <Shell title="Política de tratamiento de datos personales">
      <p>
        Esta política describe cómo Proofly recolecta, usa, almacena y protege los datos personales de sus
        usuarios, conforme al régimen colombiano de protección de datos personales:{' '}
        <strong>Ley 1581 de 2012</strong> (Habeas Data) y sus decretos reglamentarios 1377 de 2013 y 1074 de 2015.
      </p>
      <div className="legal-note">
        Proofly opera en Colombia y trata datos en pesos colombianos. Si en el futuro ofrecemos servicios a
        titulares en la Unión Europea, complementaremos esta política con las obligaciones del RGPD que resulten aplicables.
      </div>

      <h2>1. Responsable del tratamiento</h2>
      <p>
        Proofly es el responsable del tratamiento de los datos personales que recolecta a través de la plataforma.
        Para cualquier solicitud relacionada con tus datos, puedes escribir al canal indicado en la sección 7.
      </p>

      <h2>2. Datos que recolectamos</h2>
      <ul>
        <li><strong>Identidad y verificación (KYC):</strong> nombre legal y número de documento, obtenidos durante la verificación de identidad.</li>
        <li><strong>Datos de contacto:</strong> correo electrónico de registro.</li>
        <li><strong>Datos financieros y operativos:</strong> cuenta bancaria de recaudo, facturas e hitos que anticipas o financias, y el historial de tus operaciones.</li>
        <li><strong>Credenciales de acceso:</strong> tu contraseña se almacena cifrada con una función de derivación segura; nunca en texto plano.</li>
      </ul>

      <h2>3. Finalidades del tratamiento</h2>
      <ul>
        <li>Prestar el servicio de anticipo de facturas e hitos y de inversión en operaciones.</li>
        <li>Verificar tu identidad y cumplir obligaciones legales y regulatorias.</li>
        <li>Ejecutar la cesión de derechos económicos y la cascada de recaudo entre las partes.</li>
        <li>Prevenir fraude y garantizar la seguridad de la plataforma.</li>
      </ul>

      <h2>4. Privacidad on-chain estricta</h2>
      <p>
        Proofly usa contratos inteligentes para registrar operaciones, pero <strong>nunca</strong> almacena datos
        personales en la cadena de bloques. On-chain solo se registran identificadores opacos y hashes
        criptográficos. Tus nombres, documento, cuentas bancarias y documentos contractuales se guardan cifrados
        fuera de la cadena (AES-256), de modo que no existe correlación posible entre tu identidad y los registros públicos.
      </p>

      <h2>5. Seguridad de la información</h2>
      <ul>
        <li><strong>En tránsito:</strong> todas las comunicaciones usan cifrado TLS.</li>
        <li><strong>En reposo:</strong> los datos personales se almacenan cifrados; los campos más sensibles tienen cifrado adicional a nivel de aplicación.</li>
        <li>Los ambientes de desarrollo y pruebas no usan datos reales de producción.</li>
      </ul>

      <h2>6. Tus derechos (ARCO)</h2>
      <p>Como titular de los datos, la Ley 1581 te garantiza el derecho a:</p>
      <ul>
        <li><strong>Acceso:</strong> conocer qué datos tuyos tratamos.</li>
        <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
        <li><strong>Cancelación (derecho al olvido):</strong> solicitar la eliminación de tu cuenta y la supresión o anonimización irreversible de tus datos personales. Los hashes que permanezcan en la cadena quedan disociados de tu identidad.</li>
        <li><strong>Oposición:</strong> oponerte al tratamiento cuando no exista un deber legal que lo imponga.</li>
      </ul>

      <h2>7. Cómo ejercer tus derechos</h2>
      <p>
        Puedes ejercer estos derechos desde los ajustes de tu cuenta o escribiendo a nuestro canal de atención.
        Atenderemos tu solicitud en los plazos que fija la ley.
      </p>
    </Shell>
  );
}

export function CookiePolicy() {
  return (
    <Shell title="Política de cookies">
      <p>
        Proofly usa la mínima cantidad de cookies necesaria para funcionar. No usamos cookies de publicidad ni
        cookies de terceros para rastrearte entre sitios.
      </p>

      <h2>1. Cookies estrictamente necesarias</h2>
      <p>
        Usamos una única cookie de sesión, <strong>proofly_session</strong>, para mantener tu sesión iniciada de
        forma segura. Es una cookie <strong>HttpOnly</strong> y <strong>SameSite=Strict</strong>: no es accesible
        desde JavaScript y no viaja a otros sitios. Es estrictamente necesaria para usar la aplicación, por lo que
        no requiere consentimiento previo y no puede desactivarse si quieres iniciar sesión.
      </p>

      <h2>2. Preferencia de consentimiento</h2>
      <p>
        Guardamos tu decisión sobre este aviso de cookies en el <strong>almacenamiento local</strong> de tu
        navegador (no es una cookie y no se envía a nuestros servidores), para no volver a mostrarte el aviso en
        cada visita.
      </p>

      <h2>3. Cookies que no usamos</h2>
      <ul>
        <li>No usamos cookies de analítica de terceros que te identifiquen.</li>
        <li>No usamos cookies de publicidad ni de redes de seguimiento.</li>
        <li>No vendemos ni compartimos tu actividad con terceros con fines publicitarios.</li>
      </ul>

      <h2>4. Cómo revocar tu elección</h2>
      <p>
        Puedes borrar el almacenamiento local y las cookies de Proofly desde la configuración de tu navegador. Al
        hacerlo, el aviso de cookies volverá a mostrarse en tu próxima visita. Ten en cuenta que, si bloqueas la
        cookie de sesión, no podrás mantener la sesión iniciada.
      </p>
    </Shell>
  );
}

export function DemoNotice() {
  return (
    <Shell title="Aviso de demostración">
      <div className="legal-callout" role="note">
        Proofly es un proyecto de demostración. No es un producto financiero disponible para el
        público y no debe usarse para operaciones reales.
      </div>

      <h2>1. Qué es Proofly</h2>
      <p>
        Proofly se construyó únicamente para demostrar el funcionamiento de un modelo de negocio de
        anticipo de facturas e hitos (factoring) con liquidación transparente. Es material académico
        y de prototipo; no constituye una oferta, invitación ni recomendación para invertir, financiar
        o contratar servicio financiero alguno.
      </p>

      <h2>2. No es un servicio financiero real</h2>
      <ul>
        <li>No mueve dinero real: no hay desembolsos, recaudos ni pagos efectivos.</li>
        <li>No está autorizado ni vigilado por la Superintendencia Financiera de Colombia ni por ninguna autoridad.</li>
        <li>No capta recursos del público ni administra dinero de terceros.</li>
        <li>Las cifras, tasas, operaciones y empresas mostradas son ilustrativas.</li>
      </ul>

      <h2>3. Verificaciones simuladas</h2>
      <p>
        La verificación de identidad (KYC) y la validación de facturas se realizan con adaptadores de
        demostración. No sustituyen una verificación real ante la DIAN ni ante un proveedor de
        identidad, y no deben interpretarse como tales.
      </p>

      <h2>4. Uso permitido</h2>
      <p>
        Puedes explorar la interfaz y el flujo para entender el modelo. No ingreses datos personales
        reales sensibles ni información financiera real. Cualquier dato que ingreses es para fines de
        la demostración.
      </p>

      <h2>5. Salida a producción</h2>
      <p>
        Antes de ofrecer un servicio como este al público se requieren, entre otros, la estructura
        jurídica apropiada (cesión de derechos, patrimonio autónomo o cuenta de recaudo), proveedores
        reales de KYC, pagos y validación tributaria, y el cumplimiento regulatorio colombiano
        aplicable. Mientras eso no exista, Proofly permanece como demostración y no puede salir al
        público.
      </p>
    </Shell>
  );
}
