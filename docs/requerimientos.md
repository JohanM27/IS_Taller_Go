# Requerimientos de TallerGo

## Proposito

TallerGo busca centralizar la administracion de un taller mecanico que actualmente opera con registros manuales. La solucion debe reducir perdida de informacion, mejorar el seguimiento de ordenes de trabajo y facilitar consultas rapidas sobre clientes, vehiculos, inventario y pagos.

## Actores

| Actor | Responsabilidades |
| --- | --- |
| Administrador | Gestionar usuarios, consultar reportes, revisar pagos, administrar inventario y supervisar operaciones. |
| Recepcion | Registrar clientes, vehiculos y ordenes de trabajo; actualizar estados y registrar pagos basicos. |

## Requerimientos funcionales

### RF-01. Gestion de clientes

El sistema debe permitir registrar, consultar, editar y desactivar clientes.

Criterios de aceptacion:

- Registrar nombre, telefono, correo y direccion.
- Buscar clientes por nombre, telefono o identidad.
- Evitar duplicados basicos mediante validacion de telefono o correo.

### RF-02. Gestion de vehiculos

El sistema debe permitir asociar uno o varios vehiculos a un cliente.

Criterios de aceptacion:

- Registrar placa, marca, modelo, anio y color.
- Consultar el historial de ordenes por vehiculo.
- Validar que la placa no se repita.

### RF-03. Ordenes de trabajo

El sistema debe permitir crear y dar seguimiento a ordenes de trabajo.

Criterios de aceptacion:

- Asociar cada orden a un cliente y un vehiculo.
- Registrar descripcion del problema, servicios realizados y repuestos usados.
- Manejar estados: pendiente, en_proceso, finalizada, facturada y entregada.

### RF-04. Inventario de repuestos

El sistema debe permitir controlar existencias de repuestos.

Criterios de aceptacion:

- Registrar nombre, codigo, costo, precio de venta y stock.
- Descontar stock cuando un repuesto se use en una orden.
- Alertar cuando el stock sea menor o igual al minimo definido.

### RF-05. Pagos y facturacion

El sistema debe permitir calcular totales y registrar pagos asociados a una orden.

Criterios de aceptacion:

- Calcular subtotal de servicios y repuestos.
- Registrar metodo de pago y monto pagado.
- Identificar ordenes pendientes de pago.

### RF-06. Reportes

El sistema debe mostrar indicadores operativos basicos.

Criterios de aceptacion:

- Total de ingresos por periodo.
- Ordenes agrupadas por estado.
- Repuestos con stock bajo.
- Clientes con mas visitas.

## Requerimientos no funcionales

| Codigo | Requerimiento |
| --- | --- |
| RNF-01 | La interfaz debe ser responsive y usable desde navegador movil. |
| RNF-02 | El acceso debe estar protegido con autenticacion. |
| RNF-03 | Las operaciones deben respetar permisos segun rol. |
| RNF-04 | La base de datos debe mantener integridad referencial entre clientes, vehiculos, ordenes y pagos. |
| RNF-05 | Las pantallas principales deben cargar en menos de tres segundos en condiciones normales. |
| RNF-06 | El sistema debe usar HTTPS en ambientes publicados. |

## Fuera de alcance para la primera version

- Integraciones con aseguradoras.
- Aplicacion movil nativa.
- Inteligencia artificial.
- Cotizaciones automaticas con proveedores externos.
- Gestion contable completa.
