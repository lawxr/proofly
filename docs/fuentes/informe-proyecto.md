# PROOFLY | INFORME DE PROYECTO

## PROOFLY

**Plataforma de factoring tokenizado mediante blockchain en Colombia**

Propuesta de innovación financiera para empresas, microempresas, emprendedores y trabajadores independientes.

Informe conceptual y de viabilidad preliminar  
Colombia · Octubre de 2026

> Documento conceptual aportado por el autor del proyecto. Describe una propuesta y funcionalidades futuras, no el estado implementado de la demo. Se conserva su contenido; las referencias y afirmaciones regulatorias no han sido verificadas en esta edición. Para el alcance técnico actual, consultar [el README](../README.md).

## Ficha del proyecto

| Elemento | Descripción |
| --- | --- |
| Nombre | Proofly |
| Sector | Fintech, blockchain y financiación alternativa |
| Mercado objetivo inicial | Colombia |
| Modelo de negocio | Plataforma digital para conectar solicitantes de liquidez con financiadores mediante cuentas por cobrar verificables. |
| Concepto estratégico | Propuesta inspirada en modelos fintech de financiación empresarial, ampliada mediante tokenización y acceso para independientes. |
| Estado del documento | Propuesta conceptual; no constituye asesoría jurídica ni recomendación de inversión. |

## Contenido

