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

## Scripts

- `npm run dev`: inicia Express con Vite en modo desarrollo.
- `npm run build`: genera el frontend y empaqueta el servidor en `dist/server.mjs`.
- `npm run start`: ejecuta la versión compilada.
- `npm run lint`: valida TypeScript con `tsc --noEmit`.

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

Actualmente existe lógica de API tanto en el cliente Firestore como en el
servidor Express. Para producción conviene elegir una fuente de verdad:

- Backend Express/API como autoridad principal, o
- Firestore directo con reglas estrictas y estructura por colecciones.

Mantener ambas rutas duplicadas puede producir diferencias de comportamiento
entre desarrollo y producción.
