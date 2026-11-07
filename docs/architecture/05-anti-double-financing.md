# Prevención de Doble Financiación (HMAC Canónico) — Proofly (`docs/architecture/05-anti-double-financing.md`)

Este documento especifica la solución criptográfica y arquitectónica para dar cumplimiento a la **Invariante I5 (Doble Financiación Bloqueada por Diseño)** y la **Invariante I3 (Privacidad On-Chain Estricta)** en **Proofly**.

---

## 1. El Problema y los Riesgos de Seguridad

1. **Riesgo de Doble Financiación:** Un actor malintencionado podría intentar subir dos veces la misma factura o el mismo hito contractual con pequeñas variaciones tipográficas (espacios, mayúsculas, campos irrelevantes) para obtener un doble desembolso.
2. **Riesgo de Fuga de PII por Fuerza Bruta (Rainbow Tables):** Si se utiliza un hash simple (`SHA-256` o `Keccak-256`) sobre NITs, cédulas o números de factura, un atacante externo podría precomputar hashes de todas las combinaciones posibles de cédulas colombianas (del 1 al 1.200.000.000) e identificar a los usuarios y sus montos transaccionales en la blockchain pública de Base.

---

## 2. Solución: Normalización Canónica + HMAC-SHA256

Para mitigar ambos riesgos simultáneamente, Proofly utiliza un identificador canónico generado mediante **HMAC-SHA256** utilizando una clave secreta del servidor criptográficamente aleatoria (`SERVER_HMAC_SECRET` de 256 bits):

$$\text{CanonicalHMAC} = \text{HMAC-SHA256}(\text{ServerSecret}, \text{CanonicalPayload})$$

Dado que el atacante no conoce el `ServerSecret`, es matemáticamente imposible realizar ataques de diccionario o fuerza bruta contra los hashes anclados on-chain.

---

## 3. Especificación del Payload Canónico

Antes de aplicar el HMAC, el payload se normaliza a una cadena determinista estricta en minúsculas, sin espacios superfluos, separada por el carácter barra vertical (`|`).

### 3.1. Fórmula para Facturas Electrónicas
Para facturas electrónicas, el CUFE (Código Único de Facturación Electrónica) emitido por la DIAN es la base primaria, combinado con los identificadores fiscales:

$$\text{Payload}_{\text{Factura}} = \text{lower}(\text{cufe}) \parallel \text{"\|"} \parallel \text{clean}(\text{issuerNit}) \parallel \text{"\|"} \parallel \text{clean}(\text{payerNit}) \parallel \text{"\|"} \parallel \text{amountCents} \parallel \text{"\|"} \parallel \text{dueDateUnix}$$

*Ejemplo de Payload Normalizado:*
```text
f89c3b7a1e2d4c5b6a7e8f90123456789abcdef0|901234567|800123456|150000000|1798761600
```

### 3.2. Fórmula para Hitos Contractuales (Milestones)
Para contratos de prestación de servicios u órdenes de trabajo, el identificador único canónico del contrato se combina con el número ordinal del hito y los datos de pago:

$$\text{Payload}_{\text{Hito}} = \text{lower}(\text{contractUuid}) \parallel \text{"\|"} \parallel \text{milestoneIndex} \parallel \text{"\|"} \parallel \text{clean}(\text{payerId}) \parallel \text{"\|"} \parallel \text{amountCents} \parallel \text{"\|"} \parallel \text{dueDateUnix}$$

*Ejemplo de Payload Normalizado:*
```text
c4a8d09f-67bc-4f81-9b1b-5f1234567890|1|900987654|200000000|1798761600
```

---

## 4. Implementación en TypeScript (`packages/domain`)

```typescript
import { createHmac } from 'node:crypto';

export interface CanonicalInvoiceData {
  cufe: string;
  issuerNit: string;
  payerNit: string;
  nominalAmountCents: bigint;
  dueDateUnix: number;
}

export interface CanonicalMilestoneData {
  contractUuid: string;
  milestoneIndex: number;
  payerId: string;
  nominalAmountCents: bigint;
  dueDateUnix: number;
}

export class AntiDuplicateService {
  constructor(private readonly serverSecret: string) {
    if (!serverSecret || serverSecret.length < 32) {
      throw new Error('SERVER_HMAC_SECRET must be at least 32 characters long.');
    }
  }

  public generateInvoiceHmac(data: CanonicalInvoiceData): string {
    const payload = [
      data.cufe.trim().toLowerCase(),
      data.issuerNit.replace(/\D/g, ''),
      data.payerNit.replace(/\D/g, ''),
      data.nominalAmountCents.toString(),
      data.dueDateUnix.toString()
    ].join('|');

    return createHmac('sha256', this.serverSecret).update(payload).digest('hex');
  }

  public generateMilestoneHmac(data: CanonicalMilestoneData): string {
    const payload = [
      data.contractUuid.trim().toLowerCase(),
      data.milestoneIndex.toString(),
      data.payerId.replace(/\D/g, ''),
      data.nominalAmountCents.toString(),
      data.dueDateUnix.toString()
    ].join('|');

    return createHmac('sha256', this.serverSecret).update(payload).digest('hex');
  }
}
```

---

## 5. Doble Candado de Verificación (PostgreSQL + Solidity)

El sistema garantiza que ninguna colisión o reintento malicioso pueda burlar el control en ninguna capa:

### Nivel 1: Base de Datos Relacional (PostgreSQL)
La columna `canonical_hmac` está protegida por una restricción de unicidad estricta a nivel de motor de base de datos:

```sql
CREATE TABLE operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_hmac VARCHAR(64) NOT NULL,
    operation_type VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL,
    nominal_amount_cents BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_operations_canonical_hmac UNIQUE (canonical_hmac)
);

CREATE INDEX idx_operations_canonical_hmac ON operations(canonical_hmac);
```

### Nivel 2: Contrato Inteligente (`ProoflyOperations.sol`)
Antes de mintear cualquier token de participación o registrar una operación on-chain, el contrato inteligente valida que el hash `bytes32` no haya sido registrado previamente:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

error OperationAlreadyRegistered(bytes32 canonicalHmac);

contract ProoflyOperations {
    mapping(bytes32 => bool) public isRegisteredOperation;

    function mintOperation(
        bytes32 canonicalHmac,
        uint256 nominalAmountCents,
        uint256 dueDateUnix,
        address[] calldata financiers,
        uint256[] calldata shares
    ) external onlyRole(OPERATOR_ROLE) {
        if (isRegisteredOperation[canonicalHmac]) {
            revert OperationAlreadyRegistered(canonicalHmac);
        }

        isRegisteredOperation[canonicalHmac] = true;
        // ... lógica de emisión ERC-1155
    }
}
```

