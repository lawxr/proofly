/**
 * Mensajes de error claros para la UI (es-CO) a partir de los mensajes técnicos
 * del backend. Un mensaje desconocido se muestra igual, nunca un error en blanco.
 */

// Backend messages are English and technical; map them to clear Spanish copy.
// Unknown messages are still shown so the user is never left with a blank error.
export const ERROR_MAP: [RegExp, string][] = [
  [/active operation limit/i, 'Tu nivel permite una operación activa. Liquida la actual para crear otra.'],
  [/exceeds available limit/i, 'El monto supera tu cupo disponible.'],
  [/title between/i, 'El título debe tener entre 3 y 80 caracteres.'],
  [/term between|positive amount|Invalid amount/i, 'Usa un valor positivo y un plazo entre 15 y 90 días.'],
  [/acceptance checks/i, 'Confirma todas las declaraciones antes de enviar.'],
  [/Duplicate invoice/i, 'Esta factura ya está registrada (mismo emisor, pagador, valor y vencimiento).'],
  [/no exact mUSDC equivalent|multiples of 1000/i, 'El valor no tiene equivalente exacto en mUSDC. Usa múltiplos de $ 1.000 COP.'],
  [/On-chain mUSDC deposit required/i, 'Esta operación se fondea solo con un depósito mUSDC desde tu wallet.'],
  [/not open on-chain/i, 'La operación todavía no está abierta on-chain. Espera unos segundos.'],
  [/receipt not found|RPC is behind/i, 'Sepolia aún no muestra la transacción. Intenta sincronizar de nuevo en unos segundos.'],
  [/reverted on-chain/i, 'La transacción fue revertida on-chain.'],
  [/no deposit for this operation/i, 'La transacción no contiene un depósito de tu wallet vinculada para esta operación.'],
  [/no claim for this operation/i, 'La transacción no contiene un retiro de tu wallet vinculada para esta operación.'],
  [/Settlement requires/i, 'Registrar recaudo requiere que el vault esté fondeado por completo y coincida con PostgreSQL.'],
  [/differs from|exceed the .* deposited on-chain|no longer holds|is .* off-chain/i, 'PostgreSQL y el contrato no coinciden para esta operación. Las acciones financieras quedan bloqueadas.'],
  [/remaining|exceeds.*funding/i, 'El aporte supera el fondeo que falta.'],
  [/own operation/i, 'No puedes invertir en una operación tuya.'],
  [/already have a participation/i, 'Ya tienes un aporte en esta operación.'],
  [/KYC verified/i, 'Verifica tu identidad antes de continuar.'],
  [/Connect and verify your wallet/i, 'Conecta tu wallet en Ajustes antes de continuar.'],
  [/not settled yet/i, 'La operación todavía no está liquidada.'],
  [/no participation in this operation/i, 'No tienes un aporte en esta operación.'],
];
export function friendlyError(message: string) {
  const hit = ERROR_MAP.find(([re]) => re.test(message));
  if (hit) return hit[1];
  return message ? `Acción no disponible: ${message}` : 'Acción no disponible. Revisa los datos.';
}
