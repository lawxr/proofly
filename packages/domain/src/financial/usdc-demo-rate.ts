/**
 * @proofly/domain - Tasa demostrativa COP / mUSDC
 *
 * MockUSDC es un activo de prueba sin respaldo. La tasa es fija y solo sirve
 * para la demo en Sepolia: 1 mUSDC = 4.000 COP por defecto, es decir
 * 1.000.000 unidades ERC-20 = 400.000 centavos COP. Toda conversión es entera
 * y exacta: si un monto no tiene equivalente exacto, se rechaza.
 */

export const USDC_UNITS_PER_USDC = 1_000_000n;

export class UsdcDemoRate {
  /** Centavos COP que equivalen a 1 mUSDC (1.000.000 unidades). */
  readonly copCentsPerUsdc: bigint;

  constructor(copPerUsdc: bigint | number = 4000n) {
    const cop = BigInt(copPerUsdc);
    if (cop <= 0n) throw new Error('The demo COP per USDC rate must be positive.');
    this.copCentsPerUsdc = cop * 100n;
  }

  /** ¿El monto en centavos tiene un equivalente exacto en unidades mUSDC? */
  isCentsRepresentable(cents: bigint): boolean {
    return cents >= 0n && (cents * USDC_UNITS_PER_USDC) % this.copCentsPerUsdc === 0n;
  }

  /** ¿Las unidades mUSDC equivalen a un número entero de centavos? */
  isUnitsRepresentable(units: bigint): boolean {
    return units >= 0n && (units * this.copCentsPerUsdc) % USDC_UNITS_PER_USDC === 0n;
  }

  centsToUnits(cents: bigint): bigint {
    if (!this.isCentsRepresentable(cents)) {
      throw new Error(`Amount of ${cents} COP cents has no exact mUSDC equivalent at the demo rate.`);
    }
    return (cents * USDC_UNITS_PER_USDC) / this.copCentsPerUsdc;
  }

  unitsToCents(units: bigint): bigint {
    if (!this.isUnitsRepresentable(units)) {
      throw new Error(`Amount of ${units} mUSDC units has no exact COP cents equivalent at the demo rate.`);
    }
    return (units * this.copCentsPerUsdc) / USDC_UNITS_PER_USDC;
  }
}
