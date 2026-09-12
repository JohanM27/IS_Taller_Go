# TallerGo

TallerGo es una plataforma web responsive para digitalizar la operación diaria de un taller mecánico. El sistema reemplaza registros en papel por una solución centralizada para clientes, vehículos, órdenes de trabajo, inventario, pagos y reportes.

## Objetivo

Desarrollar una primera versión funcional que permita registrar clientes y vehículos, crear órdenes de trabajo, controlar repuestos, cobrar trabajos y consultar información básica para la toma de decisiones.

## Alcance de la primera version

- Plataforma web responsive para computadora, tablet y celular.
- Roles separados para administrador y recepción/caja.
- Gestión de clientes, vehículos, órdenes de trabajo, inventario, pagos y reportes.
- Persistencia en PostgreSQL mediante Supabase.
- Autenticación con Supabase Auth.
- Reglas de acceso por rol mediante Row Level Security.

## Modulos principales

| Módulo | Descripción |
| --- | --- |
| Clientes y vehículos | Registro de clientes y del historial de vehículos asociados. |
| Órdenes de trabajo | Creación y consulta de trabajos, servicios y repuestos utilizados. |
| Inventario y repuestos | Control de existencias, precios y alertas de stock bajo. |
| Facturación y pagos | Registro de pagos, apertura/cierre de caja y cálculo del total de cada orden. |
| Reportes | Indicadores de ingresos, órdenes e inventario. |
| Autenticación y roles | Acceso diferenciado para administrador y recepción/caja. |

## Stack propuesto

- Frontend: React/Vite y CSS modular del proyecto.
- Backend: Supabase Auth, PostgREST y Row Level Security.
- Base de datos: PostgreSQL alojado en Supabase.
- Control de versiones: Git y GitHub.

## Estructura del repositorio

```text
.
├── docs/
│   ├── arquitectura.md
│   ├── limpiar-base-datos.sql
│   ├── modelo-caja-turnos.sql
│   ├── modelo-datos.sql
│   ├── permisos-supabase.sql
│   ├── requerimientos.md
│   ├── roadmap.md
│   └── supabase-guia.md
├── src/
│   ├── main.jsx
│   └── styles.css
├── index.html
├── package.json
└── README.md
```

## Avance actual

- Definición profesional del alcance del sistema.
- Requerimientos funcionales y no funcionales iniciales.
- Arquitectura de referencia en tres capas.
- Modelo de datos inicial para PostgreSQL/Supabase.
- Script para limpiar datos operativos sin eliminar usuarios ni perfiles.
- Guía paso a paso para crear la base de datos en Supabase.
- Aplicación web navegable en React/Vite conectada a Supabase.

## Cómo ejecutar el proyecto

Instala las dependencias:

```powershell
npm install
```

Ejecuta el servidor de desarrollo:

```powershell
npm run dev
```

Abre la URL que muestra la terminal. Por defecto:

```text
http://127.0.0.1:5173
```

## Cómo conectar Supabase

Copia el archivo de ejemplo:

```powershell
Copy-Item .env.example .env
```

Luego edita `.env` con los datos de tu proyecto:

```text
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_llave_publica_anon
```

Reinicia el servidor con `npm run dev`. Como la base usa RLS, primero verás una pantalla de login. Ingresa con el usuario que creaste en Supabase y que registraste en la tabla `perfiles`.

El dashboard cargará datos reales desde `resumen_ordenes`, `clientes` y `repuestos_stock_bajo`.
