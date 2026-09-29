// aprobacion-cursos.js — Bandeja exclusiva del Súper administrador para revisar cursos de instructores.
function cursosPendientesRevisionInstructor() {
  return listaCursos.filter((curso) => {
    if (curso.estado !== "pendiente" || !curso.solicitudCurso?.usuarioId) return false;
    const autor = listaUsuarios.find((usuario) => String(usuario.id) === String(curso.solicitudCurso.usuarioId));
    return autor?.rol === "instructor";
  }).sort((a, b) => String(b.solicitudCurso?.fecha || "").localeCompare(String(a.solicitudCurso?.fecha || "")));
}

function pintarAprobacionesCursos() {
  const contenedor = document.getElementById("lista-aprobaciones-cursos");
  const contador = document.getElementById("contador-aprobaciones-cursos");
  if (!contenedor || sesion.rol() !== "superadmin") return;
  const pendientes = cursosPendientesRevisionInstructor();
  if (contador) {
    contador.textContent = String(pendientes.length);
    contador.style.display = pendientes.length ? "inline-flex" : "none";
  }
  contenedor.innerHTML = pendientes.map((curso) => {
    const instructor = listaUsuarios.find((usuario) => String(usuario.id) === String(curso.solicitudCurso.usuarioId));
    const modulos = curso.modulos || [];
    const lecciones = modulos.reduce((total, modulo) => total + (modulo.temas
      ? modulo.temas.reduce((suma, tema) => suma + (tema.subtemas || []).length, 0)
      : (modulo.lecciones || []).length), 0);
    const fecha = curso.solicitudCurso?.fecha ? formatoFecha(curso.solicitudCurso.fecha) : "Sin fecha";
    return `<article class="revision-curso-card" id="revision-curso-${curso.id}" data-revision-curso="${curso.id}">
      <div class="revision-curso-cabecera">
        <div>
          <span class="cursos-admin-kicker">Solicitud del Instructor</span>
          <h3>${escaparHtml(curso.nombre)}</h3>
          <p>${escaparHtml(curso.descripcion || "Sin descripción disponible.")}</p>
        </div>
        <span class="badge badge-proceso">Pendiente</span>
      </div>
      <div class="revision-curso-meta">
        <span><small>Instructor</small><strong>${escaparHtml(instructor?.nombre || "Instructor")}</strong></span>
        <span><small>Enviado</small><strong>${escaparHtml(fecha)}</strong></span>
        <span><small>Duración</small><strong>${escaparHtml(String(curso.horas ?? "—"))} h</strong></span>
        <span><small>Contenido</small><strong>${modulos.length} temas · ${lecciones} subtemas</strong></span>
      </div>
      <div class="revision-curso-acciones-superiores">
        <button type="button" class="btn btn-secundario btn-sm" data-vista-revision="${curso.id}">Ver curso como trabajador</button>
      </div>
      <label class="revision-curso-comentario" for="comentario-revision-${curso.id}">
        <strong>Comentario para el Instructor</strong>
        <textarea id="comentario-revision-${curso.id}" rows="3" maxlength="2000" placeholder="Ej. Curso aprobado. / Corrige la segunda unidad y vuelve a enviarlo.">${escaparHtml(curso.solicitudCurso?.comentario || "")}</textarea>
        <small>El comentario aparecerá en “Mis solicitudes” del Instructor.</small>
      </label>
      <p class="revision-curso-mensaje" id="mensaje-revision-${curso.id}" role="status" aria-live="polite"></p>
      <div class="revision-curso-botones">
        <button type="button" class="btn btn-secundario" data-cambios-revision="${curso.id}">Solicitar cambios</button>
        <button type="button" class="btn btn-primario" data-aprobar-revision="${curso.id}">Aprobar y publicar</button>
      </div>
    </article>`;
  }).join("") || `<div class="estado-vacio-admin revision-curso-vacio"><strong>No hay cursos pendientes de aprobación.</strong><span>Cuando un Instructor envíe un curso, aparecerá aquí y recibirás una notificación en la campana.</span></div>`;

  contenedor.querySelectorAll("[data-vista-revision]").forEach((boton) => boton.addEventListener("click", () => {
    const curso = listaCursos.find((item) => String(item.id) === boton.dataset.vistaRevision);
    if (curso) verCursoComoTrabajador(curso);
  }));
  contenedor.querySelectorAll("[data-aprobar-revision]").forEach((boton) => boton.addEventListener("click", () => resolverRevisionCurso(boton, "publicado")));
  contenedor.querySelectorAll("[data-cambios-revision]").forEach((boton) => boton.addEventListener("click", () => resolverRevisionCurso(boton, "rechazado")));
}

async function resolverRevisionCurso(boton, estado) {
  if (sesion.rol() !== "superadmin") return;
  const id = Number(boton.dataset.aprobarRevision || boton.dataset.cambiosRevision);
  const curso = listaCursos.find((item) => Number(item.id) === id);
  if (!curso) return;
  const textarea = document.getElementById(`comentario-revision-${id}`);
  const mensaje = document.getElementById(`mensaje-revision-${id}`);
  const comentario = String(textarea?.value || "").trim();
  if (estado === "rechazado" && comentario.length < 3) {
    if (mensaje) mensaje.textContent = "Escribe un comentario indicando qué debe corregir el Instructor.";
    textarea?.focus();
    return;
  }
  const accion = estado === "publicado" ? "aprobar y publicar" : "solicitar cambios en";
  if (!await confirmarAdmin(`¿Deseas ${accion} el curso “${curso.nombre}”?`)) return;
  const tarjeta = boton.closest(".revision-curso-card");
  tarjeta?.querySelectorAll("button, textarea").forEach((control) => { control.disabled = true; });
  if (mensaje) mensaje.textContent = "Guardando revisión…";
  try {
    await cursos.cambiarEstado(id, estado, comentario);
    mostrarToastAdmin(estado === "publicado" ? "Curso aprobado y publicado." : "Se solicitaron cambios al Instructor.", "exito");
    await cargarTodo();
  } catch (error) {
    tarjeta?.querySelectorAll("button, textarea").forEach((control) => { control.disabled = false; });
    if (mensaje) mensaje.textContent = error.message || "No se pudo guardar la revisión.";
  }
}
