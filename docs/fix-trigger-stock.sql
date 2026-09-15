-- TallerGo - corrección del trigger de stock para usuarios de Recepción/Caja
-- Ejecutar en Supabase SQL Editor si al agregar repuestos sale "Stock insuficiente"
-- aunque el repuesto sí tenga existencia.

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

grant execute on function descontar_stock_repuesto() to authenticated;
grant execute on function devolver_stock_repuesto() to authenticated;
