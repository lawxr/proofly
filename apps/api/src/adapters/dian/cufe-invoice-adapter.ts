/**
 * @proofly/api - Verificación real de facturas electrónicas por CUFE
 *
 * Parsea un XML UBL 2.1 de factura electrónica colombiana, recalcula el CUFE
 * (SHA-384 sobre los campos fiscales) y lo compara con el CUFE declarado en el
 * documento (<cbc:UUID>). Verifica INTEGRIDAD local del documento: que no fue
 * alterado y que su CUFE corresponde a su contenido.
 *
 * Alcance honesto: NO consulta servicios en línea de la DIAN ni certifica que la
 * entidad haya recibido la factura. Esa validación requiere el web service SOAP
 * de la DIAN con habilitación y certificado digital, fuera del alcance del MVP.
 */

import { computeCufe, type CufeFields, type InvoiceVerificationPort, type InvoiceValidationResult } from '@proofly/domain';

/** Extrae el texto del primer elemento con el nombre de etiqueta dado (ignora namespace). */
function tagText(xml: string, localName: string): string | undefined {
  // Coincide <prefix:localName ...>texto</...> o <localName ...>texto</...>.
  const re = new RegExp(`<(?:[\\w.-]+:)?${localName}\\b[^>]*>([^<]*)</(?:[\\w.-]+:)?${localName}>`, 'i');
  const match = re.exec(xml);
  return match ? match[1].trim() : undefined;
}

/** Extrae el bloque XML de un contenedor (p. ej. AccountingCustomerParty) para acotar búsquedas. */
function block(xml: string, localName: string): string | undefined {
  const re = new RegExp(`<(?:[\\w.-]+:)?${localName}\\b[^>]*>([\\s\\S]*?)</(?:[\\w.-]+:)?${localName}>`, 'i');
  const match = re.exec(xml);
  return match ? match[1] : undefined;
}

/** Convierte un monto en pesos con decimales ("1190000.00") a centavos bigint. */
function toCents(amount: string | undefined): bigint {
  if (!amount) return 0n;
  const [whole, frac = ''] = amount.trim().split('.');
  const cents = (frac + '00').slice(0, 2);
  return BigInt(whole || '0') * 100n + BigInt(cents || '0');
}

export class CufeInvoiceVerificationAdapter implements InvoiceVerificationPort {
  private readonly claveTecnica: string;

  /**
   * @param claveTecnica Clave Técnica (software PIN) del emisor. La DIAN la
   *   entrega al facturador habilitado y NO viaja dentro del XML, así que debe
   *   proveerse por configuración para poder recalcular el CUFE. En pruebas
   *   (TipoAmbiente=2) suele ser conocida; en producción la posee cada emisor.
   */
  constructor(claveTecnica: string = '') {
    this.claveTecnica = claveTecnica;
  }

  async verifyInvoice(xmlContent: string): Promise<InvoiceValidationResult> {
    const empty: InvoiceValidationResult = {
      isValid: false, events: [], payerNit: '', payerLegalName: '', nominalAmountCents: 0n, dueDate: ''
    };

    if (!xmlContent || xmlContent.trim().length === 0) {
      return { ...empty, rejectionReason: 'Contenido XML vacío o corrupto.' };
    }

    const declaredCufe = tagText(xmlContent, 'UUID');
    if (!declaredCufe) {
      return { ...empty, rejectionReason: 'El XML no contiene un CUFE (<cbc:UUID>).' };
    }

    // Partes: emisor (supplier) y adquiriente/pagador (customer).
    const supplier = block(xmlContent, 'AccountingSupplierParty') ?? '';
    const customer = block(xmlContent, 'AccountingCustomerParty') ?? '';
    const payerNit = tagText(customer, 'CompanyID') ?? '';
    const payerLegalName = tagText(customer, 'RegistrationName') ?? '';
    const nitOFE = tagText(supplier, 'CompanyID') ?? '';

    // Montos y fechas.
    const valFac = tagText(xmlContent, 'LineExtensionAmount') ?? '0.00';
    const valTot = tagText(xmlContent, 'PayableAmount') ?? '0.00';
    const dueDate = tagText(xmlContent, 'DueDate') ?? tagText(xmlContent, 'IssueDate') ?? '';

    const fields: CufeFields = {
      numFac: tagText(xmlContent, 'ID') ?? '',
      fecFac: tagText(xmlContent, 'IssueDate') ?? '',
      horFac: tagText(xmlContent, 'IssueTime') ?? '',
      valFac,
      codImp1: '01', valImp1: taxValue(xmlContent, '01'),
      codImp2: '04', valImp2: taxValue(xmlContent, '04'),
      codImp3: '03', valImp3: taxValue(xmlContent, '03'),
      valTot,
      nitOFE,
      numAdq: payerNit,
      // La Clave Técnica no viaja en el XML; la aporta el emisor por configuración.
      clTec: this.claveTecnica,
      // TipoAmbiente: 1 producción | 2 pruebas (ProfileExecutionID en UBL DIAN).
      tipoAmbiente: tagText(xmlContent, 'ProfileExecutionID') ?? '2'
    };

    if (!this.claveTecnica) {
      return {
        ...empty,
        payerNit, payerLegalName, nominalAmountCents: toCents(valTot), dueDate,
        events: ['CUFE_SIN_CLAVE_TECNICA'],
        rejectionReason: 'No hay Clave Técnica configurada para recalcular el CUFE. Configúrala (DIAN_CLAVE_TECNICA) para verificar la integridad.'
      };
    }

    const matches = computeCufe(fields) === declaredCufe.trim().toLowerCase();

    if (!matches) {
      return {
        ...empty,
        payerNit, payerLegalName, nominalAmountCents: toCents(valTot), dueDate,
        events: ['CUFE_NO_COINCIDE'],
        rejectionReason: 'El CUFE declarado no coincide con el contenido del documento (posible alteración).'
      };
    }

    return {
      isValid: true,
      events: ['CUFE_VERIFICADO'], // integridad local verificada; no es una consulta en línea a la DIAN
      payerNit,
      payerLegalName,
      nominalAmountCents: toCents(valTot),
      dueDate
    };
  }
}

/** Suma los valores de impuesto cuyo código de tributo coincide (01 IVA, 04 INC, 03 ICA). */
function taxValue(xml: string, taxCode: string): string {
  const re = new RegExp(
    `<(?:[\\w.-]+:)?TaxSubtotal\\b[\\s\\S]*?<(?:[\\w.-]+:)?ID>${taxCode}</(?:[\\w.-]+:)?ID>[\\s\\S]*?</(?:[\\w.-]+:)?TaxSubtotal>`,
    'i'
  );
  const sub = re.exec(xml);
  if (!sub) return '0.00';
  const amount = /<(?:[\w.-]+:)?TaxAmount\b[^>]*>([^<]*)</i.exec(sub[0]);
  return amount ? amount[1].trim() : '0.00';
}
