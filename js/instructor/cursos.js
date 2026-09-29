// Listado exclusivo de cursos del Instructor. No contiene acciones administrativas.
function estadoCursoInstructor(curso) {
  if (curso.estado === "publicado") return "Aprobado y publicado";
  if (curso.estado === "inactivo") return "Desactivado por administración";
  if (curso.estado === "rechazado") return "Cambios solicitados";
  if (curso.estado === "pendiente") return "Pendiente de aprobación";
  return "Borrador";
}

function pintarCursos() {
  const cuerpo = document.getElementById("tabla-cursos-instructor");
  if (!cuerpo) return;

  cuerpo.innerHTML = listaCursos.map((curso, indice) => {
    const modulos = curso.modulos || [];
    const lecciones = modulos.reduce((total, modulo) => total + (
      modulo.temas
        ? modulo.temas.reduce((cantidad, tema) => cantidad + (tema.subtemas || []).length, 0)
        : (modulo.lecciones || []).length
    ), 0);
    const estado = estadoCursoInstructor(curso);
    const claseEstado = curso.estado === "publicado" ? "publicado" : ["inactivo", "rechazado"].includes(curso.estado) ? "inactivo" : "borrador";
    const comentario = curso.solicitudCurso?.comentario
      ? `<div class="curso-admin-asignacion"><span>Comentario de administración</span><strong>${escaparHtml(curso.solicitudCurso.comentario)}</strong></div>`
      : "";

    return `
      <article class="curso-admin-card" data-curso-instructor="${curso.id}">
        <div class="curso-admin-card-portada">
          <img src="${escaparHtml(curso.thumbnail || "../assets/soldador.avif")}" alt="Portada de ${escaparHtml(curso.nombre)}" loading="lazy" />
          <span class="curso-admin-numero">Mi curso ${String(indice + 1).padStart(2, "0")}</span>
          <span class="curso-admin-estado ${claseEstado}">${escaparHtml(estado)}</span>
        </div>
        <div class="curso-admin-card-cuerpo">
          <div class="curso-admin-card-titulo"><div>
            <h3>${escaparHtml(curso.nombre)}</h3>
            <p>${escaparHtml(curso.descripcion || "Sin descripción disponible.")}</p>
          </div></div>
          <div class="curso-admin-datos">
            <span><strong>${curso.horas ?? "—"} h</strong> duración</span>
            <span><strong>${modulos.length}</strong> temas</span>
            <span><strong>${lecciones}</strong> subtemas</span>
          </div>
          ${comentario}
          <div class="curso-admin-horario">
            <span>📅 Apertura</span><strong>${curso.fechaInicio ? new Date(curso.fechaInicio).toLocaleString("es-MX") : "Al publicarse"}</strong>
            <span>🔒 Cierre</span><strong>${curso.fechaFin ? new Date(curso.fechaFin).toLocaleString("es-MX") : "Sin fecha"}</strong>
          </div>
          <div class="curso-admin-acciones">
            <button class="btn btn-primario btn-sm" data-editar-curso="${curso.id}">Editar mi curso</button>
            <button class="btn btn-secundario btn-sm" data-contenido="${curso.id}">Vista previa</button>
          </div>
        </div>
      </article>`;
  }).join("") || `
    <div class="estado-vacio-admin">
      <strong>Todavía no has creado cursos.</strong>
      <span>Usa “Nuevo curso” para crear tu primer curso. Administración lo revisará antes de publicarlo.</span>
    </div>`;

  cuerpo.querySelectorAll("[data-editar-curso]").forEach((boton) => {
    boton.addEventListener("click", () => {
      const curso = listaCursos.find((item) => String(item.id) === String(boton.dataset.editarCurso));
      if (curso) editarCursoEnFormulario(curso);
    });
  });

  cuerpo.querySelectorAll("[data-contenido]").forEach((boton) => {
    boton.addEventListener("click", () => {
      const curso = listaCursos.find((item) => String(item.id) === String(boton.dataset.contenido));
      if (curso) verCursoComoTrabajador(curso);
    });
  });
}

function verCursoComoTrabajador(curso) {
  document.getElementById("vista-previa-trabajador-curso")?.remove();
  const contenido = (curso.modulos || []).map((modulo, indice) => {
    const unidades = modulo.temas?.length ? modulo.temas : [{ nombre: "Contenido del tema", subtemas: modulo.lecciones || [] }];
    return `<section class="vista-trabajador-modulo"><h3>Tema ${indice + 1}: ${escaparHtml(modulo.nombre || "Sin título")}</h3>${unidades.map((unidad, indiceUnidad) => `<section><h4>Unidad ${indiceUnidad + 1}: ${escaparHtml(unidad.nombre || "Sin título")}</h4><ol>${(unidad.subtemas || []).map((subtema, indiceSubtema) => `<li><strong>Subtema ${indiceSubtema + 1}: ${escaparHtml(subtema.nombre || "Sin título")}</strong>${subtema.informacion ? `<p>${escaparHtml(subtema.informacion)}</p>` : ""}</li>`).join("") || "<li>Sin subtemas disponibles.</li>"}</ol></section>`).join("")}</section>`;
  }).join("") || '<p class="muted">Este curso aún no tiene contenido.</p>';

  const modal = document.createElement("section");
  modal.id = "vista-previa-trabajador-curso";
  modal.className = "perfil-trabajador-modal";
  modal.innerHTML = `<div class="perfil-trabajador-fondo" data-cerrar-vista-curso></div><article class="perfil-trabajador-card vista-trabajador-curso" role="dialog" aria-modal="true" aria-labelledby="vista-curso-titulo"><button type="button" class="perfil-trabajador-cerrar" data-cerrar-vista-curso aria-label="Cerrar vista">×</button><span class="admin-bloque-kicker">Vista previa</span><h2 id="vista-curso-titulo">${escaparHtml(curso.nombre)}</h2><p class="muted">${escaparHtml(curso.descripcion || "Contenido de capacitación")}</p><div class="vista-trabajador-meta"><span>${curso.horas || 0} h de duración</span><span>${(curso.modulos || []).length} temas</span></div>${contenido}</article>`;
  document.body.appendChild(modal);
  document.body.classList.add("admin-modal-abierto");
  const cerrar = () => { modal.remove(); document.body.classList.remove("admin-modal-abierto"); };
  modal.querySelectorAll("[data-cerrar-vista-curso]").forEach((elemento) => elemento.addEventListener("click", cerrar));
  modal.querySelector(".perfil-trabajador-cerrar")?.focus();
}
