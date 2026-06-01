# Continuidad Brevo SMTP En Render

## Estado Actual

Se migro el backend de `Resend` a `Brevo SMTP` y los cambios ya quedaron subidos a `main`.

- commit actual: `d0ec868eed3631512c5efba59141e4e81e10fb9d`
- provider de correo actual: `Brevo SMTP`
- base de datos cloud: `Clever Cloud MySQL`
- hosting actual: `Render`

## Archivos Ya Actualizados

- `backend/services/emailService.js`
- `backend/routes/passwordRecoveryRoutes.js`
- `backend/routes/contactRoutes.js`
- `backend/package.json`
- `backend/package-lock.json`
- `render.yaml`
- `PASSWORD_RECOVERY_PRODUCTION.md`

## Cambios Ya Hechos

### 1. Servicio de correo

`backend/services/emailService.js` ya no usa `Resend`.

Ahora usa `nodemailer` con estas variables:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

Comportamiento actual:

- si `SMTP_PORT=587`, usa `secure: false`
- si `SMTP_PORT=465`, usa `secure: true`
- tambien soporta `SMTP_SECURE=true` si se quiere forzar
- ahora tambien corta mas rapido con:
  - `SMTP_CONNECTION_TIMEOUT_MS`
  - `SMTP_GREETING_TIMEOUT_MS`
  - `SMTP_SOCKET_TIMEOUT_MS`

### 2. Recuperacion de contrasena

`backend/routes/passwordRecoveryRoutes.js` ya no crea ticket manual como flujo principal.

Ahora hace esto:

1. busca el usuario por correo
2. genera codigo de 6 digitos
3. guarda solo el hash en MySQL
4. intenta enviar el correo via `Brevo SMTP`
5. si el envio falla, elimina el codigo generado

### 3. Render

`render.yaml` ya fue cambiado para `SMTP_*` y ya no usa `RESEND_*` como configuracion activa del proyecto.

## Errores Que Ya Aparecieron

### Error 1

En un primer intento aparecio:

```text
ECONNREFUSED ::1:3306
```

Diagnostico:

- el backend estaba intentando conectar a MySQL local
- eso significa que `DB_*` no estaban llegando bien o estaban vacias en Render

### Error 2

Despues aparecio:

```text
SMTP_FROM no esta configurado
```

Diagnostico:

- faltaba la variable `SMTP_FROM` en Render

### Error 3

Despues aparecio:

```text
Connection timeout
code: ETIMEDOUT
command: CONN
```

Diagnostico actual:

- el backend ya intenta conectar a `Brevo SMTP`
- el problema ya no parece ser de base de datos
- el problema tampoco parece ser de variable faltante
- el fallo apunta a conectividad SMTP, puerto o handshake

## Variables Que Se Vieron En Render

En la revision visual reciente se vio que ya existen:

- `SMTP_FROM`
- `SMTP_HOST=smtp-relay.brevo.com`
- `SMTP_PASS`
- `SMTP_PORT=587`
- `SMTP_USER`

Tambien seguian apareciendo:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

Nota:

- esas variables `RESEND_*` ya no son usadas por el codigo nuevo
- no son la causa del error actual, pero conviene eliminarlas para evitar confusion

## Riesgo De Seguridad Detectado

La clave `SMTP_PASS` quedo visible en una captura durante la configuracion.

Accion recomendada obligatoria:

1. entrar a `Brevo`
2. regenerar o rotar la clave `SMTP`
3. actualizar `SMTP_PASS` en `Render`
4. guardar cambios
5. hacer `redeploy`

No conviene seguir usando una clave SMTP que ya quedo expuesta visualmente.

## Configuracion Esperada En Render

Backend:

```env
DB_HOST=...
DB_PORT=...
DB_USER=...
DB_PASS=...
DB_NAME=...
SESSION_SECRET=...
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=
SMTP_USER=TU_LOGIN_SMTP_DE_BREVO
SMTP_PASS=TU_CLAVE_SMTP_DE_BREVO_ROTADA
SMTP_FROM=Luxury Jewelry <TU_CORREO_VERIFICADO_EN_BREVO>
SMTP_CONNECTION_TIMEOUT_MS=10000
SMTP_GREETING_TIMEOUT_MS=10000
SMTP_SOCKET_TIMEOUT_MS=15000
ADMIN_CONTACT_EMAIL=TU_CORREO
FRONTEND_URL=https://luxury-jewelry-frontend.onrender.com
RECOVERY_CODE_TTL_MINUTES=10
```

## Secuencia Exacta Para Retomar

Cuando se continue desde otro dispositivo, seguir en este orden:

1. abrir este repositorio en la rama `main`
2. confirmar que el ultimo commit disponible sea `d0ec868`
3. entrar a `Brevo` y rotar la clave `SMTP`
4. entrar a `Render` y reemplazar `SMTP_PASS`
5. borrar `RESEND_API_KEY` y `RESEND_FROM_EMAIL` de `Environment`
6. revisar que `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME` sigan correctas
7. hacer `redeploy` del backend
8. probar recuperacion de contrasena

## Si Sigue Fallando Por Timeout

Probar estas variantes una por una en Render:

### Opcion A

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
```

### Opcion B

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=2525
```

### Opcion C

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=465
SMTP_SECURE=true
```

Despues de cada cambio:

1. guardar variables
2. hacer `redeploy`
3. probar `POST /api/recovery/request-code`
4. revisar logs de Render

## Causa De Que La Pagina Se Quede Cargando

La pagina se queda cargando porque el frontend espera la respuesta de:

- `POST /api/recovery/request-code`

Y el backend se queda intentando abrir la conexion SMTP hasta que vence el tiempo de espera.

Por eso el usuario ve carga larga y luego:

```text
No fue posible enviar el codigo de recuperacion
```

## Ajustes Pendientes Recomendados

Todavia seria bueno hacer estos cambios despues:

1. opcionalmente probar conexion SMTP con `transporter.verify()`
2. ajustar el puerto en Render entre `587`, `2525` y `465` segun el resultado real
3. eliminar `RESEND_API_KEY` y `RESEND_FROM_EMAIL` por limpieza si siguen visibles

## Mensaje Corto Para Retomar Rapido

Resumen operativo:

- el codigo ya esta migrado a `Brevo SMTP`
- el problema actual no es `Resend`
- el problema actual mas probable es `SMTP timeout`
- la clave `SMTP_PASS` debe rotarse
- despues hay que probar `587`, luego `2525`, y si hace falta `465` con `SMTP_SECURE=true`
