// Funciones de Convex para `ventas` (M5 · TAL-18 / TAL-50).
//
//  - listar(): pantalla Ventas con KPIs (En marcha / Ganado), filtros por estado/cliente/periodo,
//    columna vendedor. Filtra `archivado == false`. `total` = importe * cantidad (derivado).
//  - registrar(...) / actualizar(...): con cantidad y vendedor.
//  - archivar({ id }): soft-delete.
//
// El estado de las ventas alimenta el estado y el valor DERIVADOS del cliente.
// Diseño de referencia: design/PROY CRM Pulse/VentaForm y ruta `ventas` de CRM Pulse.dc.html.

export {};
