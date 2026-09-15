-- TallerGo - modelo de datos para PostgreSQL / Supabase
-- Ejecutar desde Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists perfiles (
    id uuid primary key references auth.users(id) on delete cascade,
    nombre text not null,
    rol text not null check (rol in ('administrador', 'recepcion')),
    activo boolean not null default true,
    creado_en timestamptz not null default now(),
    actualizado_en timestamptz not null default now()
);

create table if not exists clientes (
    id uuid primary key default gen_random_uuid(),
    identidad text,
    nombre text not null,
    telefono text not null,
    correo text,
    direccion text,
    activo boolean not null default true,
    creado_en timestamptz not null default now(),
    actualizado_en timestamptz not null default now(),
    constraint clientes_telefono_unique unique (telefono),
    constraint clientes_correo_unique unique (correo),
    constraint clientes_identidad_unique unique (identidad)
);

create table if not exists vehiculos (
    id uuid primary key default gen_random_uuid(),
    cliente_id uuid not null references clientes(id) on delete restrict,
    placa text not null unique,
    marca text not null,
    modelo text not null,
    anio integer check (anio between 1950 and extract(year from now())::integer + 1),
    color text,
    kilometraje integer check (kilometraje is null or kilometraje >= 0),
    activo boolean not null default true,
    creado_en timestamptz not null default now(),
    actualizado_en timestamptz not null default now()
);

create table if not exists servicios (
    id uuid primary key default gen_random_uuid(),
    nombre text not null unique,
    descripcion text,
    precio numeric(10,2) not null check (precio >= 0),
    activo boolean not null default true,
    creado_en timestamptz not null default now(),
    actualizado_en timestamptz not null default now()
);

create table if not exists repuestos (
    id uuid primary key default gen_random_uuid(),
    codigo text not null unique,
    nombre text not null,
    costo numeric(10,2) not null default 0 check (costo >= 0),
    precio_venta numeric(10,2) not null check (precio_venta >= 0),
    stock integer not null default 0 check (stock >= 0),
    stock_minimo integer not null default 1 check (stock_minimo >= 0),
    activo boolean not null default true,
    creado_en timestamptz not null default now(),
    actualizado_en timestamptz not null default now()
);

create table if not exists ordenes_trabajo (
    id uuid primary key default gen_random_uuid(),
    codigo text not null unique,
    cliente_id uuid not null references clientes(id) on delete restrict,
    vehiculo_id uuid not null references vehiculos(id) on delete restrict,
    estado text not null default 'pendiente'
        check (estado in ('pendiente', 'en_proceso', 'finalizada', 'facturada', 'entregada')),
    descripcion_problema text not null,
    diagnostico text,
    observaciones text,
    fecha_ingreso timestamptz not null default now(),
    fecha_entrega timestamptz,
    creado_por uuid references perfiles(id),
    creado_en timestamptz not null default now(),
    actualizado_en timestamptz not null default now()
);

create table if not exists detalle_servicios (
    id uuid primary key default gen_random_uuid(),
    orden_id uuid not null references ordenes_trabajo(id) on delete cascade,
    servicio_id uuid references servicios(id) on delete set null,
    descripcion text not null,
    cantidad integer not null default 1 check (cantidad > 0),
    precio_unitario numeric(10,2) not null check (precio_unitario >= 0),
    creado_en timestamptz not null default now()
);

create table if not exists detalle_repuestos (
    id uuid primary key default gen_random_uuid(),
    orden_id uuid not null references ordenes_trabajo(id) on delete cascade,
    repuesto_id uuid not null references repuestos(id) on delete restrict,
    cantidad integer not null check (cantidad > 0),
    precio_unitario numeric(10,2) not null check (precio_unitario >= 0),
    creado_en timestamptz not null default now()
);

create table if not exists pagos (
    id uuid primary key default gen_random_uuid(),
    orden_id uuid not null references ordenes_trabajo(id) on delete restrict,
    monto numeric(10,2) not null check (monto > 0),
    metodo text not null check (metodo in ('efectivo', 'tarjeta', 'transferencia', 'otro')),
    referencia text,
    pagado_en timestamptz not null default now(),
    registrado_por uuid references perfiles(id)
);

