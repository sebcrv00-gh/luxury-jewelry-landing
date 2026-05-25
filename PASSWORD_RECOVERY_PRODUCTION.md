# Plan De Recuperacion De Contrasena Sin SMTP

## Objetivo

Definir una estrategia de recuperacion de contrasena que funcione en `Render` sin usar credenciales de `SMTP`, sin dominio propio y priorizando opciones gratuitas.

Importante:

- Este documento describe un plan.
- No aplica cambios al codigo.
- La meta es elegir una ruta viable antes de implementar.

## Contexto Del Problema

Hoy no se quieren usar credenciales de `SMTP` porque no existen credenciales disponibles para eso.

Ademas, se busca una solucion que:

- funcione en nube
- no dependa de un dominio propio
- sea gratis o lo mas cercana posible a costo cero
- no obligue a montar `Docker`

## Conclusion Tecnica Principal

Si se quiere recuperacion de contrasena por correo en produccion, no hace falta `SMTP`, pero si hace falta algun servicio externo que envie emails.

Eso significa:

- no es obligatorio usar `Gmail SMTP`
- si es obligatorio usar algun proveedor de envio por `API HTTP` o servicio similar

La mejor estrategia es:

1. mantener `Render` como backend
2. mantener la base de datos para guardar codigos o tokens
3. reemplazar el envio `SMTP` por una `Email API`

## Opcion Recomendada

### Render + Base De Datos + Email API Gratuita

La ruta recomendada es:

- `frontend`: formulario "Olvide mi contrasena"
- `backend en Render`: genera el codigo o token
- `base de datos`: guarda el hash del codigo, expiracion, estado e intentos
- `proveedor de email`: envia el correo por `API`, no por `SMTP`

Ventajas:

- evita dependencias de `SMTP`
- funciona mejor en nube
- no requiere `Docker`
- no obliga a cambiar toda la arquitectura del proyecto

## Que Tipo De Recuperacion Conviene

Hay dos formas validas:

### Opcion A: Codigo De 6 Digitos

Flujo:

1. el usuario escribe su correo
2. el backend genera un codigo de 6 digitos
3. se guarda solo el `hash` del codigo
4. el sistema envia el codigo por email
5. el usuario valida el codigo
6. el usuario define la nueva contrasena

Ventajas:

- facil de entender para el usuario
- encaja bien con el flujo actual del proyecto
- facil de conectar al modal actual

### Opcion B: Enlace De Recuperacion

Flujo:

1. el usuario escribe su correo
2. el backend genera un token seguro
3. el sistema envia un enlace temporal
4. el usuario abre el enlace
5. el usuario escribe la nueva contrasena

Ventajas:

- experiencia mas moderna
- menos pasos visuales

Desventaja:

- requiere manejar mejor URLs publicas y validacion de token

## Recomendacion De Flujo

Para este proyecto conviene mas el flujo por `codigo`, porque:

- ya se adapta bien al modal actual
- evita depender tanto de enlaces externos
- es mas simple de controlar
- facilita una migracion sin rehacer toda la interfaz

## Requisitos Minimos Del Sistema

La recuperacion deberia incluir:

- codigo o token temporal
- expiracion corta, por ejemplo `10` a `15` minutos
- invalidacion de codigos anteriores al generar uno nuevo
- limite de intentos por correo
- limite de solicitudes por IP o por usuario
- contrasena nueva solo despues de verificacion exitosa
- invalidacion despues de uso

## Seguridad Minima Recomendada

Nunca se debe guardar el codigo plano en base de datos.

Se recomienda:

- guardar solo `hash` del codigo
- registrar `expires_at`
- registrar `used_at`
- limpiar codigos vencidos
- limitar solicitudes repetidas
- devolver respuestas genericas para no revelar si el email existe o no

Ejemplo de respuesta segura:

- "Si el correo existe en el sistema, te enviaremos instrucciones de recuperacion."

## Variables De Entorno Esperadas

Si se usa un proveedor por API, el backend deberia trabajar con variables como estas:

- `EMAIL_API_KEY`
- `EMAIL_FROM`
- `APP_URL`
- `RECOVERY_CODE_TTL_MINUTES`

Segun el proveedor elegido, el nombre exacto puede cambiar.

## Escenarios Posibles

### Escenario 1: Un Proveedor Gratis Permite Remitente Sin Dominio

Este es el mejor caso.

Plan:

- verificar un remitente basico
- usar su `API key`
- enviar codigos desde `Render`
- mantener el flujo completo por email

Resultado:

- recuperacion real por correo
- sin `SMTP`
- sin dominio propio
- con costo `0` mientras alcance el plan gratis

### Escenario 2: El Proveedor Gratis Permite Solo Pruebas O Emails Limitados

En este caso el sistema sirve para desarrollo o pruebas controladas, pero no para todos los clientes.

Plan:

- usar el proveedor solo para testing
- dejar lista la integracion
- mas adelante cambiar a un proveedor que permita envio publico

Resultado:

- la arquitectura queda correcta
- pero el alcance de correos queda limitado

### Escenario 3: Ningun Proveedor Gratis Permite Envio Real Sin Dominio

Si pasa esto, no existe una solucion seria de recuperacion por correo completamente independiente de terceros.

En ese caso hay dos salidas:

- aceptar un proveedor con restricciones gratuitas
- o cambiar el concepto de recuperacion por una via manual o administrativa

## Alternativas Gratuitas Si No Se Puede Enviar Email Publico

Si definitivamente no se puede usar correo real gratis sin dominio, las alternativas son estas:

### Alternativa 1: Recuperacion Manual Por Soporte

Flujo:

- el usuario solicita ayuda
- el admin verifica identidad
- el admin fuerza reinicio o genera codigo manual

Ventaja:

- costo cero

Desventaja:

- no es automatica
- no escala bien

### Alternativa 2: Codigo Mostrado Solo En Entorno De Pruebas

Flujo:

- el sistema genera el codigo
- lo muestra solo en logs o panel interno

Ventaja:

- gratis
- util para testing

Desventaja:

- no sirve para produccion real

### Alternativa 3: Recuperacion Solo Para Usuarios Ya Autenticados

Flujo:

- desde perfil, el usuario autenticado cambia su contrasena

Ventaja:

- gratis
- no requiere email

Desventaja:

- no resuelve un verdadero "olvide mi contrasena"

## Lo Que No Hace Falta

Para esta solucion no hace falta:

- `SMTP`
- `Docker`
- rehacer toda la app
- dominio propio, si el proveedor elegido no lo exige

## Plan De Implementacion Futuro

Cuando se decida aplicar este plan, el orden recomendado seria:

1. elegir proveedor de email por `API`
2. confirmar si permite uso sin dominio
3. definir si se usara `codigo` o `link`
4. dejar la tabla de recuperacion en MySQL
5. integrar el envio desde `Render`
6. validar expiracion, reintentos y bloqueo por abuso
7. probar el flujo completo en nube

## Recomendacion Final

La mejor decision para este proyecto es:

- usar `Render`
- usar base de datos para codigos
- usar una `Email API` gratuita en lugar de `SMTP`
- mantener recuperacion por `codigo`

Si el proveedor gratuito deja enviar sin dominio, esa es la ruta ideal.

Si no lo permite, el sistema todavia puede mantenerse listo y luego cambiar solo el proveedor, sin rehacer el flujo completo.
