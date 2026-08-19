# TallerGo

TallerGo es una plataforma web responsive para digitalizar la operacion diaria de un taller mecanico. El sistema reemplaza registros en papel por una solucion centralizada para clientes, vehiculos, ordenes de trabajo, inventario, pagos y reportes.

## Objetivo

Desarrollar una primera version funcional que permita al personal administrativo registrar clientes y vehiculos, crear ordenes de trabajo, dar seguimiento al estado del servicio, controlar repuestos y consultar informacion basica para la toma de decisiones.

## Alcance de la primera version

- Plataforma web responsive para computadora, tablet y celular.
- Roles separados para administrador y recepcion.
- Gestion de clientes, vehiculos, ordenes de trabajo, inventario, pagos y reportes.
- Persistencia en PostgreSQL mediante Supabase.
- Autenticacion con Supabase Auth.
- Reglas de acceso por rol mediante Row Level Security.

## Modulos principales

| Modulo | Descripcion |
| --- | --- |
| Clientes y vehiculos | Registro de clientes y del historial de vehiculos asociados. |
| Ordenes de trabajo | Creacion, seguimiento y cambio de estado de cada servicio. |
| Inventario y repuestos | Control de existencias, precios y alertas de stock bajo. |
| Facturacion y pagos | Registro de pagos y calculo del total de cada orden. |
| Reportes | Indicadores de ingresos, ordenes por estado e inventario. |
| Autenticacion y roles | Acceso diferenciado para administrador y recepcion. |

## Stack propuesto

- Frontend: React, TailwindCSS, JavaScript o TypeScript.
- Backend: Supabase Auth, PostgREST y Row Level Security.
- Base de datos: PostgreSQL alojado en Supabase.
- Control de versiones: Git y GitHub.

## Estructura del repositorio

```text
.
├── docs/
│   ├── arquitectura.md
│   ├── modelo-datos.sql
│   ├── requerimientos.md
│   └── roadmap.md
├── src/
│   ├── main.jsx
│   └── styles.css
├── index.html
├── package.json
└── README.md
```

## Avance actual

- Definicion profesional del alcance del sistema.
- Requerimientos funcionales y no funcionales iniciales.
- Arquitectura de referencia en tres capas.
- Modelo de datos inicial para PostgreSQL.
- Prototipo web navegable en React/Vite para presentar el concepto.

## Como ejecutar el proyecto

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
