# Recuperacion de Contrasena en Produccion

## Estado Actual

El flujo actual de recuperacion de contrasena funciona en local, pero es fragil en nube por tres razones principales:

1. Los codigos se guardan en memoria con `Map`, por lo que se pierden si el servidor se reinicia o cambia de instancia.
2. El envio de correos depende de `Gmail SMTP`, que suele fallar en produccion por bloqueos, credenciales o politicas del proveedor.
3. El flujo actual no permite que el usuario defina una nueva contrasena; en su lugar, genera una contrasena temporal y la envia por correo.

## Donde Esta El Problema

- `backend/routes/passwordRecoveryRoutes.js`
  - Usa `recoveryCodes = new Map()`
  - Genera y valida el codigo en memoria
  - Envia una nueva contrasena por correo tras verificar el codigo

- `render.yaml`
  - Ya contempla `EMAIL_USER` y `EMAIL_PASS`, pero eso no garantiza que Gmail funcione de forma estable en produccion

## Por Que Funciona En Local Y Falla En La Nube

### En local

- El proceso vive mas tiempo sin reiniciarse
- El `Map` no se pierde con tanta facilidad
- Gmail puede aceptar mejor el envio desde tu equipo

### En nube

- La instancia puede dormirse, reiniciarse o ser reemplazada
- Al reiniciarse, el `Map` queda vacio y el codigo deja de existir
- Gmail puede bloquear o limitar el SMTP desde servidores cloud

## Lo Que Docker Si Hace

Docker ayuda a:

- empaquetar el backend y sus dependencias
- estandarizar el entorno
- evitar diferencias entre local y servidor

Docker no soluciona por si solo:

- la perdida de codigos en memoria
- la inestabilidad de Gmail SMTP
- el diseno inseguro del flujo actual

## Opciones Viables

## Opcion 1: Parche Minimo

Mantener el flujo actual, pero reemplazar el almacenamiento en memoria por MySQL.

### Cambios

- crear una tabla para codigos de recuperacion
- guardar codigo, correo, expiracion y estado de uso
- validar el codigo contra base de datos
- seguir usando Gmail

### Ventajas

- cambio rapido
- poco impacto en frontend

### Desventajas

- Gmail sigue siendo fragil en produccion
- el flujo sigue enviando una contrasena por correo, lo cual no es lo ideal

## Opcion 2: Solucion Recomendada

Redisenar el flujo para produccion real.

### Flujo recomendado

1. El usuario ingresa su correo
2. El sistema genera un codigo o token con expiracion y lo guarda en MySQL
3. El usuario recibe el codigo por correo
4. El usuario ingresa:
   - correo
   - codigo
   - nueva contrasena
   - confirmar contrasena
5. El sistema valida el codigo y actualiza la contrasena
6. El codigo queda marcado como usado o se elimina

### Ventajas

- funciona bien en produccion
- no depende de memoria del proceso
- es mas seguro y profesional
- permite una mejor experiencia de usuario

### Desventajas

- requiere refactor del backend y del modal de recuperacion

## Opcion 3: Gmail Bien Configurado

Si se quiere seguir con Gmail, se necesita:

- cuenta con autenticacion en dos pasos
- `App Password`, no contrasena normal
- revisar que `EMAIL_USER` y `EMAIL_PASS` esten definidos realmente en el panel del proveedor cloud

### Riesgo

Aunque quede funcionando, Gmail no es la mejor opcion para un ecommerce en produccion.

## Opcion 4: Proveedor Transaccional

La mejor opcion para produccion es usar un servicio de correo transaccional:

- Resend
- Brevo
- SendGrid
- Postmark

### Ventajas

- mayor entregabilidad
- mejor estabilidad
- menos bloqueos que Gmail
- enfoque pensado para aplicaciones

## Recomendacion Final

La opcion recomendada es:

1. mover los codigos a MySQL
2. dejar de enviar contrasenas nuevas por correo
3. usar flujo de `codigo + nueva contrasena + confirmar contrasena`
4. migrar de Gmail a un proveedor transaccional

## Estructura Recomendada

### Nueva tabla sugerida

`password_reset_codes`

Campos sugeridos:

- `id`
- `email`
- `code_hash`
- `expires_at`
- `used`
- `created_at`

### Endpoints sugeridos

- `POST /api/recovery/request-code`
- `POST /api/recovery/verify-code`
- `POST /api/recovery/reset-password`

### Frontend sugerido

Paso 1:

- ingresar correo

Paso 2:

- ingresar codigo

Paso 3:

- nueva contrasena
- confirmar contrasena

## Que No Se Recomienda

- guardar codigos en memoria
- enviar contrasenas nuevas por correo
- depender de Gmail como solucion final enterprise
- pensar que Docker por si solo resuelve el problema

## Siguiente Implementacion Recomendada

Si se va a corregir este modulo, el siguiente orden ideal es:

1. crear tabla de recuperacion en MySQL
2. refactorizar `passwordRecoveryRoutes.js`
3. actualizar el modal del frontend para nueva contrasena y confirmacion
4. probar en local
5. desplegar en nube con proveedor de correo estable

## Conclusion

El fallo actual en nube no depende principalmente de compilacion ni de Docker.

El problema real es una combinacion de:

- estado temporal guardado en memoria
- dependencia fragil de Gmail SMTP
- flujo de recuperacion poco apropiado para produccion

La solucion correcta es redisenar el modulo para persistencia real y correo transaccional.
