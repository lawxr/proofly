/**
 * @proofly/domain - Cálculo del CUFE (Código Único de Factura Electrónica)
 *
 * El CUFE es un hash SHA-384 (96 caracteres hex) que la DIAN define de forma
 * determinista a partir de los campos fiscales de la factura. Recalcularlo desde
 * el contenido del documento y compararlo con el CUFE declarado permite verificar
 * la INTEGRIDAD de la factura localmente, sin consultar servicios en línea de la
 * DIAN. No prueba que la DIAN la haya recibido; prueba que no fue alterada.
 *
 * Fórmula (orden oficial de concatenación):
 *   NumFac + FecFac + HorFac + ValFac + CodImp1 + ValImp1 + CodImp2 + ValImp2 +
 *   CodImp3 + ValImp3 + ValTot + NitOFE + NumAdq + ClTec + TipoAmbiente
 *
 * Códigos de impuesto: 01=IVA, 04=INC, 03=ICA. Un impuesto no aplicable va con
 * valor "0.00". TipoAmbiente: 1=producción, 2=pruebas. ClTec es la Clave Técnica.
 */

import { createHash } from 'node:crypto';

export interface CufeFields {
  numFac: string;        // número de la factura (prefijo + consecutivo)
  fecFac: string;        // fecha de emisión AAAA-MM-DD
  horFac: string;        // hora de emisión HH:MM:SS-05:00
  valFac: string;        // valor bruto (subtotal), formato "0.00"
  codImp1: string;       // normalmente "01" (IVA)
  valImp1: string;       // valor IVA "0.00"
  codImp2: string;       // "04" (INC)
  valImp2: string;       // valor INC "0.00"
  codImp3: string;       // "03" (ICA)
  valImp3: string;       // valor ICA "0.00"
  valTot: string;        // valor total a pagar "0.00"
  nitOFE: string;        // NIT del emisor (obligado a facturar)
  numAdq: string;        // documento del adquiriente (pagador)
  clTec: string;         // Clave Técnica (software) / PIN
  tipoAmbiente: string;  // "1" producción | "2" pruebas
}

export const CUFE_FIELD_ORDER: (keyof CufeFields)[] = [
  'numFac', 'fecFac', 'horFac', 'valFac',
  'codImp1', 'valImp1', 'codImp2', 'valImp2', 'codImp3', 'valImp3',
  'valTot', 'nitOFE', 'numAdq', 'clTec', 'tipoAmbiente'
];

/**
 * Calcula el CUFE SHA-384 (hex en minúsculas, 96 caracteres) a partir de los
 * campos en el orden oficial.
 */
export function computeCufe(fields: CufeFields): string {
  const payload = CUFE_FIELD_ORDER.map(key => fields[key]).join('');
  return createHash('sha384').update(payload, 'utf8').digest('hex');
}

/**
 * Compara un CUFE declarado con el recalculado desde los campos. La comparación
 * ignora mayúsculas/minúsculas y espacios en el valor declarado.
 */
export function verifyCufe(declaredCufe: string, fields: CufeFields): boolean {
  const expected = computeCufe(fields);
  return declaredCufe.trim().toLowerCase() === expected;
}
