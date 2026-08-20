-- Permisos API para TallerGo en Supabase
-- Ejecutar despues de docs/modelo-datos.sql.
-- Necesario cuando "Automatically expose new tables" esta desactivado.

grant usage on schema public to anon, authenticated;

grant select on perfiles to authenticated;

grant select, insert, update on clientes to authenticated;
grant delete on clientes to authenticated;

grant select, insert, update, delete on vehiculos to authenticated;

grant select on servicios to authenticated;
grant insert, update, delete on servicios to authenticated;

grant select on repuestos to authenticated;
grant insert, update, delete on repuestos to authenticated;

grant select, insert, update, delete on ordenes_trabajo to authenticated;
grant select, insert, update, delete on detalle_servicios to authenticated;
grant select, insert, update, delete on detalle_repuestos to authenticated;

grant select, insert on pagos to authenticated;
grant update, delete on pagos to authenticated;

grant select on resumen_ordenes to authenticated;
grant select on repuestos_stock_bajo to authenticated;

grant execute on function usuario_es_admin() to authenticated;
grant execute on function usuario_es_operativo() to authenticated;
grant execute on function set_actualizado_en() to authenticated;
grant execute on function descontar_stock_repuesto() to authenticated;
grant execute on function devolver_stock_repuesto() to authenticated;
