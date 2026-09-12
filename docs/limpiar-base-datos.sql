-- TallerGo - limpieza de datos operativos
-- Ejecutar en Supabase SQL Editor cuando quieras iniciar la base desde cero.
--
-- Importante:
-- - No borra usuarios de Supabase Auth.
-- - No borra perfiles, para conservar los roles de administrador y Recepción/Caja.
-- - Borra clientes, vehículos, órdenes, detalles, pagos, turnos de caja, servicios y repuestos.

begin;

truncate table
    pagos,
    caja_turnos,
    detalle_repuestos,
    detalle_servicios,
    ordenes_trabajo,
    vehiculos,
    clientes,
    repuestos,
    servicios
restart identity cascade;

commit;

-- Verificación rápida
select 'clientes' as tabla, count(*) as registros from clientes
union all
select 'vehiculos', count(*) from vehiculos
union all
select 'ordenes_trabajo', count(*) from ordenes_trabajo
union all
select 'detalle_servicios', count(*) from detalle_servicios
union all
select 'detalle_repuestos', count(*) from detalle_repuestos
union all
select 'pagos', count(*) from pagos
union all
select 'servicios', count(*) from servicios
union all
select 'repuestos', count(*) from repuestos
union all
select 'perfiles_conservados', count(*) from perfiles;
