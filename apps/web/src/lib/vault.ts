/**
 * Helpers del vault mUSDC para la UI. Todo en enteros (unidades mínimas de
 * mUSDC con 6 decimales y centavos COP); nunca coma flotante para dinero.
 * mUSDC es un activo de prueba sin respaldo; la tasa COP es demostrativa.
 */

export const USDC_UNITS = 1_000_000n;

export const sameAddress = (a?: string | null, b?: string | null) => Boolean(a && b && a.toLowerCase() === b.toLowerCase());

/** Hash de transacción compacto: 0x1234…(últimos 8). */
export const shortHash = (hash: string) => (hash.length > 16 ? `${hash.slice(0, 6)}…${hash.slice(-8)}` : hash);

/** Monto mUSDC desde unidades enteras con formato es-CO. */
export function fmtUsdc(units: string | bigint | null | undefined): string {
  const value = BigInt(units ?? 0);
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / USDC_UNITS;
  const fraction = (abs % USDC_UNITS).toString().padStart(6, '0').replace(/0+$/, '');
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '−' : ''}${grouped}${fraction ? ',' + fraction : ''} mUSDC`;
}

/** Unidades mUSDC -> centavos COP a la tasa demo (copPerUsdc COP por 1 mUSDC). */
export const unitsToCents = (units: bigint, copPerUsdc: bigint) => (units * copPerUsdc * 100n) / USDC_UNITS;

/** Centavos COP -> unidades mUSDC a la tasa demo. */
export const centsToUnits = (cents: bigint, copPerUsdc: bigint) => (cents * USDC_UNITS) / (copPerUsdc * 100n);

/** ¿Las unidades equivalen a un número entero de centavos COP? */
export const unitsRepresentable = (units: bigint, copPerUsdc: bigint) => (units * copPerUsdc * 100n) % USDC_UNITS === 0n;

/**
 * Convierte el texto del usuario ("97", "97,5", "97.25") a unidades mínimas.
 * Devuelve null si no es un número positivo con hasta 6 decimales.
 */
export function parseUsdcInput(text: string): bigint | null {
  const value = text.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,6})?$/.test(value)) return null;
  const [whole, decimals = ''] = value.split('.');
  const units = BigInt(whole) * USDC_UNITS + BigInt(decimals.padEnd(6, '0'));
  return units > 0n ? units : null;
}

/** Unidades -> texto editable con punto decimal (para el input). */
export function unitsToInput(units: bigint): string {
  const whole = units / USDC_UNITS;
  const fraction = (units % USDC_UNITS).toString().padStart(6, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
