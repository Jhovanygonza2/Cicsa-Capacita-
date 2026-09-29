// El reporte también exige permiso en la API, no solo en el menú.
(() => {
  if (!["admin", "superadmin"].includes(sesion.rol())) return;
  document.getElementById("historial-sesiones").hidden = false;
  document.getElementById("sesiones-demo").hidden = !MOCK_MODE;
  const estado = {pagina: 1, porPagina: 10};
  let registros = [], cargando = false;
  const buscar = document.getElementById("buscar-sesiones");
  const boton = document.getElementById("actualizar-sesiones");
  const error = document.getElementById("sesiones-error");
  const motivos = {cierre_manual: "Cerró sesión", inactividad: "Inactividad", cambio_cuenta: "Cambio de cuenta", sin_senal: "Sin señal (salida estimada)"};
  function pintar() {
    const filas = registros.filter(r => r.nombre.toLocaleLowerCase().includes(buscar.value.trim().toLocaleLowerCase()));
    estado.pagina = Math.min(estado.pagina, Math.max(1, Math.ceil(filas.length / estado.porPagina)));
    const inicio = (estado.pagina - 1) * estado.porPagina;
    document.getElementById("tabla-sesiones").innerHTML = filas.slice(inicio, inicio + estado.porPagina).map(r => {
      const segundos = Math.max(0, Math.floor((Date.parse(r.salida || r.ultimaSenal) - Date.parse(r.entrada)) / 1000));
      const duracion = Math.floor(segundos / 3600) + " h " + Math.floor(segundos % 3600 / 60) + " min " + segundos % 60 + " s";
      return `<tr><td>${escaparHtml(r.nombre)}</td><td>${formatoFecha(r.entrada)}</td><td>${r.salida ? formatoFecha(r.salida) + (r.estimada ? " (estimada)" : "") : "—"}</td><td>${duracion}</td><td>${r.salida ? escaparHtml(motivos[r.motivo] || "Desconectado") : "Conectado (señal reciente)"}</td></tr>`;
    }).join("") || '<tr><td colspan="5">No hay conexiones registradas para esta búsqueda.</td></tr>';
    pintarPaginacion("paginacion-sesiones", filas.length, estado, pintar);
  }
  function puedeConsultar() {
    const permitido = sesion.activa() && ["admin", "superadmin"].includes(sesion.rol());
    if (!permitido) {
      registros = [];
      document.getElementById("tabla-sesiones").replaceChildren();
      document.getElementById("historial-sesiones").hidden = true;
    }
    return permitido;
  }
  async function cargar() {
    if (!puedeConsultar() || cargando) return;
    cargando = true; boton.disabled = true;
    try {
      registros = (await reportes.sesiones()).sort((a,b) => Date.parse(b.entrada) - Date.parse(a.entrada));
      if (!puedeConsultar()) return;
      pintar(); error.textContent = "";
    } catch (e) { error.textContent = "No se pudo actualizar el historial: " + e.message; }
    finally { cargando = false; boton.disabled = false; }
  }
  buscar.addEventListener("input", () => { estado.pagina = 1; pintar(); });
  boton.addEventListener("click", cargar);
  window.addEventListener("storage", e => { if (puedeConsultar() && e.key === "cicsa_sesiones_uso") cargar(); });
  setInterval(cargar, 30000);
  cargar();
})();
