# Guia Brevo SMTP Con Render Y Clever Cloud

## Objetivo

Dejar documentado el paso a paso para configurar un envio de correos mas serio usando:

- `Render` para la aplicacion
- `Clever Cloud` para MySQL
- `Brevo` como proveedor `SMTP`

Esta guia no aplica cambios al codigo por si sola. Sirve para configurar el entorno y dejar listo el proyecto para recuperacion de contrasena, contacto y notificaciones por email.

## Arquitectura Final

La arquitectura queda asi:

- `Render`: ejecuta backend y frontend
- `Clever Cloud`: guarda usuarios, pedidos, codigos de recuperacion y demas datos
- `Brevo`: envia correos transaccionales por `SMTP`

Importante:

- `Render` no entrega credenciales `SMTP`
- `Clever Cloud` no entrega correo
- las credenciales `SMTP` salen de `Brevo`

## Antes De Empezar

Necesitas tener listo esto:

- cuenta activa en `Brevo`
- acceso a `Render`
- acceso a `Clever Cloud`
- acceso al correo que vas a usar como remitente

Si no tienes dominio propio, puedes empezar verificando un correo puntual como remitente.

## Paso 1. Entrar A Brevo

1. inicia sesion en `Brevo`
2. en el menu izquierdo busca `Transactional`
3. entra a esa seccion

Todo lo relacionado con `SMTP`, remitentes y envio transaccional se configura ahi.

## Paso 2. Crear El Remitente

Dentro de `Transactional`, busca algo como:

- `Settings`
- `Senders`
- `Senders & Domains`
- `Senders, domains & dedicated IP`

Luego:

1. entra a `Senders`
2. haz clic en `Add a sender` o `Create sender`

Llena los campos asi:

- `Sender name`: `Luxury Jewelry`
- `Sender email`: tu correo real
- `Reply-to email`: el mismo correo, por ahora

Ejemplo:

- `Sender name`: `Luxury Jewelry`
- `Sender email`: `fcervera84@gmail.com`
- `Reply-to email`: `fcervera84@gmail.com`

Guarda el remitente.

## Paso 3. Verificar El Remitente

Brevo enviara un correo de verificacion al remitente que agregaste.

Haz esto:

1. abre tu bandeja de entrada
2. busca el correo de `Brevo`
3. haz clic en el enlace de verificacion
4. vuelve a `Brevo`
5. confirma que el remitente quede como `verified`

No sigas al paso `SMTP` hasta que el remitente quede verificado.

## Paso 4. Obtener Credenciales SMTP

Ahora vuelve a `Brevo` y entra a:

- `Transactional`
- `SMTP & API`
- pestaña `SMTP`

Ahi debes encontrar:

- `SMTP host`
- `SMTP port`
- `SMTP login`
- `SMTP key` o `SMTP password`

Valores esperados:

- `SMTP_HOST=smtp-relay.brevo.com`
- `SMTP_PORT=587`

Y ademas debes copiar los datos que Brevo te muestre:

- `SMTP_USER`
- `SMTP_PASS`

Importante:

- `SMTP_PASS` no es la contrasena normal de tu cuenta `Brevo`
- debes usar solamente la clave `SMTP` generada o mostrada en esa seccion

## Paso 5. Configurar Render

Entra a `Render` y abre el servicio del backend.

Luego:

1. entra a `Environment`
2. agrega las variables de entorno
3. guarda los cambios

