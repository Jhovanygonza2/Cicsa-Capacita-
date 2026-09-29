// cursos.js — Listado y acciones de cursos del programa

// ---------------------------------------------------------------
// CURSOS DEL PROGRAMA — RF-009..016
// ---------------------------------------------------------------
function pintarCursos() {
  const cuerpo = document.getElementById("tabla-cursos-admin");
  const cursosVisibles = sesion.rol() === "instructor"
    ? listaCursos.filter(c => String(c.solicitudCurso?.usuarioId ?? "") === String(sesion.usuario()?.id ?? ""))
    : listaCursos;
  cuerpo.innerHTML = cursosVisibles.map((c, i) => {
    const asignados = c.asignadoA === "Todos"
      ? "Todos los trabajadores"
      : (c.asignadoAIds || []).map((id) => listaUsuarios.find((u) => u.id === id)?.nombre || `Trabajador ${id}`).join(", ") || "Nadie";
    const modulos = c.modulos || [];
    const lecciones = modulos.reduce((total, modulo) =>
      total + (modulo.temas
        ? modulo.temas.reduce((cantidad, tema) => cantidad + (tema.subtemas || []).length, 0)
        : (modulo.lecciones || []).length), 0);
    const estaActivo = c.estado === "publicado";
    const autorSolicitud = listaUsuarios.find((usuario) => String(usuario.id) === String(c.solicitudCurso?.usuarioId ?? ""));
    const solicitudInstructor = autorSolicitud?.rol === "instructor";
    const puedeCambiarEstado = permisos.tiene("aprobarCursos") && (!solicitudInstructor || sesion.rol() === "superadmin");
    const estado = estaActivo ? (estadoTemporalCurso(c) === "cerrado" ? "Cerrado por tiempo" : estadoTemporalCurso(c) === "programado" ? "Programado" : "Activo") : c.estado === "inactivo" ? "Desactivado" : c.estado === "rechazado" ? "Cambios solicitados" : c.estado === "pendiente" ? "Pendiente de aprobación" : "Borrador";
    return `
      <article class="curso-admin-card">
        <div class="curso-admin-card-portada">
          <img src="${escaparHtml(c.thumbnail || "../assets/soldador.avif")}" alt="Portada de ${escaparHtml(c.nombre)}" loading="lazy" />
          <span class="curso-admin-numero">Curso ${String(i + 1).padStart(2, "0")}</span>
          <span class="curso-admin-estado ${estaActivo ? "publicado" : ["inactivo", "rechazado"].includes(c.estado) ? "inactivo" : "borrador"}">${estado}</span>
        </div>
        <div class="curso-admin-card-cuerpo">
          <div class="curso-admin-card-titulo">
            <div>
              <h3>${escaparHtml(c.nombre)}</h3>
              <p>${escaparHtml(c.descripcion || "Sin descripción disponible.")}</p>
            </div>
          </div>
          <div class="curso-admin-datos">
            <span><strong>${c.horas ?? "—"} h</strong> duración</span>
            <span><strong>${modulos.length}</strong> temas</span>
            <span><strong>${lecciones}</strong> subtemas</span>
          </div>
          <div class="curso-admin-asignacion"><span>Asignado a</span><strong>${escaparHtml(asignados)}</strong></div><div class="curso-admin-horario"><span>📅 Apertura</span><strong>${c.fechaInicio ? new Date(c.fechaInicio).toLocaleString("es-MX") : "Inmediata"}</strong><span>🔒 Cierre</span><strong>${c.fechaFin ? new Date(c.fechaFin).toLocaleString("es-MX") : "Sin fecha"}</strong></div>
          <div class="curso-admin-acciones"><button ${permisos.tiene("asignarCursos") ? "" : "hidden"} class="btn btn-secundario btn-sm" data-asignar-curso="${c.id}">Asignar trabajadores</button>
            <button ${permisos.tiene("editarCursos") ? "" : "hidden"} class="btn btn-secundario btn-sm" data-editar-curso="${c.id}">Editar curso</button>
            <button class="btn btn-secundario btn-sm" data-contenido="${c.id}">Ver como trabajador</button>
            <button ${puedeCambiarEstado ? "" : "hidden"} class="btn btn-texto btn-sm" data-cambiar-estado-curso="${c.id}">${estaActivo ? "Desactivar" : "Aprobar y publicar"}</button>
            <button ${sesion.rol() === "superadmin" ? "" : "hidden"} class="btn btn-texto btn-sm peligro" data-eliminar-curso="${c.id}">Eliminar</button>
          </div>
        </div>
      </article>`;
  }).join("") || `<div class="estado-vacio-admin"><strong>${sesion.rol() === "instructor" ? "Todavía no has creado cursos." : "No hay cursos todavía."}</strong><span>Usa el constructor de arriba para crear el primer curso.</span></div>`;

  cuerpo.querySelectorAll("[data-asignar-curso]").forEach(btn => btn.addEventListener("click", () => abrirAsignacionCurso(Number(btn.dataset.asignarCurso))));
  cuerpo.querySelectorAll("[data-contenido]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const c = listaCursos.find((x) => x.id == btn.dataset.contenido);
      if (!c) return;
      verCursoComoTrabajador(c);

    });
  });


  cuerpo.querySelectorAll("[data-editar-curso]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const c = listaCursos.find((x) => String(x.id) === btn.dataset.editarCurso);
      if (c) editarCursoEnFormulario(c);
    });
  });

  cuerpo.querySelectorAll("[data-cambiar-estado-curso]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const c = listaCursos.find((x) => x.id == btn.dataset.cambiarEstadoCurso);
      if (!c) return;
      const activar = c.estado !== "publicado";
      const accion = activar ? "aprobar y publicar" : "desactivar";
      await ejecutarAccionAdmin(btn, async () => {
        if (!await confirmarAdmin(`¿Deseas ${accion} el curso "${c.nombre}"?`)) return;
        const comentario = window.prompt("Comentario para el instructor (opcional):", c.solicitudCurso?.comentario || "");
        if (comentario === null) return;
        await cursos.cambiarEstado(c.id, activar ? "publicado" : "inactivo", comentario);
        mostrarToastAdmin("Estado del curso actualizado.", "exito");
        await cargarTodo();
      });
    });
  });

  cuerpo.querySelectorAll("[data-eliminar-curso]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const c = listaCursos.find((x) => x.id == btn.dataset.eliminarCurso);
      if (!c || guardandoCursoAdmin) return;
      await ejecutarAccionAdmin(btn, async () => {
        if (!await confirmarAdmin(`¿Eliminar el curso "${c.nombre}"? Esta acción no se puede deshacer.`)) return;
        await cursos.eliminar(c.id);
        if (cursoEnEdicionId === c.id) limpiarFormularioCurso();
        mostrarToastAdmin("Curso eliminado.", "exito");
        await cargarTodo();
      });
    });
  });
}

