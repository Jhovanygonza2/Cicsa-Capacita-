// Iconografía común del listado y la campana administrativa.
function iconoNotificacionAdmin(tipo) {
  const trazos = {
    password: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    curso: '<path d="M6 3h9l4 4v14H6V3Zm8 0v5h5M9 14l2 2 4-5"/>',
    vacio: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/><path d="m9 10 2 2 4-4"/>'
  };
  return '<svg class="aviso-admin-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (trazos[tipo] || trazos.curso) + '</svg>';
}
function avisoVacioAdmin() {
  return '<span class="aviso-admin-vacio-icono">' + iconoNotificacionAdmin("vacio") + '</span><div><strong>No tienes avisos pendientes</strong><p>Las novedades de los trabajadores aparecerán aquí.</p></div>';
}

// notificaciones.js — Notificaciones del panel administrativo

function irARevisionCursoAdmin(cursoId) {
  const seccion = document.getElementById("aprobacion-cursos-admin");
  if (!seccion || sesion.rol() !== "superadmin") return;
  try { history.pushState(null, "", "#aprobacion-cursos-admin"); } catch (error) { location.hash = "aprobacion-cursos-admin"; }
  activarSeccionAdmin?.("aprobacion-cursos-admin");
  seccion.scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => {
    const tarjeta = document.getElementById(`revision-curso-${cursoId}`);
    tarjeta?.classList.add("revision-curso-destacada");
    tarjeta?.scrollIntoView({ behavior: "smooth", block: "center" });
    tarjeta?.querySelector("textarea")?.focus({ preventScroll: true });
    setTimeout(() => tarjeta?.classList.remove("revision-curso-destacada"), 1800);
  }, 180);
}

function pintarNotificaciones() {
  const lista = document.getElementById("lista-notificaciones-admin");
  const badge = document.getElementById("notificaciones-admin-badge");
  if (!lista || !badge) return;
  const pendientes = listaNotificaciones.filter((n) => !n.leida);
  badge.textContent = pendientes.length;
  badge.style.display = pendientes.length ? "inline-flex" : "none";
  lista.innerHTML = listaNotificaciones.length
    ? listaNotificaciones.map((n) => {
      const nombre = n.usuario?.nombre || "Un trabajador";
      const nombreCurso = n.curso?.nombre || "Curso";
      const texto = n.tipo === "password"
        ? `${nombre} solicitó restablecer su contraseña.`
        : n.tipo === "curso-revision"
          ? `${nombre} envió el curso «${nombreCurso}» para revisión y autorización.`
          : n.tipo === "curso-vencimiento"
            ? `El curso «${nombreCurso}» está próximo a vencer.`
            : n.tipo === "usuario-nuevo"
              ? `Nuevo usuario registrado: ${nombre}.`
              : n.tipo === "usuarios-nuevos"
                ? (n.detalle || "Se agregaron usuarios nuevos.")
                : n.tipo === "curso-autorizado"
                  ? (n.detalle || `Se autorizó el curso «${nombreCurso}».`)
                  : n.tipo === "curso-observado"
                    ? (n.detalle || `El curso «${nombreCurso}» recibió observaciones.`)
                    : n.tipo === "curso-completado"
                      ? `${nombre} terminó y aprobó el curso «${nombreCurso}».`
                      : `${nombre} terminó el contenido del curso «${nombreCurso}» y ya puede presentar su evaluación.`;
      const revisar = n.tipo === "curso-revision" && sesion.rol() === "superadmin"
        ? `<button type="button" class="btn btn-primario btn-sm" data-revisar-curso-notificacion="${n.cursoId}">Revisar curso</button>` : "";
      return `<li class="${n.leida ? "" : "notificacion-admin-nueva"}"><span class="aviso-admin-lista-icono">${iconoNotificacionAdmin(n.tipo)}</span><div class="notificacion-admin-contenido"><strong>${escaparHtml(texto)}</strong><small>${formatoFecha(n.fecha)}</small>${revisar}</div><button type="button" class="btn btn-texto btn-sm notificacion-admin-eliminar" data-eliminar-notificacion="${escaparHtml(n.id)}" aria-label="Eliminar notificación">Eliminar</button></li>`;
    }).join("")
    : '<li class="aviso-admin-vacio">' + avisoVacioAdmin() + '</li>';
  lista.querySelectorAll("[data-revisar-curso-notificacion]").forEach((boton) => {
    boton.addEventListener("click", () => irARevisionCursoAdmin(boton.dataset.revisarCursoNotificacion));
  });
  lista.querySelectorAll("[data-eliminar-notificacion]").forEach((boton) => {
    boton.addEventListener("click", async () => {
     boton.disabled = true;
     try {
       await notificacionesAdmin.eliminar(boton.dataset.eliminarNotificacion);
       listaNotificaciones = listaNotificaciones.filter((notificacion) => String(notificacion.id) !== boton.dataset.eliminarNotificacion);
       pintarNotificaciones();
       pintarCampanaAdmin();
     } catch (error) {
       boton.disabled = false;
       mostrarToastAdmin(error.message || "No se pudo eliminar la notificación.", "error");
     }
    });
  });
}

document.getElementById("btn-eliminar-notificaciones")?.addEventListener("click", async () => {
  if (!listaNotificaciones.length) return;
  const confirmar = window.confirm("¿Eliminar todas las notificaciones?");
  if (!confirmar) return;
  const boton = document.getElementById("btn-eliminar-notificaciones");
  boton.disabled = true;
  try {
    await notificacionesAdmin.eliminarTodas();
    listaNotificaciones = [];
    pintarNotificaciones();
    pintarCampanaAdmin();
  } catch (error) {
    mostrarToastAdmin(error.message || "No se pudieron eliminar las notificaciones.", "error");
  } finally {
    boton.disabled = false;
  }
});
