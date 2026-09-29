// metricas-actividad.js — Métricas generales y actividad de trabajadores

// ---------------------------------------------------------------
// MÉTRICAS
// ---------------------------------------------------------------
function pintarMetricas() {
  const trabajadores = listaUsuarios.filter((u) => u.rol === "trabajador");
  document.getElementById("metrica-registrados").textContent = trabajadores.length;
  document.getElementById("metrica-activos").textContent = trabajadores.filter((u) => u.activo && estadoActividad(u) === "activo").length;
  document.getElementById("metrica-desactivados").textContent = trabajadores.filter((u) => !u.activo).length;
}

// ---------------------------------------------------------------
// ACTIVIDAD DE TRABAJADORES
// ---------------------------------------------------------------
function pintarActividad() {
  const filtro = document.getElementById("filtro-actividad").value;
  const q = document.getElementById("buscar-actividad").value.toLowerCase();
  const trabajadores = listaUsuarios
    .filter((u) => u.rol === "trabajador")
    .filter((u) => !filtro || estadoActividad(u) === filtro)
    .filter((u) => !q || u.nombre.toLowerCase().includes(q));

  const cuerpo = document.getElementById("tabla-actividad");
  const estado = estadoDashboard.actividad;
  estado.pagina = Math.min(estado.pagina, Math.max(1, Math.ceil(trabajadores.length / estado.porPagina)));
  const inicio = (estado.pagina - 1) * estado.porPagina;
  const visibles = trabajadores.slice(inicio, inicio + estado.porPagina);
  cuerpo.innerHTML = visibles.map((u) => {
    const estado = estadoActividad(u);
    return `
      <tr>
        <td><strong>${escaparHtml(u.nombre)}</strong></td>
        <td class="muted">Trabajador</td>
        <td class="muted">${formatoFecha(u.ultimoAcceso)}</td>
        <td class="muted">${tiempoDesde(u.ultimoAcceso)}</td>
        <td>${badgeActividad(estado)}</td>
        <td>
          <div class="acciones-fila">
            <button data-ver-perfil="${u.id}">Ver perfil</button>
          </div>
        </td>
      </tr>`;
  }).join("") || `<tr><td colspan="6" class="muted" style="text-align:center; padding:20px;">Sin resultados.</td></tr>`;
  pintarPaginacion("paginacion-actividad", trabajadores.length, estado, pintarActividad);
}

document.getElementById("filtro-actividad").addEventListener("change", () => {
  estadoDashboard.actividad.pagina = 1;
  pintarActividad();
});
document.getElementById("buscar-actividad").addEventListener("input", () => {
  estadoDashboard.actividad.pagina = 1;
  pintarActividad();
});


document.getElementById("tabla-actividad")?.addEventListener("click", (evento) => {
  const boton = evento.target.closest("[data-ver-perfil]");
  if (boton) abrirPerfilTrabajador(boton.dataset.verPerfil);
});
