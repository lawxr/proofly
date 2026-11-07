# Sistema de Diseño Visual (`DESIGN.md` — Modo Claro Absoluto) — Proofly

---

## 1. Identidad Visual y Paleta de Colores (Light Mode Only)
Toda la plataforma (Landing Page, Web App y Mobile App) se desarrolla **exclusivamente en Modo Claro**, priorizando limpieza visual, alto contraste tipográfico y tarjetas suaves con acentos vibrantes.

* **Fondo Base (Canvas):** `#FFFFFF` (Blanco puro para fondos principales y tarjetas elevadas).
* **Superficie Secundaria / Lavanda Suave:** `#F8D4FD` (Rosa/Lavanda pastel para bloques destacados, fondos de onboarding, tarjetas de métricas e ilustraciones).
* **Superficie Gris Sutil (Cards / Inputs):** `#F6F5F8` (Gris lavanda ultra claro para contenedores secundarios y selectores tipo *segmented control*).
* **Acento Primario / Marca:** `#7300FF` (Violeta eléctrico para barras activas de gráficos, indicadores clave, enlaces, badges de rendimiento y estados activos).
* **Contraste Fuerte / CTA Primario:** `#000000` (Negro puro para botones principales en forma de píldora, textos de títulos, bordes estructurales y banners de alto impacto).
* **Textos:**
  * **Principal:** `#000000`
  * **Secundario / Subtítulos:** `#52525B`
  * **Sobre Negro o Violeta:** `#FFFFFF`
* **Semánticos Financieros:**
  * **Retorno / Ingreso Positivo:** `#16A34A` (Verde esmeralda para `+$500.00` o porcentajes de ganancia).
  * **Egreso / Descuento:** `#E11D48` (Rosa/Rojo para salidas de caja).
* **Elementos Gráficos Distintivos:**
  * **Estrella de 8 puntas (Starburst):** En color `#F8D4FD` o `#7300FF` como sello visual de la marca y marca de agua geométrica.
  * **Patrón de Líneas Diagonales:** Trama de líneas finas diagonales (`45deg`) para fondos de tarjetas promocionales o texturas secundarias.

---

## 2. Estética Mobile & Web App (Referencia UI Fintech)
Inspirada en las pantallas móviles de referencia:
* **Botones Primarios (CTAs):** Píldoras completamente redondeadas (`border-radius: 9999px`) en color `#000000` con texto `#FFFFFF` en peso `600 SemiBold`, ocupando el ancho completo en móvil.
* **Tarjetas de Métricas (Bento Grid 2 Columnas):**
  * Esquinas redondeadas amplias (`border-radius: 24px`).
  * Tarjeta izquierda en gris muy tenue (`#F6F5F8`) con gráfico de barras verticales redondeadas (barras inactivas en gris claro `#E4E4E7` y barra destacada en violeta `#7300FF` con degradado suave hacia `#F8D4FD`).
  * Tarjeta derecha en lavanda (`#F8D4FD`) mostrando el monto acumulado o retorno en tipografía grande (`#000000`) y el porcentaje promedio debajo.
* **Banner de Acción Oscuro (In-App Promo Card):** Tarjeta única en `#000000` dentro del flujo claro, con texto blanco a la izquierda, botón píldora blanco (`#FFFFFF` con texto `#000000`) e ilustración 3D/vectorial en tonos `#7300FF` y `#F8D4FD` a la derecha.
* **Listas de Operaciones / Pagos:** Filas tipo píldora suave (`border-radius: 20px`) con degradado sutil de `#F8D4FD` a `#FFFFFF`, avatar circular a la izquierda, nombre del freelancer/empresa y monto formateado a la derecha.
* **Navegación Inferior (Mobile Dock):** Barra flotante con efecto *glassmorphism* claro (`backdrop-filter: blur(16px)`, fondo `rgba(255,255,255,0.85)`), con pestaña activa en píldora negra (`#000000`) e iconos circulares para el resto de vistas.

---

## 3. Estructura de la Landing Page Interactiva (Inspiración Video + Paleta Proofly)
Combina la arquitectura de scroll y tarjetas flotantes del video analizado con la nueva paleta de **Proofly** en Modo Claro:
* **00:00 - 00:01 (Hero Section):** Fondo `#FFFFFF` con estrellas de 8 puntas gigantes en `#F8D4FD` (opacidad 40%). Navbar con logo **Proofly** a la izquierda y píldora negra (`#000000`) a la derecha. Título masivo ("Liquidez para Freelancers. Retornos para Financiadores"), botón CTA principal con borde `#000000` y fondo `#F8D4FD` o `#7300FF`, rodeado de 5 tarjetas flotantes tipo Polaroid con borde negro de `2px` mostrando hitos aprobados, facturas e ingresos de freelancers.
* **00:02 - 00:03 (Propuesta de Valor Dual):** Bloque contenedor con fondo `#F8D4FD` y bordes redondeados (`32px`). A la izquierda, explicación de cómo cualquier freelancer adelanta el cobro de sus contratos o facturas en minutos; a la derecha, retrato del profesional independiente con widget superpuesto de desembolso instantáneo.
* **00:04 - 00:06 (Carrusel Bento "01-06" — Todo en un solo lugar):** Fondo `#FFFFFF`. Galería deslizable horizontal que muestra widgets interactivos reales:
  1. **Widget Freelancer:** "Recibe tu adelanto" con código QR/link de contrato en caja `#F8D4FD`.
  2. **Widget Financiador:** "Operaciones financiadas" mostrando dos contratos activos (ej. Desarrollo Web, Diseño UI/UX), monto fondeado y tasa de retorno en `#7300FF`.
  3. **Widget Rendimiento:** "Resumen de ganancias" con cifra total, porcentaje positivo y gráfico de barras verticales con barra activa en `#7300FF`.
* **00:07 - 00:10 (CTA Final y Footer):** Bloque limpio en `#FFFFFF`, botón CTA negro/violeta con nota manuscrita ("Financia talento hoy o adelanta tu pago") y footer con la palabra **Proofly** gigante cortada a sangre en `#7300FF` / `#000000`.