Usa este formato:

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=TU_LOGIN_SMTP_DE_BREVO
SMTP_PASS=TU_CLAVE_SMTP_DE_BREVO
SMTP_FROM=Luxury Jewelry <TU_CORREO_VERIFICADO>
ADMIN_CONTACT_EMAIL=fcervera84@gmail.com
RECOVERY_CODE_TTL_MINUTES=15
```

Si tu backend necesita conocer la URL publica del frontend, agrega tambien:

```env
APP_URL=https://tu-frontend.onrender.com
```

## Paso 6. Que Va En Cada Variable

### SMTP_HOST

Usa:

```env
SMTP_HOST=smtp-relay.brevo.com
```

### SMTP_PORT

Usa:

```env
SMTP_PORT=587
```

### SMTP_USER

Pega el login `SMTP` que aparece en `Brevo`.

Ejemplo:

```env
SMTP_USER=8f2abc001@smtp-brevo.com
```

El valor exacto puede cambiar segun la cuenta.

### SMTP_PASS

Pega la clave `SMTP` generada por `Brevo`.

Ejemplo:

```env
SMTP_PASS=xxxxxxxxxxxxxxxx
```

### SMTP_FROM

Debe usar exactamente el correo remitente verificado en `Brevo`.

Ejemplo:

```env
SMTP_FROM=Luxury Jewelry <fcervera84@gmail.com>
```

### ADMIN_CONTACT_EMAIL

Es el correo donde quieres recibir mensajes administrativos o copias si el sistema lo usa.

Ejemplo:

```env
ADMIN_CONTACT_EMAIL=fcervera84@gmail.com
```

### RECOVERY_CODE_TTL_MINUTES

Controla la vigencia del codigo de recuperacion.

Ejemplo:

```env
RECOVERY_CODE_TTL_MINUTES=15
```

## Paso 7. Clever Cloud No Se Cambia

El uso de `Brevo` no modifica nada en la base de datos.

Tus variables de `Clever Cloud` se quedan igual:

```env
DB_HOST=...
DB_PORT=...
DB_USER=...
DB_PASS=...
DB_NAME=...
```

`Clever Cloud` sigue manejando:

- usuarios
- pedidos
- tickets
- codigos de recuperacion
- historial del sistema

`Brevo` solo envia correos.

## Paso 8. Flujo Completo Esperado

Con todo configurado, el flujo correcto deberia ser:

1. el usuario solicita recuperacion de contrasena
2. el backend en `Render` genera el codigo o token
3. el backend guarda el hash del codigo en MySQL de `Clever Cloud`
4. el backend envia el correo usando `Brevo SMTP`
5. el usuario recibe el email
6. el usuario valida el codigo y cambia la contrasena

## Paso 9. Ejemplo De Variables Finales En Render

Si el remitente verificado es `fcervera84@gmail.com`, podria quedar asi:

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=TU_LOGIN_SMTP_DE_BREVO
SMTP_PASS=TU_PASSWORD_SMTP_DE_BREVO
SMTP_FROM=Luxury Jewelry <fcervera84@gmail.com>
ADMIN_CONTACT_EMAIL=fcervera84@gmail.com
RECOVERY_CODE_TTL_MINUTES=15
APP_URL=https://tu-frontend.onrender.com
```

## Paso 10. Desplegar En Render

Despues de guardar las variables:

1. guarda la configuracion en `Render`
2. haz `redeploy` del servicio
3. espera a que el despliegue termine
4. prueba el flujo de correo

Pruebas recomendadas:

- recuperar contrasena
- formulario de contacto
- cualquier envio automatico que tenga el sistema

## Paso 11. Errores Comunes

### Error 1. Usar La Contrasena Normal De Brevo

Problema:

- se usa la contrasena de login de la cuenta `Brevo`

Solucion:

- usar solo la `SMTP key` o `SMTP password`

### Error 2. El Remitente No Esta Verificado

Problema:

- `SMTP_FROM` usa un correo que no esta aprobado en `Brevo`

Solucion:

- verificar el remitente antes de probar

### Error 3. SMTP_FROM No Coincide

Problema:

- el correo de `SMTP_FROM` no coincide con el remitente verificado

Solucion:

- usar exactamente el mismo correo aprobado

### Error 4. No Hacer Redeploy

Problema:

- las variables se guardan en `Render`, pero la app sigue corriendo con la configuracion vieja

Solucion:

- redeploy despues de guardar variables

### Error 5. Confundir Correo Con Base De Datos

Problema:

- si falla el correo, se piensa que el problema es de `Clever Cloud`

Solucion:

- recordar que `Brevo` y `Clever Cloud` cumplen funciones distintas

## Paso 12. Recomendacion Tecnica

Para este proyecto, la ruta mas seria y ordenada es:

- `Render` para ejecutar la aplicacion
- `Clever Cloud` para la persistencia MySQL
- `Brevo SMTP` para correos

Eso te deja una arquitectura clara:

- app en nube
- base de datos en nube
- correo transaccional serio

## Resumen Final

La configuracion correcta es esta:

1. crear o entrar a `Brevo`
2. ir a `Transactional`
3. crear remitente
4. verificar remitente
5. ir a `SMTP & API`
6. copiar `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
7. pegarlos en `Render`
8. no cambiar nada de `Clever Cloud`
9. hacer `redeploy`
10. probar recuperacion de contrasena y correos del sistema