create index if not exists idx_clientes_nombre on clientes using gin (to_tsvector('spanish', nombre));
create index if not exists idx_clientes_telefono on clientes (telefono);
create index if not exists idx_vehiculos_cliente_id on vehiculos (cliente_id);
create index if not exists idx_vehiculos_placa on vehiculos (placa);
create index if not exists idx_ordenes_cliente_id on ordenes_trabajo (cliente_id);
create index if not exists idx_ordenes_vehiculo_id on ordenes_trabajo (vehiculo_id);
create index if not exists idx_ordenes_estado on ordenes_trabajo (estado);
create index if not exists idx_detalle_servicios_orden_id on detalle_servicios (orden_id);
create index if not exists idx_detalle_repuestos_orden_id on detalle_repuestos (orden_id);
create index if not exists idx_pagos_orden_id on pagos (orden_id);
create index if not exists idx_repuestos_stock_bajo on repuestos (stock, stock_minimo) where activo = true;

create or replace function set_actualizado_en()
returns trigger
language plpgsql
as $$
begin
    new.actualizado_en = now();
    return new;
end;
$$;

drop trigger if exists trg_perfiles_actualizado_en on perfiles;
create trigger trg_perfiles_actualizado_en
before update on perfiles
for each row execute function set_actualizado_en();

drop trigger if exists trg_clientes_actualizado_en on clientes;
create trigger trg_clientes_actualizado_en
before update on clientes
for each row execute function set_actualizado_en();

drop trigger if exists trg_vehiculos_actualizado_en on vehiculos;
create trigger trg_vehiculos_actualizado_en
before update on vehiculos
for each row execute function set_actualizado_en();

drop trigger if exists trg_servicios_actualizado_en on servicios;
create trigger trg_servicios_actualizado_en
before update on servicios
for each row execute function set_actualizado_en();

drop trigger if exists trg_repuestos_actualizado_en on repuestos;
create trigger trg_repuestos_actualizado_en
before update on repuestos
for each row execute function set_actualizado_en();

drop trigger if exists trg_ordenes_actualizado_en on ordenes_trabajo;
create trigger trg_ordenes_actualizado_en
before update on ordenes_trabajo
for each row execute function set_actualizado_en();

create or replace function descontar_stock_repuesto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    update repuestos
    set stock = stock - new.cantidad
    where id = new.repuesto_id
      and stock >= new.cantidad;

    if not found then
        raise exception 'Stock insuficiente para el repuesto %', new.repuesto_id;
    end if;

    return new;
end;
$$;

drop trigger if exists trg_descontar_stock_repuesto on detalle_repuestos;
create trigger trg_descontar_stock_repuesto
before insert on detalle_repuestos
for each row execute function descontar_stock_repuesto();

create or replace function devolver_stock_repuesto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    update repuestos
    set stock = stock + old.cantidad
    where id = old.repuesto_id;

    return old;
end;
$$;

drop trigger if exists trg_devolver_stock_repuesto on detalle_repuestos;
create trigger trg_devolver_stock_repuesto
after delete on detalle_repuestos
for each row execute function devolver_stock_repuesto();

create or replace view resumen_ordenes as
with total_servicios as (
    select orden_id, sum(cantidad * precio_unitario) as total
    from detalle_servicios
    group by orden_id
),
total_repuestos as (
    select orden_id, sum(cantidad * precio_unitario) as total
    from detalle_repuestos
    group by orden_id
),
total_pagos as (
    select orden_id, sum(monto) as total
    from pagos
    group by orden_id
)
select
    o.id,
    o.codigo,
    o.estado,
    o.fecha_ingreso,
    c.nombre as cliente,
    v.placa,
    concat(v.marca, ' ', v.modelo) as vehiculo,
    coalesce(ts.total, 0) as total_servicios,
    coalesce(tr.total, 0) as total_repuestos,
    (coalesce(ts.total, 0) + coalesce(tr.total, 0)) + round((coalesce(ts.total, 0) + coalesce(tr.total, 0)) * 0.15, 2) as total_orden,
    coalesce(tp.total, 0) as total_pagado,
    ((coalesce(ts.total, 0) + coalesce(tr.total, 0)) + round((coalesce(ts.total, 0) + coalesce(tr.total, 0)) * 0.15, 2)) - coalesce(tp.total, 0) as saldo_pendiente,
    coalesce(ts.total, 0) + coalesce(tr.total, 0) as subtotal_orden,
    round((coalesce(ts.total, 0) + coalesce(tr.total, 0)) * 0.15, 2) as impuesto_orden
