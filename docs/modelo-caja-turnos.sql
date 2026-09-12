-- TallerGo - mejora profesional para apertura y cierre de caja
-- Ejecutar después de docs/modelo-datos.sql si quieres guardar turnos de caja en Supabase.

create table if not exists caja_turnos (
    id uuid primary key default gen_random_uuid(),
    abierto_por uuid not null references perfiles(id) on delete restrict,
    saldo_inicial numeric(10,2) not null default 0 check (saldo_inicial >= 0),
    saldo_sistema numeric(10,2) not null default 0 check (saldo_sistema >= 0),
    saldo_cierre numeric(10,2) check (saldo_cierre is null or saldo_cierre >= 0),
    estado text not null default 'abierta' check (estado in ('abierta', 'cerrada')),
    fecha_apertura timestamptz not null default now(),
    fecha_cierre timestamptz,
    observaciones text,
    creado_en timestamptz not null default now(),
    actualizado_en timestamptz not null default now()
);

alter table pagos
add column if not exists caja_turno_id uuid references caja_turnos(id) on delete set null;

create unique index if not exists idx_caja_turnos_un_turno_abierto_por_usuario
on caja_turnos (abierto_por)
where estado = 'abierta';

create index if not exists idx_caja_turnos_estado on caja_turnos (estado);
create index if not exists idx_pagos_caja_turno_id on pagos (caja_turno_id);

drop trigger if exists trg_caja_turnos_actualizado_en on caja_turnos;
create trigger trg_caja_turnos_actualizado_en
before update on caja_turnos
for each row execute function set_actualizado_en();

alter table caja_turnos enable row level security;

drop policy if exists "operativos leen turnos de caja" on caja_turnos;
create policy "operativos leen turnos de caja"
on caja_turnos for select
using (usuario_es_operativo());

drop policy if exists "operativos crean turnos de caja" on caja_turnos;
create policy "operativos crean turnos de caja"
on caja_turnos for insert
with check (usuario_es_operativo() and abierto_por = auth.uid());

drop policy if exists "operativos cierran turnos propios" on caja_turnos;
create policy "operativos cierran turnos propios"
on caja_turnos for update
using (usuario_es_operativo() and abierto_por = auth.uid())
with check (usuario_es_operativo() and abierto_por = auth.uid());

drop policy if exists "admin elimina turnos de caja" on caja_turnos;
create policy "admin elimina turnos de caja"
on caja_turnos for delete
using (usuario_es_admin());
