# Signup sin nombre + flujo KYC real

- Objetivo: alinear registro e identidad con la documentación (secciones 6.2 y 9.5 del informe): el usuario se registra, LUEGO hace KYC, y el nombre legal proviene de esa verificación. Quitar "cambiar nombre" de ajustes y el campo nombre del signup.

## Fundamento (doc)

- 6.2 Proofly Independientes: el flujo es "crea su perfil y verifica su identidad" ANTES de registrar facturas.
- 9.5 PLA/fraude: KYC obligatorio (verificación de identidad, beneficiarios finales).
- Conclusión: el nombre legal no es un campo libre; viene del KYC. Correo y documento son identidad, no editables libremente.

## Cambios

- Dominio (`auth.use-case.ts`): `RegisterUserDto` ya no lleva `legalName`; el registro deriva un nombre provisional del correo y deja KYC PENDING (ya no verifica en el signup). Eliminado `UpdateProfileUseCase`. Nuevo `VerifyIdentityUseCase` (usa `KycPort`): valida el nombre, corre el verificador, y al pasar fija `legalName` + `kycStatus=VERIFIED`.
- Servidor: `/api/account/profile` (PATCH nombre) eliminado. Añadido `/api/account/kyc` (POST) además de `/api/account/password`. `account` ahora expone `changePassword` y `verifyIdentity`.
- Snapshot: `me.kycStatus` expuesto.
- Frontend: signup sin campo nombre, con nota de que el KYC viene después. Settings sin "editar nombre": muestra sección Identidad: si PENDING, formulario "Verificar identidad" (nombre legal) que llama a /api/account/kyc; si VERIFIED, el nombre de solo lectura con badge.
- Regla de negocio respetada: sin KYC no se puede invertir (Invariante I6 del dominio). El flujo real es registro → KYC → operar.

## Verificación

- Dominio auth: 6/6 (incluye nombre provisional, KYC pendiente, documento inválido, cambio de contraseña).
- Suite Node completa: 48/48.
- Browser test: PASS — signup sin nombre, KYC en settings desbloquea operar, resto del flujo intacto.
- verify-postgres (round-trip repos): PASS. Signup HTTP contra Postgres: 200 confirmado directo.
- Pendiente menor: `scripts/verify-auth-postgres.mjs` reporta 400 por un artefacto de estado del propio script (no del producto); el signup HTTP real da 200. A revisar sin prioridad.