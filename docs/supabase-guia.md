# Guía para crear la base de datos en Supabase

## 1. Crear el proyecto

1. Entra a Supabase.
2. Crea un proyecto nuevo llamado `TallerGo`.
3. Guarda la URL del proyecto y la llave pública `anon`, porque se usarán después en React.

## 2. Ejecutar el esquema

En Supabase abre `SQL Editor`, crea una consulta nueva y pega el contenido de:

```text
docs/modelo-datos.sql
```

Ejecuta el script completo. Esto crea:

- Tablas principales: `clientes`, `vehiculos`, `ordenes_trabajo`, `servicios`, `repuestos`, `pagos`.
- Tablas de detalle: `detalle_servicios`, `detalle_repuestos`.
- Vista `resumen_ordenes` para consultar totales.
- Vista `repuestos_stock_bajo`.
- Triggers para actualizar fechas y descontar stock.
- Políticas RLS iniciales por rol.

## 3. Activar turnos de caja

Para guardar apertura y cierre de caja en la base de datos, ejecuta también:

```text
docs/modelo-caja-turnos.sql
```

Esto crea `caja_turnos` y relaciona los pagos con el turno de caja correspondiente.

## 4. Crear usuarios

Desde `Authentication > Users`, crea al menos un usuario para pruebas.

Luego, en SQL Editor, registra su perfil como administrador:

```sql
insert into perfiles (id, nombre, rol)
values (
    'PEGAR_AQUI_EL_ID_DEL_USUARIO',
    'Administrador TallerGo',
    'administrador'
);
```

Roles permitidos:

- `administrador`: muestra el menú de Administrador/Dueño.
- `recepcion`: muestra el menú de Recepción/Caja.

Ejemplo para usuario de Recepción/Caja:

```sql
insert into perfiles (id, nombre, rol)
values (
    'PEGAR_AQUI_EL_ID_DEL_USUARIO',
    'Usuario Recepción/Caja',
    'recepcion'
);
```

## 5. Permisos para la API

Si durante la creación del proyecto desactivaste `Automatically expose new tables`, ejecuta también:

```text
docs/permisos-supabase.sql
```

Este script permite que el usuario autenticado pueda consultar y operar las tablas desde React, siempre respetando las políticas RLS.

## 6. Limpiar datos operativos

Si necesitas iniciar con la base vacía sin borrar los usuarios ni perfiles, ejecuta:

```text
docs/limpiar-base-datos.sql
```

Esto elimina clientes, vehículos, órdenes, detalles, pagos, servicios y repuestos, pero conserva los accesos.

## 7. Consultas útiles para validar

Ver órdenes con totales:

```sql
select * from resumen_ordenes;
```

Ver repuestos con stock bajo:

```sql
select * from repuestos_stock_bajo;
```

Ver historial por cliente:

```sql
select
    c.nombre,
    v.placa,
    o.codigo,
    o.estado,
    o.fecha_ingreso
from clientes c
join vehiculos v on v.cliente_id = c.id
join ordenes_trabajo o on o.vehiculo_id = v.id
order by o.fecha_ingreso desc;
```

## 8. Conectar Supabase en React

Conectar React a Supabase usando variables de entorno:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Después reinicia el servidor con `npm run dev`. El sistema cargará información real desde Supabase.
