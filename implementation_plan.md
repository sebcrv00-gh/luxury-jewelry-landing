# Plan de Implementación: Recuperación de Contraseña

Este plan detalla los pasos para implementar un sistema seguro de recuperación de contraseña mediante un código de verificación de 6 dígitos enviado por correo electrónico.

## Revisión del Usuario Requerida

> [!IMPORTANT]
> - **Servicio de Correo**: Utilizaremos `nodemailer`. Necesitarás proporcionar credenciales SMTP (ej. Contraseña de Aplicación de Gmail o Mailtrap) en el archivo [.env](file:///c:/laragon/www/LUXURY%20JEWELRY/backend/.env) para las pruebas.
> - **Flujo de Recuperación**: El usuario ingresa su correo, recibe un código de 6 dígitos, ingresa el código junto con su nueva contraseña. Es más sencillo y amigable que un enlace de recuperación.

## Cambios Propuestos

### Backend (`luxury-jewelry-api`)

#### [MODIFICAR] [db.js](file:///c:/laragon/www/LUXURY%20JEWELRY/backend/config/db.js)
- Actualizar [initDB](file:///c:/laragon/www/LUXURY%20JEWELRY/backend/config/db.js#14-135) para agregar las columnas `reset_codigo` y `reset_expira` a la tabla `usuarios`.

#### [NUEVO] [mailConfig.js](file:///c:/laragon/www/LUXURY%20JEWELRY/backend/config/mailConfig.js)
- Configurar el transportador de `nodemailer` usando variables de entorno.

#### [MODIFICAR] [authController.js](file:///c:/laragon/www/LUXURY%20JEWELRY/backend/controllers/authController.js)
- Implementar `forgotPassword`: Generar código de 6 dígitos, guardar en DB, enviar correo.
- Implementar `resetPassword`: Verificar código, comprobar expiración, hashear nueva contraseña, actualizar DB.

#### [MODIFICAR] [authRoutes.js](file:///c:/laragon/www/LUXURY%20JEWELRY/backend/routes/authRoutes.js)
- Agregar rutas para `/forgot-password` y `/reset-password`.

### Frontend (`frontend-temp`)

#### [MODIFICAR] [Login.jsx](file:///c:/laragon/www/LUXURY%20JEWELRY/frontend/src/pages/Login.jsx)
- Agregar enlace "¿Olvidaste tu contraseña?" debajo del campo de contraseña.

#### [NUEVO] [ForgotPassword.jsx](file:///c:/laragon/www/LUXURY%20JEWELRY/frontend/src/pages/ForgotPassword.jsx)
- Formulario de varios pasos:
  1. Ingreso de Email.
  2. Verificación de Código.
  3. Ingreso de Nueva Contraseña.

## Plan de Verificación

### Pruebas Automatizadas
- Script para simular la solicitud y verificar la entrada del código.

### Verificación Manual
1. Solicitar código para un correo existente.
2. Verificar recepción del correo (usando una cuenta de prueba).
3. Ingresar códigos correctos/incorrectos para verificar validación.
4. Actualizar contraseña e intentar iniciar sesión con la nueva.
