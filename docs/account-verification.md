# Cuenta y ajustes: primera entrega

Fecha: 13-11-2026. Rama `feature/cuenta-google-ajustes`, desde `a661082` de `v2`.

## Validación local

- `npm test`: **61 archivos, 356 pruebas pasan**, 86,08 s en la ejecución final.
- `npm run lint`: **0 errores**, una advertencia previa en `src/components/Lobby.jsx:38` por `setParticipants`.
- `npm run build`: **correcto**, 189 módulos transformados. Sin dependencias nuevas.
- Revisión independiente del acceso y la interfaz: carreras de cancelación reproducidas con pruebas y corregidas; sin hallazgos relevantes pendientes en la última revisión.
- SDK real con `fetch` simulado: cancelar durante la validación interna de `setSession` conserva el invitado y no emite `SIGNED_IN`; activar correctamente permite leer la cuenta Google. Sin peticiones a Supabase remoto.
- API: invitados con participaciones bloqueados, comprobación al retorno, cambio en otra pestaña, storage bloqueado, expiración, cancelación durante PKCE/intercambio/validación/escritura, limpieza tardía y cierre solo local.
- Interfaz: avatar y ruta Cuenta, edición del nombre, correo no editable, acceso antes de guardar nombre, errores recuperables, callback fuera de los guards y desmontaje compatible con StrictMode.

En navegador integrado, con configuración ficticia y galería local: tarjeta de
cuenta a **320 y 360 px**, sin desbordamiento horizontal; editar y guardar el
nombre actualiza saludo/tarjeta y devuelve el foco al botón. El error del callback
se comprobó a 320 px, con botones de 44 px y opciones Reintentar/Volver. Las
capturas están en el directorio de visualizaciones de esta sesión: `cuenta-320.jpg`
y `cuenta-360.jpg`. La galería no inicia Google ni escribe perfiles remotos.

No se cambiaron migraciones ni se ejecutaron pruebas de base de datos o
operaciones contra producción. No hubo push, integración a `v2` ni despliegue.

## Comprobación Google real pendiente

Las pruebas simuladas no certifican la configuración del proveedor OAuth. Antes
de probar el despliegue, la persona dueña añade la URL exacta del frontend
`https://pasanaku-app.vercel.app/auth/google` en **Supabase → Authentication →
URL Configuration → Redirect URLs**, además del origen de desarrollo o preview
que vaya a usar. El callback Google Cloud sigue siendo el de Supabase.

Después de integrar/desplegar con autorización:

1. En otro navegador o celular sin sesión, elegir «Ya tengo cuenta: entrar con Google» antes de guardar un nombre. Verificar el nombre previo y las salas de la cuenta existente.
2. Cancelar Google y comprobar que se conserva el invitado. Un invitado con cualquier participación debe tener bloqueado el acceso existente, conservando la opción de vincular Google que aún no esté usado en Pasanaku.
3. Vincular una cuenta nueva y comprobar que se mantienen nombre y salas del invitado.
4. Cerrar sesión en un dispositivo: aparece el primer uso invitado y los otros dispositivos Google siguen conectados. Volver a entrar recupera los datos Google.

No se incluyen fusión de cuentas, traslado de anfitrión, borrado de usuarios,
preferencias de tema ni otras opciones de ajustes.
