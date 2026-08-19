-- Modelo de datos inicial para TallerGo
-- PostgreSQL / Supabase

create extension if not exists "pgcrypto";

create table perfiles (
    id uuid primary key references auth.users(id),
    nombre text not null,
    rol text not null check (rol in ('administrador', 'recepcion')),
    activo boolean not null default true,
    creado_en timestamptz not null default now()
);

create table clientes (
    id uuid primary key default gen_random_uuid(),
    nombre text not null,
    telefono text not null,
    correo text,
    direccion text,
    activo boolean not null default true,
    creado_en timestamptz not null default now(),
    actualizado_en timestamptz not null default now(),
    constraint clientes_telefono_unique unique (telefono)
);

create table vehiculos (
    id uuid primary key default gen_random_uuid(),
    cliente_id uuid not null references clientes(id),
    placa text not null unique,
    marca text not null,
    modelo text not null,
    anio integer,
    color text,
    activo boolean not null default true,
    creado_en timestamptz not null default now()
);

create table ordenes_trabajo (
    id uuid primary key default gen_random_uuid(),
    codigo text not null unique,
    cliente_id uuid not null references clientes(id),
    vehiculo_id uuid not null references vehiculos(id),
    estado text not null default 'pendiente'
        check (estado in ('pendiente', 'en_proceso', 'finalizada', 'facturada', 'entregada')),
    descripcion_problema text not null,
    observaciones text,
    fecha_ingreso timestamptz not null default now(),
    fecha_entrega timestamptz,
    creado_por uuid references perfiles(id),
    creado_en timestamptz not null default now(),
    actualizado_en timestamptz not null default now()
);

create table servicios (
    id uuid primary key default gen_random_uuid(),
    nombre text not null,
    descripcion text,
    precio numeric(10,2) not null check (precio >= 0),
    activo boolean not null default true
);

create table detalle_servicios (
    id uuid primary key default gen_random_uuid(),
    orden_id uuid not null references ordenes_trabajo(id) on delete cascade,
    servicio_id uuid references servicios(id),
    descripcion text not null,
    cantidad integer not null default 1 check (cantidad > 0),
    precio_unitario numeric(10,2) not null check (precio_unitario >= 0)
);

create table repuestos (
    id uuid primary key default gen_random_uuid(),
    codigo text not null unique,
    nombre text not null,
    costo numeric(10,2) not null default 0 check (costo >= 0),
    precio_venta numeric(10,2) not null check (precio_venta >= 0),
    stock integer not null default 0 check (stock >= 0),
    stock_minimo integer not null default 1 check (stock_minimo >= 0),
    activo boolean not null default true
);

create table detalle_repuestos (
    id uuid primary key default gen_random_uuid(),
    orden_id uuid not null references ordenes_trabajo(id) on delete cascade,
    repuesto_id uuid not null references repuestos(id),
    cantidad integer not null check (cantidad > 0),
    precio_unitario numeric(10,2) not null check (precio_unitario >= 0)
);

create table pagos (
    id uuid primary key default gen_random_uuid(),
    orden_id uuid not null references ordenes_trabajo(id),
    monto numeric(10,2) not null check (monto > 0),
    metodo text not null check (metodo in ('efectivo', 'tarjeta', 'transferencia', 'otro')),
    referencia text,
    pagado_en timestamptz not null default now(),
    registrado_por uuid references perfiles(id)
);

create view resumen_ordenes as
select
    o.id,
    o.codigo,
    o.estado,
    c.nombre as cliente,
    v.placa,
    coalesce(sum(ds.cantidad * ds.precio_unitario), 0) as total_servicios,
    coalesce(sum(dr.cantidad * dr.precio_unitario), 0) as total_repuestos,
    coalesce(sum(p.monto), 0) as total_pagado
from ordenes_trabajo o
join clientes c on c.id = o.cliente_id
join vehiculos v on v.id = o.vehiculo_id
left join detalle_servicios ds on ds.orden_id = o.id
left join detalle_repuestos dr on dr.orden_id = o.id
left join pagos p on p.orden_id = o.id
group by o.id, c.nombre, v.placa;