- [1. Resumen ejecutivo](#1-resumen-ejecutivo)
- [2. Contexto y oportunidad de negocio en Colombia](#2-contexto-y-oportunidad-de-negocio-en-colombia)
- [3. Concepto de Proofly y relación con Finaktiva](#3-concepto-de-proofly-y-relación-con-finaktiva)
- [4. Funcionamiento del factoring con blockchain](#4-funcionamiento-del-factoring-con-blockchain)
- [5. Modelo de negocio](#5-modelo-de-negocio-de-proofly)
- [6. Producto para independientes](#6-producto-para-independientes)
- [7. Tecnología blockchain y arquitectura](#7-tecnología-blockchain-y-arquitectura)
- [8. Diseño del token](#8-diseño-del-token-de-proofly)
- [9. Marco jurídico y regulatorio colombiano](#9-marco-jurídico-y-regulatorio-colombiano)
- [10. Riesgos y mitigaciones](#10-riesgos-y-mitigaciones)
- [11. Viabilidad y ventajas competitivas](#11-viabilidad-y-ventajas-competitivas)
- [12. Plan de desarrollo](#12-plan-de-desarrollo-del-proyecto)
- [13. Objetivos del proyecto](#13-objetivos-del-proyecto)
- [14. Indicadores de éxito](#14-indicadores-para-evaluar-el-éxito)
- [15. Conclusión](#15-conclusión)
- [16. Fuentes de consulta](#16-fuentes-de-consulta-y-referencias)

## 1. Resumen ejecutivo

En Colombia, muchas empresas, microempresas y trabajadores independientes prestan servicios o venden productos y deben esperar semanas o meses para recibir el pago de sus clientes. Aunque tengan ingresos futuros relativamente claros, no siempre cuentan con suficiente liquidez para cubrir gastos operativos, pagar proveedores, adquirir materiales o continuar ejecutando proyectos.

El factoring permite solucionar parcialmente este problema mediante la venta de facturas o cuentas por cobrar a un tercero, a cambio de recibir dinero anticipadamente. Sin embargo, existen oportunidades para desarrollar modelos digitales que faciliten el acceso a esta financiación, reduzcan costos operativos y permitan evaluar operaciones de menor cuantía.

Proofly propone combinar el factoring tradicional con tecnología blockchain para crear un mercado digital de derechos económicos sobre facturas y otras cuentas por cobrar verificables. La plataforma permitiría que una empresa o un trabajador independiente registre una cuenta por cobrar, solicite financiación y, una vez verificada la operación, encuentre financiadores dispuestos a financiarla.

La tecnología blockchain permitiría registrar eventos importantes, controlar la titularidad digital de los derechos representados y mejorar la trazabilidad. El proyecto se distinguiría por cuatro características:

- Inclusión financiera: atender empresas, microempresas y profesionales independientes.
- Tokenización: representar digitalmente derechos económicos sobre cuentas por cobrar verificadas, bajo una estructura jurídica válida.
- Transparencia: mantener un registro auditable de emisión, transferencia, financiación, pago y liquidación.
- Financiación alternativa: conectar solicitantes con financiadores según condiciones y perfil de riesgo.

Proofly no debería limitarse a convertir facturas en tokens. Su propuesta de valor sería hacer más accesible, verificable y eficiente la financiación de ingresos pendientes de cobro, utilizando blockchain cuando aporte ventajas reales frente a una base de datos convencional.

La recomendación inicial es desarrollar un producto piloto para Colombia, con financiación en pesos colombianos (COP), facturas electrónicas verificables, evaluación de riesgo y contratos inteligentes. La plataforma podría evolucionar hacia un mercado más amplio a medida que se valide su viabilidad comercial, jurídica y financiera.

## 2. Contexto y oportunidad de negocio en Colombia

### 2.1. El problema: tener ingresos no significa tener liquidez

Una empresa puede haber vendido $50 millones en servicios y, aun así, no tener suficiente dinero para pagar sus obligaciones actuales si sus clientes pagan a 60 o 90 días. Esta situación también afecta a independientes.

Por ejemplo, un desarrollador de software puede terminar un proyecto para una compañía, emitir su factura electrónica y esperar 45 días para recibir el pago. Mientras tanto, debe cubrir gastos personales, pagar herramientas de trabajo y financiar nuevos proyectos.

El problema tiene tres dimensiones:

- Financiera: existe una diferencia entre el momento en que se genera un ingreso y el momento en que se recibe el dinero.
- Operativa: la falta de liquidez puede impedir que el negocio acepte nuevos contratos o continúe funcionando.
- De acceso: algunos solicitantes tienen dificultades para acceder al crédito tradicional por poca trayectoria crediticia, tamaño o ingresos variables.

El factoring permite convertir una cuenta por cobrar en liquidez anticipada, pero el acceso depende de la calidad de la cuenta, la solvencia del deudor, los costos operativos y los criterios de riesgo del financiador.

### 2.2. ¿Por qué existe una oportunidad para Proofly?

Colombia cuenta con infraestructura relevante para el factoring electrónico, incluida la facturación electrónica y RADIAN, administrado por la DIAN. RADIAN permite registrar, consultar y hacer seguimiento a facturas electrónicas de venta que tienen la condición de título valor y a eventos relacionados con su circulación.

Proofly no tendría que inventar desde cero un mecanismo para demostrar la existencia de facturas electrónicas. Podría construir una capa tecnológica adicional que permita:

1. Verificar la factura y su información relevante.
2. Evaluar el riesgo de la operación.
3. Representar digitalmente los derechos económicos asociados.
4. Conectar al solicitante con posibles financiadores.
5. Registrar eventos relevantes en blockchain.
6. Distribuir los pagos según las condiciones contractuales.

La oportunidad no consiste en reemplazar a la DIAN ni a RADIAN, sino en complementar la infraestructura existente mediante un producto de financiación más accesible y programable.

### 2.3. El problema específico de los trabajadores independientes

Proofly podría atender a personas naturales que generan ingresos mediante su actividad profesional o comercial.

| Segmento | Ejemplo de necesidad |
| --- | --- |
| Desarrolladores de software | Esperan el pago de contratos de desarrollo. |
| Diseñadores y creativos | Tienen facturas pendientes por proyectos terminados. |
| Consultores | Prestan servicios a empresas que pagan a plazo. |
| Contratistas | Necesitan liquidez mientras esperan pagos contractuales. |
| Agencias pequeñas | Deben pagar colaboradores antes de cobrar al cliente. |
| Profesionales independientes | Facturan servicios a clientes empresariales. |
| Microempresas | Venden bienes o servicios con plazos de pago. |
| Emprendedores B2B | Necesitan capital de trabajo para continuar operando. |

No todos estos usuarios podrán utilizar el mismo producto. Una persona que factura electrónicamente a una empresa y tiene una factura que cumple los requisitos para circular como título valor podría acceder a factoring. Alguien que recibe ingresos de plataformas, pagos informales o contratos sin una cuenta por cobrar jurídicamente transferible podría necesitar otra solución.

Proofly debería diferenciar entre factoring propiamente dicho y financiación de otros ingresos futuros. No debe representar automáticamente cualquier ingreso esperado como una factura negociable.

## 3. Concepto de Proofly y relación con Finaktiva

### 3.1. El concepto de Finaktiva 2

La idea puede entenderse como una evolución conceptual de un modelo fintech de financiación empresarial: conservar la finalidad de proporcionar financiación a negocios y ampliarla mediante tokenización, automatización y un segmento específico de trabajadores independientes.

La comparación no implica que Proofly sea una filial, una continuación oficial o una versión autorizada de Finaktiva. Sería un proyecto independiente inspirado en una necesidad similar del mercado.

**Propuesta de valor:** Proofly es una plataforma de financiación basada en blockchain que permite a empresas y trabajadores independientes obtener liquidez anticipada sobre facturas y cuentas por cobrar verificables, conectándolos con financiadores mediante operaciones digitales trazables y potencialmente fraccionables.

### 3.2. Comparación conceptual

| Característica | Factoring tradicional | Propuesta Proofly |
| --- | --- | --- |
| Objetivo | Obtener liquidez anticipada. | Mismo objetivo, con infraestructura digital adicional. |
| Usuarios | Empresas y otros sujetos elegibles. | Empresas, microempresas y personas naturales con cuentas elegibles. |
| Verificación | Documentación y sistemas de los participantes. | Verificación documental y fuentes autorizadas, con registro de evidencias. |
| Negociación | Factor o sistema de negociación. | Financiación digital sujeta a su estructura jurídica. |
| Registro | Sistemas contables, contractuales y registros aplicables. | Blockchain como capa adicional de trazabilidad. |
| Financiadores | Depende de la estructura del producto. | Posible financiación compartida, si es jurídicamente viable. |
| Automatización | Varía según el operador. | Contratos inteligentes para reglas y eventos programables. |
| Activos digitales | No son indispensables. | Tokens vinculados a derechos económicos, si la estructura legal lo permite. |
| Alcance | Depende del operador. | Posible ampliación hacia operaciones de menor cuantía. |

La diferencia más importante no es que Proofly utilice criptomonedas. Es que podría facilitar un mercado de financiación en el que cada operación tenga reglas verificables, representación digital controlada y trazabilidad común.

## 4. Funcionamiento del factoring con blockchain

### 4.1. ¿Qué se tokeniza?

En Proofly, el token no debería representar simplemente una moneda creada por la plataforma. La propuesta sería utilizar un token de derechos económicos asociado contractualmente a una operación de financiación específica.

Por ejemplo, una factura puede tener un valor de $10.000.000 y vencimiento a 60 días. El solicitante necesita dinero ahora y acepta recibir $9.500.000, sujeto a costos y condiciones acordados. La plataforma podría representar digitalmente la participación económica vinculada a esa operación.

- La factura: documento que acredita una operación comercial y que, si cumple los requisitos aplicables, puede circular como título valor.
- El derecho económico: derecho contractual a recibir determinados pagos según la estructura jurídica de la operación.
- El token: representación digital utilizada para registrar o transferir una participación o derecho conforme a las condiciones establecidas.

El token no convierte por sí solo una factura en título valor, no demuestra automáticamente que la deuda sea válida y no garantiza que su titular pueda exigir judicialmente el pago. La representación digital debe corresponder a derechos válidamente constituidos y evitar la doble negociación de una misma cuenta por cobrar.

### 4.2. Ejemplo de operación

Una empresa de diseño factura $10.000.000 a un cliente empresarial, que pagará en 60 días. La empresa necesita liquidez para cubrir gastos y pagar colaboradores. Registra la solicitud en Proofly. La plataforma verifica la información comercial, la factura, el deudor y la elegibilidad jurídica de la operación. Después de evaluar el riesgo, presenta una propuesta.

El solicitante acepta recibir $9.500.000 a cambio de transferir los derechos correspondientes bajo el contrato aplicable. Los financiadores aportan los recursos. Si se utiliza una estructura de participaciones fraccionadas, cada participante adquiere los derechos definidos contractualmente. Al vencimiento, el deudor paga conforme a las instrucciones acordadas y los recursos se distribuyen.

| Concepto | Valor ilustrativo |
| --- | --- |
| Valor nominal de la factura | $10.000.000 |
| Plazo restante | 60 días |
| Desembolso anticipado | $9.500.000 |
| Diferencia bruta | $500.000 |
| Descuento sobre valor nominal | 5 % |
| Porcentaje anticipado | 95 % |

El descuento bruto es el 5 % del valor nominal. No debe confundirse con una tasa efectiva anual ni con la rentabilidad neta del financiador. El cálculo final depende del plazo, costos, impuestos, comisiones y tratamiento de pérdidas. El pago puede ser tardío, parcial o inexistente, por lo que la rentabilidad no está garantizada.

### 4.3. ¿Dónde interviene blockchain?

7. Registro de la operación: registrar un identificador único, estado y referencia criptográfica a documentación pertinente.
8. Emisión del token: emitir tokens solo después de constituir el derecho económico y cumplir los requisitos legales.
9. Financiación: registrar el cumplimiento de las condiciones de financiación.
10. Administración: controlar participaciones, cambios de estado y reglas de transferencia.
11. Pago y liquidación: registrar evidencia del pago y ejecutar instrucciones de distribución.
12. Cierre: marcar la operación como liquidada, cancelada o extinguida según el diseño.

La confirmación del pago no debería depender exclusivamente de una afirmación escrita en blockchain. Debe existir evidencia confiable del ingreso efectivo, como una integración autorizada con un sistema de pagos o conciliación bancaria.

Blockchain aporta trazabilidad y automatización, pero no sustituye la verificación comercial, el análisis crediticio, los contratos ni los mecanismos legales de cobro.

## 5. Modelo de negocio de Proofly

### 5.1. Participantes del ecosistema

| Participante | Función | Beneficio esperado |
| --- | --- | --- |
| Empresas y microempresas | Solicitan anticipos sobre cuentas por cobrar. | Mejoran flujo de caja. |
| Independientes | Solicitan financiación sobre cuentas elegibles. | Acceden a liquidez sin depender solo del crédito tradicional. |
| Inversionistas | Financian operaciones seleccionadas. | Acceden a oportunidades con riesgo y rendimiento variables. |
| Proofly | Gestiona plataforma, verificación, registro y coordinación. | Ingresos por servicios prestados. |
| Factores y aliados financieros | Adquieren derechos, aportan financiación o ejecutan funciones autorizadas. | Acceden a nuevas operaciones. |
| Clientes/deudores | Pagan las obligaciones correspondientes. | Cumplen sus compromisos comerciales. |
| Proveedores tecnológicos | Facilitan identidad, pagos y verificación. | Ingresos por sus servicios. |

La estructura definitiva dependerá de si Proofly actúa como proveedor tecnológico, intermediario, sistema de negociación, factor o combinación de funciones jurídicamente permitidas. Para el producto inicial conviene evitar custodiar directamente el dinero de inversionistas o asumir funciones para las cuales se requiera una autorización no obtenida.

### 5.2. Fuentes de ingresos

| Fuente | Descripción | Aplicación |
| --- | --- | --- |
| Comisión por operación | Cargo por gestionar financiación exitosa. | Al desembolsarse la financiación. |
| Comisión de estructuración | Cargo por organizar y documentar una operación. | Según contrato y servicios. |
| Servicios de verificación | Cobro por validaciones adicionales. | Cuando se contrata el servicio. |
| Servicios empresariales | Herramientas de cartera, vencimientos y liquidez. | Suscripciones empresariales. |
| Servicios de integración | Integraciones con contabilidad, facturación o ERP. | Contratos empresariales. |
| Administración | Seguimiento y gestión de operaciones. | Durante la operación. |

Las comisiones deben ser transparentes e incorporarse al cálculo del costo total de financiación. No se recomienda que la principal fuente de ingresos sea emitir un token especulativo: la viabilidad debería depender de operaciones reales y servicios que aporten valor.

## 6. Producto para independientes

### 6.1. Proofly Empresas

Dirigido a pequeñas, medianas y grandes empresas. Sus funciones podrían incluir:

- Registro de personas jurídicas y verificación empresarial.
- Carga o consulta autorizada de facturas electrónicas.
- Validación de condiciones de negociación.
- Evaluación del riesgo del deudor.
- Solicitud y publicación de financiación.
- Seguimiento del vencimiento, liquidación y cierre.

### 6.2. Proofly Independientes

Dirigido a personas naturales que trabajan por cuenta propia: desarrolladores, consultores, diseñadores, profesionales de marketing, contratistas, traductores, creadores de contenido que prestan servicios a empresas y otros profesionales que facturan proyectos empresariales.

13. El usuario crea su perfil y verifica su identidad.
14. Registra una factura o cuenta por cobrar.
15. La plataforma comprueba la obligación y la identidad del deudor.
16. Evalúa si el derecho puede cederse y financiarse.
17. Presenta una propuesta de financiación.
18. El usuario acepta las condiciones.
19. Se ejecuta la operación con el financiador.
20. El sistema registra el estado hasta la liquidación.

### 6.3. Elegibilidad y evaluación

No todos los trabajadores independientes son elegibles para factoring. Una factura de $6.000.000 emitida a una empresa con plazo de 45 días podría ser candidata si cumple los requisitos. Una expectativa de pago informal o por servicios aún no prestados no necesariamente constituye una cuenta por cobrar susceptible de factoring.

La evaluación podría considerar:

- Identidad del solicitante.
- Existencia y condiciones del contrato.
- Identidad y solvencia del deudor.
- Historial de pago del deudor.
- Evidencia de cumplimiento del servicio.
- Vencimiento y controversias de la cuenta.
- Cesiones o gravámenes anteriores, cuando puedan verificarse.
- Concentración del riesgo en un solo cliente.

El análisis no debería depender exclusivamente del historial crediticio personal. También debe considerar la calidad del derecho de cobro y la capacidad de pago del deudor.

## 7. Tecnología blockchain y arquitectura

### 7.1. Blockchain pública o permisionada

| Criterio | Blockchain pública | Blockchain permisionada |
| --- | --- | --- |
| Participación | Participación según las reglas públicas de la red. | Acceso limitado a participantes autorizados. |
| Transparencia | Puede facilitar verificación pública. | Visibilidad controlada mediante permisos. |
| Privacidad | Debe evitarse exponer datos sensibles. | Permite limitar acceso; no garantiza privacidad por sí sola. |
| Costos | Tarifas variables según la red. | Dependen de infraestructura y operación. |
| Control | La plataforma no controla toda la red. | Gobernanza definida entre participantes. |
| Caso de uso | Registro público de estados y activos compatibles. | Operaciones entre entidades identificadas. |

Alternativa A: una red compatible con Ethereum Virtual Machine (EVM), con contratos inteligentes en Solidity y estándares de tokens. Puede ser apropiada para un prototipo académico.

Alternativa B: Hyperledger Fabric, una red permisionada que puede ser apropiada para un consorcio empresarial con identidades conocidas y acceso restringido.

No hay una opción universalmente superior. La selección depende de privacidad, gobernanza, costos, integración y perfil de los participantes. No es necesario crear una blockchain propia.

### 7.2. Arquitectura tecnológica propuesta

| Componente | Responsabilidad | Tecnologías posibles |
| --- | --- | --- |
| Frontend | Interfaz para empresas, independientes e inversionistas. | React y Vite. |
| Backend | Usuarios, operaciones, documentos y reglas de negocio. | Node.js/Express o Spring Boot. |
| Base de datos | Información comercial, usuarios, estados y operaciones. | PostgreSQL. |
| Servicio blockchain | Emisión, consulta de tokens, eventos y liquidación programada. | Solidity/red EVM o Hyperledger Fabric. |
| Integración externa | Verificación de facturas, identidad y pagos. | API autorizadas y terceros. |
| Almacenamiento documental | Contratos y soportes. | Almacenamiento privado con controles. |

Flujo lógico: Usuarios → frontend web → API Proofly → PostgreSQL, verificación y motor de riesgo → servicio de operaciones → integraciones externas y contratos inteligentes → blockchain y registro de eventos.

La integración directa con DIAN o RADIAN no debe darse por garantizada: depende de funcionalidades disponibles, condiciones de acceso, roles habilitados y acuerdos. El MVP puede comenzar con verificaciones documentales y procedimientos controlados.

### 7.3. Información que debe registrarse en blockchain

No conviene almacenar facturas completas ni datos personales directamente en una cadena pública. La información mínima podría incluir:

- Identificador de la operación y de la factura.
- Hash criptográfico del documento o evidencia.
- Identidad digital autorizada del titular del token.
- Cantidad de tokens emitidos.
- Estado de la operación y fecha de eventos.
- Referencia a la evidencia de liquidación.

Los datos personales y comerciales permanecerían en sistemas protegidos. El hash permite comprobar coincidencia con una versión previamente registrada, pero no prueba que el documento sea verdadero ni que la factura sea jurídicamente válida.

## 8. Diseño del token de Proofly

### 8.1. ¿Debe existir una criptomoneda propia?

Se recomienda no crear inicialmente una criptomoneda independiente cuyo precio fluctúe en el mercado. Lo esencial es representar derechos económicos vinculados a operaciones concretas, no crear una moneda especulativa.

#### A. Tokens de participación en una operación

Representarían participaciones o derechos económicos definidos contractualmente para una financiación específica. Por ejemplo, una operación de $10.000.000 podría dividirse en cinco participaciones de $2.000.000, si la estructura jurídica permite esa distribución.

Cada participación debería definir:

- El derecho económico representado.
- La participación en los pagos.
- Costos, comisiones y tratamiento de incumplimientos.
- Restricciones de transferencia.
- Duración, mecanismos de reclamación y procedimiento de liquidación.

El token no garantiza rendimiento fijo ni convierte automáticamente al titular en propietario directo de la factura.

#### B. Token de liquidación

En una fase posterior, Proofly podría evaluar una representación digital de dinero u otro instrumento de liquidación. No se recomienda empezar por esta alternativa porque puede añadir complejidad jurídica y operativa. El MVP puede liquidar en pesos colombianos y utilizar blockchain para registrar eventos.

### 8.2. Cómo mitigar la doble financiación

Si una factura de $10.000.000 se registra en Proofly, el titular podría intentar financiarla en otra plataforma. La blockchain de Proofly no impide por sí sola que otra plataforma registre la misma factura.

21. Identificar la factura con datos y referencias oficiales.
22. Comprobar estado y eventos pertinentes en RADIAN cuando corresponda.
23. Verificar titularidad y capacidad de disposición.
24. Revisar cesiones o negociaciones previas identificables.
25. Impedir nuevas emisiones sobre una operación ya financiada salvo estructura autorizada.
26. Registrar estados y restricciones de transferencia.
27. Conciliar pagos y modificaciones posteriores.
28. Disponer de procedimientos para discrepancias entre registro digital y situación jurídica.

Evitar la doble financiación exige controles de identidad, consultas a fuentes pertinentes, coordinación y mecanismos legales que respalden los derechos registrados.

## 9. Marco jurídico y regulatorio colombiano

La utilización de blockchain no elimina las obligaciones que corresponden al factoring, la financiación, el tratamiento de datos personales o la negociación de instrumentos de inversión. La estructura final debe revisarse con profesionales especializados en derecho financiero, comercial y tecnológico.

### 9.1. Facturas electrónicas y RADIAN

La DIAN administra RADIAN, que permite registrar y consultar facturas electrónicas de venta que circulan como títulos valor y sus eventos asociados. Para Proofly no basta con cargar un PDF: debe determinarse si la cuenta por cobrar cumple los requisitos de la operación, identificarse el titular y verificarse la disponibilidad para negociación.

Fuentes oficiales: Portal RADIAN: https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/radian/ ; marco normativo: https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/marco-normativo-radian/

### 9.2. ¿Requiere autorización de la Superintendencia Financiera?

La respuesta depende del modelo concreto. No es lo mismo desarrollar software para administración documental que recibir recursos del público, intermediar financiación, administrar inversiones o estructurar instrumentos sujetos al mercado de valores.

Antes de operar, Proofly debe determinar:

- Si solo presta servicios tecnológicos.
- Quién adquiere los derechos económicos de las facturas.
- Quién recibe y administra el dinero de los participantes.
- Cómo se estructura la participación de varios financiadores.
- Si los tokens representan derechos contractuales, valores u otros activos.
- Si la negociación queda sujeta al régimen del mercado de valores.
- Qué entidades ejecutan pagos y custodian recursos.

No debe asumirse que emitir tokens privados elimina obligaciones regulatorias. La clasificación depende de los derechos representados y de la actividad efectivamente desarrollada. Consultar: https://www.superfinanciera.gov.co/preguntas-frecuentes/34/34-innovacion-sfc/ y https://www.superfinanciera.gov.co/publicaciones/10103299/innovasfcelhub-10103299/

### 9.3. Criptoactivos en Colombia

Blockchain es una tecnología de registro distribuido y no exige que el producto dependa de una criptomoneda como medio de pago. La Superintendencia Financiera ha advertido sobre la naturaleza y los riesgos de los criptoactivos y que el uso de tecnología no equivale a aval o supervisión del modelo.

Proofly podría mantener desembolsos y pagos en pesos colombianos, utilizando blockchain para registrar la operación. Referencia: https://www.superfinanciera.gov.co/publicaciones/10115324/que-son-los-activos-digitales-o-criptoactivos/

### 9.4. Protección de datos personales

Proofly manejaría información de identidad, facturas, contratos, clientes y operaciones. Debe considerar la Ley 1581 de 2012 y las disposiciones reglamentarias aplicables. Medidas recomendadas:

- Consentimiento y bases jurídicas apropiadas.
- Políticas de tratamiento de información.
- Control de acceso a documentos.
- Autorizaciones para consultar información de terceros.
- Protección de credenciales.
- Procedimientos para atender solicitudes de titulares.
- Minimización de información en blockchain.
- Gestión de incidentes de seguridad.

### 9.5. Prevención de lavado de activos y fraude

Las obligaciones de conocimiento del cliente, identificación de beneficiarios finales, prevención del fraude y controles sobre origen y destino de recursos dependerán del rol de Proofly y de su estructura.

- Verificación de identidad.
- Validación de empresas y representantes.
- Identificación de beneficiarios finales cuando sea exigible.
- Monitoreo conforme a obligaciones aplicables.
- Detección de facturas duplicadas.
- Identificación de relaciones entre solicitantes y deudores.
- Revisión de inconsistencias documentales.
- Gestión de alertas y bloqueos preventivos.

### 9.6. Resumen regulatorio

| Tema | Implicación para Proofly |
| --- | --- |
| Facturas electrónicas | Verificar autenticidad, requisitos y disponibilidad del derecho. |
| RADIAN | Evaluar acceso, habilitación e integración aplicables. |
| Actividad financiera | Determinar autorizaciones o participación de entidades habilitadas. |
| Tokenización | Definir derechos representados y restricciones. |
| Mercado de valores | Evaluar si la emisión o negociación queda sujeta a este régimen. |
| Protección de datos | Aplicar controles sobre información personal y comercial. |
| Prevención del fraude | Verificar documentos, identidades y operaciones. |
| Pagos | Usar mecanismos legalmente adecuados y conciliables. |

Conclusión regulatoria: antes de recibir inversiones del público, Proofly debe definir su modelo jurídico y determinar autorizaciones, alianzas y controles. Un prototipo universitario puede demostrar el funcionamiento técnico con operaciones simuladas sin captar dinero real.

## 10. Riesgos y mitigaciones

| Riesgo | Descripción | Mitigación |
| --- | --- | --- |
| Impago | El deudor no paga. | Evaluación crediticia, límites de exposición y mecanismos de cobro. |
| Fraude documental | Factura falsa o alterada. | Verificación documental y fuentes autorizadas. |
| Doble financiación | La misma cuenta se negocia más de una vez. | Controles de titularidad, disponibilidad y registro. |
| Riesgo jurídico | El token no representa válidamente el derecho anunciado. | Estructuración contractual y revisión legal. |
| Riesgo regulatorio | Actividad sujeta a autorización sin cumplir requisitos. | Análisis jurídico y alianzas autorizadas. |
| Riesgo tecnológico | Fallos o vulnerabilidades de contratos inteligentes. | Auditorías, pruebas y controles de seguridad. |
| Riesgo de liquidez | No hay suficientes financiadores. | Mercado inicial limitado y alianzas. |
| Concentración | Operaciones dependen de un solo deudor. | Límites de exposición y diversificación. |
| Privacidad | Exposición de información sensible. | Cifrado, acceso restringido y almacenamiento fuera de blockchain. |
| Reputación | Una operación fallida afecta la confianza. | Transparencia, atención al usuario y trazabilidad. |
| Operativo | Pagos no conciliados correctamente. | Conciliación automatizada y procedimientos de excepción. |
| Adopción | Usuarios no comprenden la tokenización. | Interfaz sencilla y costos expresados en COP. |

Tokenizar una cuenta por cobrar no garantiza que exista un comprador dispuesto a financiarla. Proofly necesita oferta real de capital y criterios de riesgo aceptables.

## 11. Viabilidad y ventajas competitivas

### 11.1. Ventajas potenciales

- Acceso para independientes con cuentas por cobrar elegibles.
- Financiación de menor cuantía mediante automatización que podría reducir costos por solicitud.
- Trazabilidad de emisión, transferencia y liquidación.
- Automatización de reglas de emisión, transferencia y cierre.
- Transparencia de desembolso neto, costos, vencimiento y condiciones.
- Posible diversificación de la financiación, si el marco jurídico y el producto lo permiten.

### 11.2. Ventajas que no están garantizadas

Blockchain no garantiza menores tasas, menores comisiones, aprobación de todos los solicitantes, ausencia de fraude, cobro de facturas, liquidez de tokens, eliminación de intermediarios ni cumplimiento regulatorio. Estas ventajas deben demostrarse mediante pruebas.

### 11.3. Comparación con la oferta actual

Finaktiva ya ofrece soluciones de liquidez empresarial, adelanto de facturas y financiación de proveedores. Por ello, Proofly no debería presentarse solo como una plataforma de anticipo de facturas. La diferenciación debería centrarse en:

29. Un producto pensado para independientes con cuentas por cobrar elegibles.
30. Infraestructura de derechos económicos digitales con controles de titularidad y trazabilidad.
31. Financiación de menor cuantía cuya eficiencia pueda medirse.

La ventaja competitiva dependerá de verificar operaciones, conseguir financiadores, reducir costos y gestionar el riesgo. Referencia comercial: https://www.finaktiva.com/factoring/

## 12. Plan de desarrollo del proyecto

### Fase 1. Diseño y validación del modelo

Objetivo: comprobar que existe una necesidad concreta y definir un producto viable.

- Identificar perfiles de usuarios y entrevistar empresas e independientes.
- Analizar operaciones de factoring existentes.
- Definir cuentas por cobrar admitidas.
- Diseñar el modelo de negocio e investigar requisitos jurídicos.
- Definir flujo de financiación, riesgos y responsabilidades.

Entregables: modelo de negocio, requisitos funcionales y no funcionales, arquitectura, flujo de operación, matriz de riesgos y estructura jurídica preliminar.

### Fase 2. Desarrollo del MVP

Objetivo: construir una versión funcional que demuestre el proceso completo.

- Registro e inicio de sesión.
- Perfiles de empresa, independiente e inversionista simulado.
- Registro de facturas y verificación documental básica.
- Evaluación de elegibilidad.
- Publicación de solicitudes de financiación.
- Selección de operaciones.
- Emisión de tokens de prueba.
- Registro de eventos en blockchain.
- Simulación de pago y liquidación.
- Panel de seguimiento e historial auditable.

Para el prototipo se pueden utilizar datos ficticios, una red de pruebas y cuentas simuladas.

### Fase 3. Validación técnica y financiera

- Intentar registrar dos veces una factura.
- Intentar emitir más tokens de los permitidos.
- Intentar transferir tokens a usuarios no autorizados.
- Simular pago parcial, impago y cancelación.
- Evaluar fallos del contrato inteligente.
- Comprobar correspondencia entre base de datos y blockchain.
- Medir costo por solicitud y comparar tiempos con una línea base.

### Fase 4. Piloto con aliados

Objetivo: probar con operaciones reales cuando exista una estructura jurídica y operativa adecuada. Posibles aliados: empresas de factoring habilitadas, sistemas de negociación de facturas, proveedores tecnológicos, empresas pagadoras, asociaciones profesionales y entidades financieras autorizadas.

El piloto debería limitarse a un grupo pequeño de usuarios y operaciones para medir resultados antes de ampliar el servicio.

### 12.1. Cronograma sugerido

| Semana | Actividad | Entregable |
| --- | --- | --- |
| 1 | Investigación de mercado y problema. | Informe de oportunidad. |
| 2 | Definición de usuarios y requisitos. | Especificación del MVP. |
| 3 | Arquitectura y modelo de datos. | Diagramas y diseño técnico. |
| 4 | Usuarios y registro de facturas. | Backend inicial. |
| 5 | Flujo de financiación. | Gestión de operaciones. |
| 6 | Contrato inteligente. | Emisión y control de tokens de prueba. |
| 7 | Integración frontend-backend-blockchain. | MVP funcional. |
| 8 | Pruebas, riesgos y documentación. | Informe de validación. |

El cronograma es orientativo y corresponde a un prototipo académico controlado, no a una plataforma lista para operar comercialmente.

## 13. Objetivos del proyecto

### Objetivo general

Desarrollar y validar un prototipo de plataforma de factoring tokenizado basado en blockchain que facilite la financiación de facturas y cuentas por cobrar verificables de empresas y trabajadores independientes en Colombia.

### Objetivos específicos

32. Caracterizar las necesidades de liquidez de empresas y trabajadores independientes, así como las condiciones del mercado de factoring colombiano.
33. Diseñar una arquitectura tecnológica y un modelo de operación que integren verificación de cuentas por cobrar, evaluación de riesgo y representación digital de derechos económicos.
34. Implementar un prototipo que permita registrar operaciones, emitir tokens de prueba y gestionar sus estados mediante contratos inteligentes.
35. Validar la trazabilidad, la integridad de los registros y el comportamiento del prototipo mediante escenarios de prueba.
36. Evaluar la viabilidad técnica, financiera y regulatoria de la solución propuesta.

## 14. Indicadores para evaluar el éxito

| Indicador | Qué mide | Meta inicial sugerida |
| --- | --- | --- |
| Tiempo de registro | Tiempo para registrar una solicitud. | Menos de 10 minutos, excluyendo verificaciones externas. |
| Tiempo de evaluación | Solicitud completa a decisión preliminar. | Menos de 24 horas en el piloto. |
| Errores de registro | Operaciones con inconsistencias técnicas. | Menos del 1 % en pruebas controladas. |
| Detección de duplicados | Rechazo de facturas repetidas dentro del sistema. | 100 % de duplicados definidos en pruebas. |
| Correspondencia de registros | Coincidencia entre estado y blockchain. | 100 % en escenarios de prueba. |
| Costos operativos | Costo por operación. | Establecer línea base y demostrar reducción. |
| Adopción | Solicitantes que completan el proceso. | Definir tras validar el mercado. |
| Financiación efectiva | Solicitudes elegibles financiadas. | Medir durante el piloto. |
| Incumplimiento | Proporción y valor de impagos. | Medir por cohortes y vencimiento. |
| Satisfacción | Percepción de facilidad y transparencia. | Encuestas posteriores a cada operación. |

Estas metas son hipótesis de diseño, no resultados alcanzados ni promedios comprobados del mercado. Para medir el aporte de blockchain, se recomienda comparar el prototipo con una versión equivalente que use solo una base de datos convencional.

## 15. Conclusión

Proofly es una propuesta interesante para un proyecto de blockchain, especialmente si se enfoca en ampliar el acceso a financiación mediante facturas y cuentas por cobrar verificables.

La propuesta combina una necesidad financiera concreta con una tecnología que puede aportar trazabilidad, automatización y control de participaciones digitales. Su mayor oportunidad está en atender empresas pequeñas y trabajadores independientes que prestan servicios a clientes empresariales y necesitan liquidez antes del vencimiento.

El valor principal no está en crear una criptomoneda, sino en construir un mecanismo de financiación confiable. Blockchain puede ayudar a registrar derechos económicos y automatizar parte de la operación, pero no sustituye la validez jurídica de las facturas, el análisis crediticio, los pagos ni el cumplimiento regulatorio.

Recomendaciones estratégicas:

37. Comenzar con facturas electrónicas y cuentas por cobrar verificables.
38. Priorizar independientes que facturan servicios a empresas.
39. Mantener desembolsos y pagos en pesos colombianos durante el piloto.
40. Utilizar blockchain para representar y auditar operaciones de prueba.
41. Definir los derechos contractuales antes de diseñar los tokens.
42. Validar el modelo con usuarios y financiadores potenciales.
43. Evaluar alianzas con participantes habilitados del ecosistema colombiano.
44. Avanzar hacia operaciones reales solo después de resolver las condiciones jurídicas y regulatorias.

**Posicionamiento recomendado:** Proofly es una infraestructura de financiación de cuentas por cobrar, con especial atención a los independientes, que combina verificación comercial, evaluación de riesgo y trazabilidad mediante blockchain.

## 16. Fuentes de consulta y referencias

45. DIAN — RADIAN. Información sobre registro y trazabilidad de facturas electrónicas como títulos valor. https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/radian/
46. DIAN — Factoring. Información oficial sobre factoring y facturas electrónicas. https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/factoring/
47. DIAN — Marco normativo de RADIAN. Documentación normativa y técnica. https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/marco-normativo-radian/
48. Superintendencia Financiera — Innovación. Orientación sobre innovación financiera y actividades reguladas. https://www.superfinanciera.gov.co/preguntas-frecuentes/34/34-innovacion-sfc/
49. Superintendencia Financiera — InnovaSFC. Información sobre mecanismos de innovación y experimentación regulatoria. https://www.superfinanciera.gov.co/publicaciones/10103299/innovasfcelhub-10103299/
50. Superintendencia Financiera — Criptoactivos. Información sobre naturaleza y riesgos de activos digitales. https://www.superfinanciera.gov.co/publicaciones/10115324/que-son-los-activos-digitales-o-criptoactivos/
51. Finaktiva — Factoring. Referencia comercial para analizar la oferta existente de financiación empresarial. https://www.finaktiva.com/factoring/

**Nota de alcance:** este informe es una propuesta conceptual y de arquitectura de producto, no un concepto jurídico ni una recomendación de inversión. La normativa, las condiciones de acceso a RADIAN y los requisitos de autorización deben verificarse nuevamente antes de implementar un piloto comercial.

---

Proofly — Propuesta conceptual | Colombia | Octubre de 2026