function verCursoComoTrabajador(curso) {
  const previo = document.getElementById("vista-previa-trabajador-curso");
  previo?.remove();
  const lecciones = (curso.modulos || []).map((modulo, indice) => {
    const unidades = modulo.temas?.length ? modulo.temas : [{ nombre: "Contenido del tema", subtemas: modulo.lecciones || [] }];
    return `<section class="vista-trabajador-modulo"><h3>Tema ${indice + 1}: ${escaparHtml(modulo.nombre || "Sin título")}</h3>${unidades.map((unidad, indiceUnidad) => `<section><h4>Unidad ${indiceUnidad + 1}: ${escaparHtml(unidad.nombre || "Sin título")}</h4><ol>${(unidad.subtemas || []).map((subtema, indiceSubtema) => `<li><strong>Subtema ${indiceSubtema + 1}: ${escaparHtml(subtema.nombre || "Sin título")}</strong>${subtema.informacion ? `<p>${escaparHtml(subtema.informacion)}</p>` : ""}</li>`).join("") || "<li>Sin subtemas disponibles.</li>"}</ol></section>`).join("")}</section>`;
  }).join("") || '<p class="muted">Este curso aún no tiene contenido.</p>';
  const modal = document.createElement("section");
  modal.id = "vista-previa-trabajador-curso";
  modal.className = "perfil-trabajador-modal";
  modal.innerHTML = `<div class="perfil-trabajador-fondo" data-cerrar-vista-curso></div><article class="perfil-trabajador-card vista-trabajador-curso" role="dialog" aria-modal="true" aria-labelledby="vista-curso-titulo"><button type="button" class="perfil-trabajador-cerrar" data-cerrar-vista-curso aria-label="Cerrar vista">×</button><span class="admin-bloque-kicker">Vista del trabajador</span><h2 id="vista-curso-titulo">${escaparHtml(curso.nombre)}</h2><p class="muted">${escaparHtml(curso.descripcion || "Contenido de capacitación")}</p><div class="vista-trabajador-meta"><span>${curso.horas || 0} h de duración</span><span>${(curso.modulos || []).length} temas</span></div>${lecciones}</article>`;
  document.body.appendChild(modal);
  document.body.classList.add("admin-modal-abierto");
  const cerrar = () => { modal.remove(); document.body.classList.remove("admin-modal-abierto"); };
  modal.querySelectorAll("[data-cerrar-vista-curso]").forEach((elemento) => elemento.addEventListener("click", cerrar));
  modal.querySelector(".perfil-trabajador-cerrar")?.focus();
}
