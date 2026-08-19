# Arquitectura del Sistema

## Vision general

TallerGo se plantea como una aplicacion web responsive con una arquitectura de tres capas: presentacion, servicios y datos. La primera version puede construirse con React en el frontend y Supabase como backend administrado.

```mermaid
flowchart LR
    U["Usuario: administrador o recepcion"] --> FE["Frontend web responsive"]
    FE --> AUTH["Supabase Auth"]
    FE --> API["PostgREST API"]
    API --> RLS["Row Level Security"]
    RLS --> DB["PostgreSQL"]
```

## Capas

| Capa | Responsabilidad | Tecnologia propuesta |
| --- | --- | --- |
| Presentacion | Pantallas, formularios, navegacion y validaciones iniciales. | React + TailwindCSS |
| Servicios | Autenticacion, API REST automatica y reglas de acceso. | Supabase Auth + PostgREST + RLS |
| Datos | Persistencia transaccional y relaciones del dominio. | PostgreSQL |

## Flujo principal de una orden

```mermaid
sequenceDiagram
    actor Recepcion
    participant App as TallerGo Web
    participant Auth as Supabase Auth
    participant DB as PostgreSQL

    Recepcion->>App: Inicia sesion
    App->>Auth: Valida credenciales
    Auth-->>App: Sesion autorizada
    Recepcion->>App: Busca cliente y vehiculo
    App->>DB: Consulta datos relacionados
    DB-->>App: Cliente, vehiculo e historial
    Recepcion->>App: Crea orden de trabajo
    App->>DB: Inserta orden y detalle inicial
    DB-->>App: Orden creada
    App-->>Recepcion: Muestra codigo y estado pendiente
```

## Estados de una orden

```mermaid
stateDiagram-v2
    [*] --> pendiente
    pendiente --> en_proceso
    en_proceso --> finalizada
    finalizada --> facturada
    facturada --> entregada
    entregada --> [*]
```

## Seguridad

- Cada usuario debe iniciar sesion antes de acceder al sistema.
- El rol del usuario define las operaciones disponibles.
- Las politicas RLS deben evitar que un usuario lea o modifique informacion no autorizada.
- Las operaciones sensibles, como eliminar registros o modificar pagos, deben reservarse al administrador.

## Decisiones tecnicas iniciales

- Usar identificadores UUID para las tablas principales.
- Registrar fechas de creacion y actualizacion para auditoria basica.
- Evitar eliminaciones fisicas en entidades principales; preferir campo `activo`.
- Separar detalle de servicios y detalle de repuestos para calcular totales con claridad.
