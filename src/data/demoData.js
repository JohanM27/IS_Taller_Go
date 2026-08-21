export const demoOrders = [
  {
    codigo: "OT-1048",
    cliente: "Carlos Mejia",
    vehiculo: "Toyota Corolla",
    estado: "En proceso",
    total: "L 3,850",
    tone: ""
  },
  {
    codigo: "OT-1047",
    cliente: "Andrea Lopez",
    vehiculo: "Honda Civic",
    estado: "Pendiente",
    total: "L 1,200",
    tone: "warn"
  },
  {
    codigo: "OT-1046",
    cliente: "Mario Reyes",
    vehiculo: "Ford Ranger",
    estado: "Finalizada",
    total: "L 5,400",
    tone: "done"
  },
  {
    codigo: "OT-1045",
    cliente: "Sofia Cruz",
    vehiculo: "Hyundai Tucson",
    estado: "Entregada",
    total: "L 2,950",
    tone: "done"
  }
];

export const demoClients = [
  {
    id: "demo-1",
    nombre: "Carlos Mejia",
    telefono: "9988-1122",
    correo: "carlos.mejia@example.com",
    direccion: "Colonia Kennedy, Tegucigalpa"
  },
  {
    id: "demo-2",
    nombre: "Andrea Lopez",
    telefono: "9876-5544",
    correo: "andrea.lopez@example.com",
    direccion: "Comayaguela"
  }
];

export const demoVehicles = [
  {
    id: "vehicle-demo-1",
    cliente_id: "demo-1",
    placa: "HAA-4812",
    marca: "Toyota",
    modelo: "Corolla",
    anio: 2017,
    color: "Gris",
    kilometraje: 82000,
    clientes: { nombre: "Carlos Mejia" }
  },
  {
    id: "vehicle-demo-2",
    cliente_id: "demo-2",
    placa: "HBB-4901",
    marca: "Honda",
    modelo: "Civic",
    anio: 2019,
    color: "Azul",
    kilometraje: 61000,
    clientes: { nombre: "Andrea Lopez" }
  }
];
