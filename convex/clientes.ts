// Funciones de Convex para `clientes` (M3 · TAL-11 / TAL-12 / TAL-13 / TAL-49 / TAL-59).
//
// Aquí irán las query/mutation de clientes, por ejemplo:
//  - listar(): lista filtrando `archivado == false` (búsqueda por nombre/teléfono, orden/filtro por prioridad).
//  - obtener({ id }): ficha 360 con estado/valor/último contacto DERIVADOS y su historial.
//  - crear(...) / actualizar(...): alta y edición con todos los campos del diseño.
//  - archivar({ id }): soft-delete (archivado = true).
//
// La autorización se comprueba DENTRO de cada función (no hay RLS).
// Diseño de referencia: design/PROY CRM Pulse/ClienteForm, ClientesLista, Ficha360.

export {};
