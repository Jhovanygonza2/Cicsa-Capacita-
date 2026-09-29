// dashboard-arranque.js — Carga de datos del panel y arranque de la aplicación

let cargaDashboardEnCurso = null;
let recargaDashboardPendiente = false;
const avisoCargaAdmin = document.createElement("div");
avisoCargaAdmin.className = "tarjeta";
avisoCargaAdmin.hidden = true;
avisoCargaAdmin.setAttribute("role", "alert");
const textoCargaAdmin = document.createElement("p");
const reintentarCargaAdmin = document.createElement("button");
reintentarCargaAdmin.type = "button";
reintentarCargaAdmin.className = "btn btn-secundario";
reintentarCargaAdmin.textContent = "Reintentar carga";
reintentarCargaAdmin.addEventListener("click", () => cargarTodo());
avisoCargaAdmin.append(textoCargaAdmin, reintentarCargaAdmin);
document.querySelector(".contenedor-admin")?.prepend(avisoCargaAdmin);

async function cargarTodo() {
  if (cargaDashboardEnCurso) {
    recargaDashboardPendiente = true;
    return cargaDashboardEnCurso;
  }
  reintentarCargaAdmin.disabled = true;

  document.querySelectorAll(".metrica-admin-num").forEach((elemento) => elemento.classList.add("is-loading"));
  cargaDashboardEnCurso = Promise.all([
    permisos.tiene("usuarios") ? usuarios.listar() : Promise.resolve([]),
    cursos.listar(),
    permisos.tiene("password") ? solicitudesReset.listar() : Promise.resolve([]),
    permisos.tiene("usuarios") ? notificacionesAdmin.listar() : Promise.resolve([]),
    permisos.tiene("reportes") ? reportes.seguimientoTrabajadores() : Promise.resolve([]),
    permisos.tiene("reportes") ? reportes.seguimiento() : Promise.resolve([]),
  ]).then(([usuariosCargados, cursosCargados, solicitudesCargadas, notificacionesCargadas, seguimientoCargado, resultadosCargados]) => {
    listaUsuarios = usuariosCargados;
    listaCursos = cursosCargados;
    listaSolicitudes = solicitudesCargadas;
    listaNotificaciones = notificacionesCargadas;
    listaSeguimiento = seguimientoCargado;
    listaResultados = resultadosCargados;

    pintarAsignacionTrabajadores();
    pintarMetricas();
    pintarActividad();
    pintarUsuarios();
    pintarSolicitudes();
    pintarNotificaciones();
    pintarCampanaAdmin();
    pintarCursos();
    pintarAprobacionesCursos();
    const pendientesRevision = sesion.rol() === "superadmin" ? cursosPendientesRevisionInstructor().length : 0;
    const navContadorAprobaciones = document.getElementById("nav-contador-aprobaciones");
    if (navContadorAprobaciones) {
      navContadorAprobaciones.textContent = String(pendientesRevision);
      navContadorAprobaciones.hidden = pendientesRevision === 0;
    }
    pintarMisSolicitudesCursos();
    pintarExamenes();
    inicializarFiltrosReporte();
    pintarSeguimiento();
    avisoCargaAdmin.hidden = true;
  }).catch((error) => {
    textoCargaAdmin.textContent = "No se pudo actualizar el panel. Se conservan los datos anteriores. " + (error.message || "");
    avisoCargaAdmin.hidden = false;
  }).finally(() => {
    document.querySelectorAll(".metrica-admin-num").forEach((elemento) => elemento.classList.remove("is-loading"));
    cargaDashboardEnCurso = null;
    reintentarCargaAdmin.disabled = false;
    if (recargaDashboardPendiente) {
      recargaDashboardPendiente = false;
      return cargarTodo();
    }
  });
  return cargaDashboardEnCurso;
}


// ---------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------
if (sesion.activa() && ["admin", "superadmin"].includes(sesion.rol())) cargarTodo();
