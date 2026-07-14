# Restaurant Hacienda

Plataforma operacional para restaurante con carta QR, gestión de mesas, pedidos,
cocina/KDS, administración, inventario, CRM, caja, auditoría y respaldos.

## Requisitos

- Node.js 20 o superior
- npm
- Proyecto Firebase configurado si se usará Firestore en producción

## Ejecutar Localmente

```bash
npm install
npm run dev
```

La app queda disponible en `http://localhost:3000`.

Por defecto, el frontend usa el backend Express para `/api/*`. Si necesitas
volver temporalmente al modo anterior de Firestore directo desde el navegador,
define `VITE_USE_FIRESTORE_DIRECT_API=true` en `.env.local`.
Ese fallback requiere reglas Firestore de desarrollo; las reglas de producción
de este repo bloquean el acceso directo desde clientes.

## Scripts

- `npm run dev`: inicia Express con Vite en modo desarrollo.
- `npm run build`: genera el frontend y empaqueta el servidor en `dist/server.mjs`.
- `npm run start`: ejecuta la versión compilada.
- `npm run lint`: valida TypeScript con `tsc --noEmit`.

## Persistencia Firestore Admin

Para que el backend use Firestore como servidor, crea `.env.local` con:

```bash
FIRESTORE_ADMIN_ENABLED=true
FIRESTORE_STATE_DOC_PATH=settings/restaurant_state
FIREBASE_SERVICE_ACCOUNT_PATH=/ruta/segura/service-account.json
```

No guardes el JSON de service account dentro del repositorio. Si esas variables
no existen, el servidor usa `data/restaurant_db.json` como fallback local.

## Flujos Principales

- Cliente QR: abrir la app con `?mesa=N` para mostrar la carta de una mesa.
- Personal: acceso por PIN para roles de mozo, cocina y administración.
- Administración: reportes, boletas, carta, CRM, inventario, QR, personal,
  auditoría y respaldos.

## Seguridad Antes de Producción

Antes de usar con datos reales:

1. Cambiar los PINs iniciales y no publicar credenciales en pantalla.
2. Reemplazar PIN plano por autenticación real o PIN hasheado con rate limiting.
3. Cerrar `firestore.rules`; el archivo actual debe endurecerse antes de
   desplegar datos reales.
4. Mover permisos sensibles al backend o a reglas Firestore, no solo a la UI.
5. Separar el documento único de estado en colecciones por dominio cuando el
   volumen de pedidos crezca.

## Notas Técnicas

La fuente de verdad recomendada para producción es el backend Express. El modo
Firestore directo desde navegador queda disponible solo como fallback/demo con:

```bash
VITE_USE_FIRESTORE_DIRECT_API=true
```

Mantener ese fallback activo en producción puede producir diferencias de
comportamiento y debilitar el control de permisos.