from ordenes_trabajo o
join clientes c on c.id = o.cliente_id
join vehiculos v on v.id = o.vehiculo_id
left join total_servicios ts on ts.orden_id = o.id
left join total_repuestos tr on tr.orden_id = o.id
left join total_pagos tp on tp.orden_id = o.id;

create or replace view repuestos_stock_bajo as
select id, codigo, nombre, stock, stock_minimo, precio_venta
from repuestos
where activo = true
  and stock <= stock_minimo;

alter table perfiles enable row level security;
alter table clientes enable row level security;
alter table vehiculos enable row level security;
alter table servicios enable row level security;
alter table repuestos enable row level security;
alter table ordenes_trabajo enable row level security;
alter table detalle_servicios enable row level security;
alter table detalle_repuestos enable row level security;
alter table pagos enable row level security;

create or replace function usuario_es_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
    select exists (
        select 1
        from perfiles
        where id = auth.uid()
          and rol = 'administrador'
          and activo = true
    );
$$;

create or replace function usuario_es_operativo()
returns boolean
language sql
security definer
set search_path = public
as $$
    select exists (
        select 1
        from perfiles
        where id = auth.uid()
          and rol in ('administrador', 'recepcion')
          and activo = true
    );
$$;

drop policy if exists "perfiles lectura propia o admin" on perfiles;
create policy "perfiles lectura propia o admin"
on perfiles for select
using (id = auth.uid() or usuario_es_admin());

drop policy if exists "perfiles solo admin modifica" on perfiles;
create policy "perfiles solo admin modifica"
on perfiles for all
using (usuario_es_admin())
with check (usuario_es_admin());

drop policy if exists "operativos leen clientes" on clientes;
create policy "operativos leen clientes"
on clientes for select
using (usuario_es_operativo());

drop policy if exists "operativos crean clientes" on clientes;
create policy "operativos crean clientes"
on clientes for insert
with check (usuario_es_operativo());

drop policy if exists "operativos actualizan clientes" on clientes;
create policy "operativos actualizan clientes"
on clientes for update
using (usuario_es_operativo())
with check (usuario_es_operativo());

drop policy if exists "admin elimina clientes" on clientes;
create policy "admin elimina clientes"
on clientes for delete
using (usuario_es_admin());

drop policy if exists "operativos gestionan vehiculos" on vehiculos;
create policy "operativos gestionan vehiculos"
on vehiculos for all
using (usuario_es_operativo())
with check (usuario_es_operativo());

drop policy if exists "operativos leen servicios" on servicios;
create policy "operativos leen servicios"
on servicios for select
using (usuario_es_operativo());

drop policy if exists "admin gestiona servicios" on servicios;
create policy "admin gestiona servicios"
on servicios for all
using (usuario_es_admin())
with check (usuario_es_admin());

drop policy if exists "operativos leen repuestos" on repuestos;
create policy "operativos leen repuestos"
on repuestos for select
using (usuario_es_operativo());

drop policy if exists "admin gestiona repuestos" on repuestos;
create policy "admin gestiona repuestos"
on repuestos for all
using (usuario_es_admin())
with check (usuario_es_admin());

drop policy if exists "operativos gestionan ordenes" on ordenes_trabajo;
create policy "operativos gestionan ordenes"
on ordenes_trabajo for all
using (usuario_es_operativo())
with check (usuario_es_operativo());

drop policy if exists "operativos gestionan detalle servicios" on detalle_servicios;
create policy "operativos gestionan detalle servicios"
on detalle_servicios for all
using (usuario_es_operativo())
with check (usuario_es_operativo());

drop policy if exists "operativos gestionan detalle repuestos" on detalle_repuestos;
create policy "operativos gestionan detalle repuestos"
on detalle_repuestos for all
using (usuario_es_operativo())
with check (usuario_es_operativo());

drop policy if exists "operativos leen pagos" on pagos;
create policy "operativos leen pagos"
on pagos for select
using (usuario_es_operativo());

drop policy if exists "operativos crean pagos" on pagos;
create policy "operativos crean pagos"
on pagos for insert
with check (usuario_es_operativo());

drop policy if exists "admin modifica pagos" on pagos;
create policy "admin modifica pagos"
on pagos for update
using (usuario_es_admin())
with check (usuario_es_admin());

drop policy if exists "admin elimina pagos" on pagos;
create policy "admin elimina pagos"
on pagos for delete
using (usuario_es_admin());
