-- Datos de prueba para TallerGo
-- Ejecutar despues de docs/modelo-datos.sql.

insert into clientes (identidad, nombre, telefono, correo, direccion)
values
    ('0801199900012', 'Carlos Mejia', '9988-1122', 'carlos.mejia@example.com', 'Colonia Kennedy, Tegucigalpa'),
    ('0801199800045', 'Andrea Lopez', '9876-5544', 'andrea.lopez@example.com', 'Comayaguela'),
    ('0801199700099', 'Mario Reyes', '9566-7788', 'mario.reyes@example.com', 'Residencial Las Uvas')
on conflict do nothing;

insert into vehiculos (cliente_id, placa, marca, modelo, anio, color, kilometraje)
select id, 'HAA-4812', 'Toyota', 'Corolla', 2017, 'Gris', 82000
from clientes
where telefono = '9988-1122'
on conflict do nothing;

insert into vehiculos (cliente_id, placa, marca, modelo, anio, color, kilometraje)
select id, 'HBB-4901', 'Honda', 'Civic', 2019, 'Azul', 61000
from clientes
where telefono = '9876-5544'
on conflict do nothing;

insert into vehiculos (cliente_id, placa, marca, modelo, anio, color, kilometraje)
select id, 'HCC-4877', 'Ford', 'Ranger', 2020, 'Blanco', 73400
from clientes
where telefono = '9566-7788'
on conflict do nothing;

insert into servicios (nombre, descripcion, precio)
values
    ('Cambio de aceite', 'Cambio de aceite de motor y revision general.', 850.00),
    ('Revision de frenos', 'Revision y mantenimiento del sistema de frenos.', 1200.00),
    ('Diagnostico electrico', 'Revision con scanner y pruebas electricas.', 1500.00),
    ('Alineacion y balanceo', 'Alineacion, balanceo y revision de llantas.', 950.00)
on conflict do nothing;

insert into repuestos (codigo, nombre, costo, precio_venta, stock, stock_minimo)
values
    ('REP-001', 'Filtro de aceite', 120.00, 220.00, 3, 5),
    ('REP-002', 'Pastillas de freno', 650.00, 980.00, 2, 4),
    ('REP-003', 'Bujias', 85.00, 150.00, 6, 8),
    ('REP-004', 'Aceite 10W-30', 420.00, 620.00, 12, 6)
on conflict do nothing;

insert into ordenes_trabajo (codigo, cliente_id, vehiculo_id, estado, descripcion_problema, observaciones)
select
    'OT-1048',
    c.id,
    v.id,
    'en_proceso',
    'Cliente reporta ruido al frenar y vibracion en el pedal.',
    'Vehiculo recibido en recepcion.'
from clientes c
join vehiculos v on v.cliente_id = c.id
where c.telefono = '9988-1122'
  and v.placa = 'HAA-4812'
on conflict do nothing;

insert into ordenes_trabajo (codigo, cliente_id, vehiculo_id, estado, descripcion_problema)
select
    'OT-1047',
    c.id,
    v.id,
    'pendiente',
    'Mantenimiento preventivo solicitado por kilometraje.'
from clientes c
join vehiculos v on v.cliente_id = c.id
where c.telefono = '9876-5544'
  and v.placa = 'HBB-4901'
on conflict do nothing;

insert into detalle_servicios (orden_id, servicio_id, descripcion, cantidad, precio_unitario)
select o.id, s.id, s.nombre, 1, s.precio
from ordenes_trabajo o
join servicios s on s.nombre = 'Revision de frenos'
where o.codigo = 'OT-1048'
  and not exists (
      select 1
      from detalle_servicios ds
      where ds.orden_id = o.id
        and ds.servicio_id = s.id
  );

insert into detalle_servicios (orden_id, servicio_id, descripcion, cantidad, precio_unitario)
select o.id, s.id, s.nombre, 1, s.precio
from ordenes_trabajo o
join servicios s on s.nombre = 'Cambio de aceite'
where o.codigo = 'OT-1047'
  and not exists (
      select 1
      from detalle_servicios ds
      where ds.orden_id = o.id
        and ds.servicio_id = s.id
  );

insert into detalle_repuestos (orden_id, repuesto_id, cantidad, precio_unitario)
select o.id, r.id, 1, r.precio_venta
from ordenes_trabajo o
join repuestos r on r.codigo = 'REP-002'
where o.codigo = 'OT-1048'
  and not exists (
      select 1
      from detalle_repuestos dr
      where dr.orden_id = o.id
        and dr.repuesto_id = r.id
  );

insert into pagos (orden_id, monto, metodo, referencia)
select id, 1000.00, 'efectivo', 'Abono inicial'
from ordenes_trabajo
where codigo = 'OT-1048'
  and not exists (
      select 1
      from pagos p
      where p.orden_id = ordenes_trabajo.id
        and p.referencia = 'Abono inicial'
  );
