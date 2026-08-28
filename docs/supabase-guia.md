# Guia para crear la base de datos en Supabase

## 1. Crear el proyecto

1. Entra a Supabase.
2. Crea un proyecto nuevo llamado `TallerGo`.
3. Guarda la URL del proyecto y la llave publica `anon`, porque se usaran despues en React.

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
- Politicas RLS iniciales por rol.

## 3. Crear usuarios

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

## 4. Insertar datos de prueba

Despues de crear el usuario/perfil, puedes ejecutar:

```text
docs/datos-prueba.sql
```

Esto carga clientes, vehiculos, servicios, repuestos, ordenes y pagos de ejemplo.

## 5. Permisos para la API

Si durante la creacion del proyecto desactivaste `Automatically expose new tables`, ejecuta tambien:

```text
docs/permisos-supabase.sql
```

Este script permite que el usuario autenticado pueda consultar y operar las tablas desde React, siempre respetando las politicas RLS.

## 6. Consultas utiles para validar

Ver ordenes con totales:

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

## 7. Siguiente paso recomendado

Conectar React a Supabase usando variables de entorno:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Despues se pueden reemplazar los datos quemados del dashboard por consultas reales a `resumen_ordenes`, `clientes` y `repuestos_stock_bajo`.
