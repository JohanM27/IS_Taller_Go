-- Crear perfil para usuario de Recepción/Caja en TallerGo
-- Paso 1: crear el usuario en Supabase > Authentication > Users.
-- Paso 2: copiar el User UID del usuario creado.
-- Paso 3: reemplazar PEGAR_UID_DEL_USUARIO por ese UID y ejecutar este script.

insert into perfiles (id, nombre, rol, activo)
values (
    'PEGAR_UID_DEL_USUARIO',
    'Usuario Caja',
    'recepcion',
    true
)
on conflict (id) do update
set
    nombre = excluded.nombre,
    rol = excluded.rol,
    activo = true;
