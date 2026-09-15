-- TallerGo - actualización de totales con ISV
-- Ejecutar en Supabase SQL Editor para que resumen_ordenes calcule subtotal + ISV + total.
-- Compatible con la vista existente: conserva el nombre total_orden y agrega columnas nuevas al final.

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

grant select on resumen_ordenes to authenticated;
