// datetime-local requiere fecha y hora locales, sin sufijo UTC.
function fechaParaEditorCurso(valor) {
  if (!valor) return "";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "";
  const dos = n => String(n).padStart(2, "0");
  return fecha.getFullYear() + "-" + dos(fecha.getMonth() + 1) + "-" + dos(fecha.getDate())
    + "T" + dos(fecha.getHours()) + ":" + dos(fecha.getMinutes());
}

let solicitudEditorCurso = 0;
let guardandoCursoAdmin = false;

// editor-curso.js — Constructor de unidades/temas/subtemas del curso, vista previa de media y formulario de curso


function limpiarFormularioCurso() {
  solicitudEditorCurso += 1;
  const formulario = document.getElementById("form-curso");
  formulario.reset();
  cursoEnEdicionId = null;
  examenPendiente = null;
  evaluacionPendiente = null;
  document.getElementById("btn-agregar-examen-estructura").textContent = "+ Configurar examen final";
  document.getElementById("btn-guardar-curso").textContent = "+ Agregar curso";
  document.getElementById("btn-cancelar-edicion").classList.add("oculto");
  document.getElementById("curso-editor-titulo").textContent = "Crear nuevo curso";
  document.getElementById("curso-editor-estado").textContent = "Borrador nuevo";
  document.getElementById("nc-imagen-preview").textContent = "Sin imagen seleccionada";
  document.getElementById("nc-video-preview").textContent = "Sin video seleccionado";
  document.querySelectorAll(".curso-media-preview").forEach((preview) => preview.classList.remove("tiene-archivo"));
  document.getElementById("constructor-modulos").replaceChildren();
  pintarAsignacionTrabajadores([]);
  actualizarResumenEditor();
}

function numerarEstructuraAprendizaje() {
  const etiquetar = (contenedor, selectorEtiqueta, selectorCampo, nombre, id) => {
    const etiqueta = contenedor.querySelector(selectorEtiqueta);
    const campo = contenedor.querySelector(selectorCampo);
    if (!etiqueta || !campo) return;
    etiqueta.textContent = nombre;
    etiqueta.htmlFor = id;
    campo.id = id;
    campo.placeholder = nombre;
  };
  document.querySelectorAll("#constructor-modulos > .editor-modulo").forEach((unidad, i) => {
    etiquetar(unidad, "[data-indice-unidad]", ".editor-modulo-nombre", `Tema ${i + 1}`, `unidad-${i + 1}-nombre`);
    unidad.querySelectorAll(":scope > .editor-temas > .editor-tema").forEach((tema, j) => {
      etiquetar(tema, "[data-indice-tema]", ".editor-tema-nombre", `Unidad ${j + 1}`, `unidad-${i + 1}-tema-${j + 1}-nombre`);
      tema.querySelectorAll(":scope > .editor-subtemas > .editor-subtema").forEach((subtema, k) => {
        etiquetar(subtema, "[data-indice-subtema]", ".editor-subtema-nombre", `Subtema ${k + 1}`, `unidad-${i + 1}-tema-${j + 1}-subtema-${k + 1}-nombre`);
      });
    });
  });
}
function actualizarResumenEditor() {
  numerarEstructuraAprendizaje();
  const resumen = document.getElementById("curso-editor-resumen");
  const modulos = document.querySelectorAll("#constructor-modulos > .editor-modulo").length;
  const asignacion = document.getElementById("nc-asignacion-trabajadores");
  const seleccion = asignacion?._obtenerSeleccion?.();
  if (sesion.rol() === "instructor") {
    if (resumen) resumen.textContent = `${modulos} tema${modulos === 1 ? "" : "s"} · pendiente de aprobación`;
    return;
  }
  const todos = seleccion?.todos;
  const trabajadores = todos
    ? "todos los trabajadores"
    : `${seleccion?.ids.length || 0} trabajadores asignados`;
  if (resumen) resumen.textContent = `${modulos} tema${modulos === 1 ? "" : "s"} · ${trabajadores}`;
}

function pintarAsignacionTrabajadores(asignados, todosExplicito) {
  const contenedor = document.getElementById("nc-asignacion-trabajadores");
  const selectorArea = document.getElementById("nc-asignacion-area");
  if (!contenedor || !selectorArea) return;

  // Actualiza los trabajadores sin perder la selección ni los filtros del editor.
  const conservar = asignados === undefined && !!contenedor._obtenerSeleccion;
  const anterior = conservar ? contenedor._obtenerSeleccion() : null;
  const areaAnterior = conservar ? selectorArea.value : "";
  const consultaAnterior = conservar ? contenedor.querySelector(".asignacion-buscador")?.value || "" : "";
  asignados = anterior ? anterior.ids : asignados || [];
  if (anterior) todosExplicito = anterior.todos;
  const trabajadores = listaUsuarios
    .filter((usuario) => usuario.rol === "trabajador")
    .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es"));

  const areas = [...new Set(trabajadores.map((u) => String(u.area || "Sin asignar").trim() || "Sin asignar"))]
    .sort((a, b) => a.localeCompare(b, "es"));

  const seleccionados = new Set(
    (Array.isArray(asignados) ? asignados : [])
      .filter((id) => id !== "Todos")
      .map((id) => String(id))
  );
  let todosGlobal = todosExplicito ?? (!asignados.length || asignados.includes("Todos"));
  const disponibles = new Set(trabajadores.map(u => String(u.id)));
  for (const id of seleccionados) if (!disponibles.has(id)) seleccionados.delete(id);
  if (todosGlobal) trabajadores.forEach(u => seleccionados.add(String(u.id)));
  let consulta = consultaAnterior;
  contenedor._obtenerSeleccion = () => ({ todos: todosGlobal, ids: [...seleccionados].map(Number).filter(Number.isFinite) });

  selectorArea.innerHTML = `<option value="">Selecciona un área</option>${areas.map((area) =>
    `<option value="${escaparHtml(area)}">${escaparHtml(area)}</option>`
  ).join("")}`;

  // Al editar un curso, si los trabajadores asignados pertenecen a una sola área,
  // la mostramos automáticamente. Si pertenecen a varias, dejamos el filtro vacío.
  const areasAsignados = [...new Set(trabajadores
    .filter((u) => seleccionados.has(String(u.id)))
    .map((u) => String(u.area || "Sin asignar").trim() || "Sin asignar"))];
  if (areasAsignados.length === 1 && !todosGlobal) selectorArea.value = areasAsignados[0];
  if (conservar) selectorArea.value = areas.includes(areaAnterior) ? areaAnterior : "";

  const obtenerFiltrados = () => {
    const area = selectorArea.value;
    return trabajadores.filter((usuario) => {
      const coincideArea = !area || (String(usuario.area || "Sin asignar").trim() || "Sin asignar") === area;
      const coincideBusqueda = !consulta || String(usuario.nombre || "").toLowerCase().includes(consulta);
      return coincideArea && coincideBusqueda;
    });
  };

  const renderizar = (mostrarForzado = false) => {
    const areaSeleccionada = selectorArea.value;
    const mostrar = Boolean(areaSeleccionada) || Boolean(consulta);
    const trabajadoresVisibles = obtenerFiltrados();
    const todosVisiblesSeleccionados = trabajadoresVisibles.length > 0 && trabajadoresVisibles.every((u) => seleccionados.has(String(u.id)));
    contenedor.classList.toggle("selector-asignacion-oculto", !mostrar);

    contenedor.innerHTML = `
      <div class="asignacion-cabecera-lista">
        <input class="asignacion-buscador" type="search" placeholder="Buscar trabajador..." aria-label="Buscar trabajador para asignar" autocomplete="off" value="${escaparHtml(consulta)}" />
        <span class="asignacion-contador">${mostrar ? `${trabajadoresVisibles.length} trabajador${trabajadoresVisibles.length === 1 ? "" : "es"}` : "Selecciona un área o busca"}</span>
      </div>
      <div class="asignacion-lista-contenido" ${mostrar ? "" : "hidden"}>
        <label class="opcion-asignacion opcion-asignacion-todos">
          <input type="checkbox" value="Todos" ${todosVisiblesSeleccionados || (todosGlobal && !areaSeleccionada) ? "checked" : ""} data-asignacion-todos />
          <strong>${areaSeleccionada ? "Todos los trabajadores de esta área" : "Todos los trabajadores"}</strong>
        </label>
        <div class="lista-opciones-asignacion">
          ${trabajadoresVisibles.map((usuario) => `
            <label class="opcion-asignacion" data-trabajador="${escaparHtml(String(usuario.id))}">
              <input type="checkbox" value="${escaparHtml(String(usuario.id))}" ${seleccionados.has(String(usuario.id)) ? "checked" : ""} data-asignacion-trabajador />
              <span>${escaparHtml(usuario.nombre)}</span>
            </label>
          `).join("") || `<div class="asignacion-estado-vacio"><strong>No hay trabajadores</strong><small>No hay trabajadores que coincidan con el área o la búsqueda.</small></div>`}
        </div>
      </div>
      ${!mostrar ? `<div class="asignacion-hint-oculto"><span>👥</span><span>Los trabajadores se mostrarán al seleccionar un área o escribir una búsqueda.</span></div>` : ""}`;

    const buscador = contenedor.querySelector(".asignacion-buscador");
    buscador?.addEventListener("input", (evento) => {
      consulta = evento.target.value.trim().toLowerCase();
      renderizar(true);
      contenedor.querySelector(".asignacion-buscador")?.focus();
      const input = contenedor.querySelector(".asignacion-buscador");
      if (input) input.setSelectionRange(input.value.length, input.value.length);
    });

    contenedor.querySelector("[data-asignacion-todos]")?.addEventListener("change", (evento) => {
      const visibles = obtenerFiltrados();
      visibles.forEach((usuario) => {
        if (evento.target.checked) seleccionados.add(String(usuario.id));
        else seleccionados.delete(String(usuario.id));
      });
      todosGlobal = !selectorArea.value && evento.target.checked && seleccionados.size === trabajadores.length;
      renderizar(true);
      actualizarResumenEditor();
    });

    contenedor.querySelectorAll("[data-asignacion-trabajador]").forEach((input) => {
      input.addEventListener("change", (evento) => {
        if (evento.target.checked) seleccionados.add(String(evento.target.value));
        else seleccionados.delete(String(evento.target.value));
        todosGlobal = !selectorArea.value && seleccionados.size === trabajadores.length;
        renderizar(true);
        actualizarResumenEditor();
      });
    });
  };

  selectorArea.onchange = () => {
    consulta = "";
    renderizar(true);
    actualizarResumenEditor();
  };

  // El buscador se mantiene visible como única entrada cuando no hay filtro.
  renderizar(false);
  actualizarResumenEditor();

  // Guardamos la selección en el contenedor para que obtenerAsignacionCurso la lea.
  contenedor._obtenerSeleccion = () => ({
    todos: todosGlobal,
    ids: [...seleccionados].map(Number).filter(Number.isFinite)
  });
}

function obtenerAsignacionCurso() {
  const contenedor = document.getElementById("nc-asignacion-trabajadores");
  const seleccion = contenedor?._obtenerSeleccion?.();
  if (seleccion) {
    return seleccion.todos
      ? { asignadoA: "Todos", asignadoAIds: [] }
      : { asignadoA: seleccion.ids.join(","), asignadoAIds: seleccion.ids };
  }
  const ids = [...(contenedor?.querySelectorAll("[data-asignacion-trabajador]:checked") || [])]
    .map((input) => Number(input.value))
    .filter(Number.isFinite);
  return { asignadoA: ids.join(","), asignadoAIds: ids };
}

async function editarCursoEnFormulario(curso) {
  permisos.exigir("editarCursos");
  if (guardandoCursoAdmin) return;
  const solicitud = ++solicitudEditorCurso;
  let examenGuardado;
  try {
    examenGuardado = await evaluaciones.obtenerPorCursoTipo(curso.id, "examen");
  } catch (error) {
    if (solicitud === solicitudEditorCurso) mostrarToastAdmin(error.message || "No se pudo abrir el curso.", "error");
    return;
  }
  if (solicitud !== solicitudEditorCurso || guardandoCursoAdmin) return;
  document.getElementById("nc-imagen").value = "";
  document.getElementById("nc-video").value = "";
  const panelAlta = document.getElementById("alta-curso");
  if (panelAlta) panelAlta.open = true;
  document.getElementById("alta-curso").open = true;
  cursoEnEdicionId = curso.id;
  document.getElementById("curso-editor-titulo").textContent = `Editando: ${curso.nombre}`;
  document.getElementById("curso-editor-estado").textContent = "Edición activa";
  document.getElementById("nc-nombre").value = curso.nombre || "";
  document.getElementById("nc-horas").value = curso.horas || "";
  document.getElementById("nc-descripcion").value = curso.descripcion || "";
  document.getElementById("nc-fecha-inicio").value = fechaParaEditorCurso(curso.fechaInicio);
  document.getElementById("nc-fecha-fin").value = fechaParaEditorCurso(curso.fechaFin);
  pintarMediaExistente(
    document.getElementById("nc-imagen-preview"),
    curso.thumbnail,
    "img",
    "Sin imagen seleccionada"
  );
  pintarMediaExistente(
    document.getElementById("nc-video-preview"),
    curso.video,
    "video",
    "Sin video seleccionado"
  );
  pintarAsignacionTrabajadores(curso.asignadoAIds || [], curso.asignadoA === "Todos");
  // La Evaluación del curso ya no se configura por separado: toma 5 preguntas
  // del banco del Examen final. Solo cargamos y editamos dicho banco.
  evaluacionPendiente = null;
  examenPendiente = examenGuardado || null;
  document.getElementById("btn-agregar-examen-estructura").textContent = examenGuardado ? "Editar examen final" : "+ Configurar examen final";
  const constructor = document.getElementById("constructor-modulos");
  constructor.replaceChildren();
  (curso.modulos || []).forEach((modulo) => {
    agregarModuloEditor();
    const moduloNuevo = constructor.lastElementChild;
    moduloNuevo.querySelector(".editor-modulo-nombre").value = modulo.nombre || "";
    moduloNuevo.dataset.mediaImage = modulo.imagen || modulo.image || "";
    moduloNuevo.dataset.mediaVideo = modulo.video || "";
    pintarMediaExistente(
      moduloNuevo.querySelector("[data-modulo-imagen-preview]"),
      moduloNuevo.dataset.mediaImage,
      "img",
      "Sin imagen del tema"
    );
    pintarMediaExistente(
      moduloNuevo.querySelector("[data-modulo-video-preview]"),
      moduloNuevo.dataset.mediaVideo,
      "video",
      "Sin video del tema"
    );
    const temas = modulo.temas || [{ nombre: "Contenido del tema", subtemas: modulo.lecciones || [] }];
    const temasContenedor = moduloNuevo.querySelector(".editor-temas");
    temasContenedor.replaceChildren();
    temas.forEach((tema) => {
      agregarTemaEditor(temasContenedor);
      const temaNuevo = temasContenedor.lastElementChild;
      temaNuevo.querySelector(".editor-tema-nombre").value = tema.nombre || "";
      temaNuevo.dataset.mediaImage = tema.imagen || tema.image || "";
      temaNuevo.dataset.mediaVideo = tema.video || "";
      pintarMediaExistente(temaNuevo.querySelector("[data-tema-imagen-preview]"), temaNuevo.dataset.mediaImage, "img", "Sin imagen de unidad");
      pintarMediaExistente(temaNuevo.querySelector("[data-tema-video-preview]"), temaNuevo.dataset.mediaVideo, "video", "Sin video de unidad");
      const subtemasContenedor = temaNuevo.querySelector(".editor-subtemas");
      subtemasContenedor.replaceChildren();
      (tema.subtemas || []).forEach((subtema) => {
        agregarSubtemaEditor(subtemasContenedor);
        const subtemaNuevo = subtemasContenedor.lastElementChild;
        subtemaNuevo.querySelector(".editor-subtema-nombre").value = subtema.nombre || "";
        subtemaNuevo.querySelector(".editor-subtema-informacion").value = subtema.informacion || "";
        subtemaNuevo.dataset.leccionId = subtema.id || "";
        subtemaNuevo.dataset.mediaUrl = subtema.url || "";
        aplicarTipoSubtema(subtemaNuevo, subtema.tipo || "texto");
      });
      actualizarResumenTema(temaNuevo);
    });
    actualizarResumenModulo(moduloNuevo);
  });
  document.getElementById("btn-guardar-curso").textContent = "Guardar cambios";
  document.getElementById("btn-cancelar-edicion").classList.remove("oculto");
  actualizarResumenEditor();
  document.getElementById(sesion.rol() === "instructor" ? "cursos-instructor" : "cursos-admin")?.scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById("nc-nombre").focus();
}

function configurarVistaPreviaMedia() {
  const imagen = document.getElementById("nc-imagen");
  const video = document.getElementById("nc-video");
  const imagenPreview = document.getElementById("nc-imagen-preview");
  const videoPreview = document.getElementById("nc-video-preview");

  imagen?.addEventListener("change", () => {
    const archivo = imagen.files?.[0];
    imagenPreview.replaceChildren();
    if (archivo) {
      const vista = document.createElement("img");
      vista.src = URL.createObjectURL(archivo);
      vista.alt = "Vista previa de la portada";
      imagenPreview.append(vista, document.createTextNode(`${archivo.name} listo para cargar`));
    } else {
      imagenPreview.textContent = "Sin imagen seleccionada";
    }
    imagenPreview.classList.toggle("tiene-archivo", Boolean(archivo));
  });
  video?.addEventListener("change", () => {
    const archivo = video.files?.[0];
    videoPreview.replaceChildren();
    if (archivo) {
      const vista = document.createElement("video");
      vista.src = URL.createObjectURL(archivo);
      vista.muted = true;
      vista.controls = true;
      videoPreview.append(vista, document.createTextNode(`${archivo.name} listo para cargar`));
    } else {
      videoPreview.textContent = "Sin video seleccionado";
    }
    videoPreview.classList.toggle("tiene-archivo", Boolean(archivo));
  });
}

function pintarMediaExistente(contenedor, url, tipo, texto) {
  contenedor.replaceChildren();
  if (!url) {
    contenedor.textContent = texto;
    contenedor.classList.remove("tiene-archivo");
    return;
  }
  const vista = document.createElement(tipo);
  vista.src = url;
  vista.alt = tipo === "img" ? "Vista previa de la portada actual" : "";
  if (tipo === "video") {
    vista.muted = true;
    vista.controls = true;
  }
  contenedor.append(vista, document.createTextNode("Archivo actual"));
  contenedor.classList.add("tiene-archivo");
}

function agregarModuloEditor() {
  const contenedor = document.getElementById("constructor-modulos");
  const modulo = document.createElement("div");
  modulo.className = "editor-modulo";
  modulo.innerHTML = `
    <div class="editor-modulo-cabecera">
      <button type="button" class="editor-modulo-toggle" data-toggle-modulo aria-expanded="true" title="Contraer tema">⌃</button>
      <label class="editor-modulo-indice" data-indice-unidad>Tema 1</label>
      <input type="text" class="editor-modulo-nombre" placeholder="Ej. Identificación de riesgos" required />
      <span class="editor-modulo-contador">0 unidades</span>
      <button type="button" class="btn btn-texto editor-eliminar" data-eliminar-modulo>Eliminar</button>
    </div>
    <div class="editor-media-nivel">
      <div class="editor-media-nivel-campo">
        <label>Imagen del tema</label>
        <input type="file" accept="image/*" data-modulo-imagen />
        <div class="editor-media-nivel-preview" data-modulo-imagen-preview>Sin imagen del tema</div>
      </div>
      <div class="editor-media-nivel-campo">
        <label>Video del tema (opcional, máx. 25 MB)</label>
        <input type="file" accept="video/*" data-modulo-video />
        <div class="editor-media-nivel-preview" data-modulo-video-preview>Sin video del tema</div>
      </div>
    </div>
    <div class="editor-temas"></div>
    <button type="button" class="btn btn-secundario btn-sm" data-agregar-tema>+ Agregar unidad</button>
  `;
  contenedor.appendChild(modulo);
  modulo.querySelector("[data-modulo-imagen]")?.addEventListener("change", async () => {
    const archivo = modulo.querySelector("[data-modulo-imagen]").files?.[0];
    if (!archivo) return;
    try { modulo.dataset.mediaImage = await leerArchivoComoDataUrl(archivo, 5); pintarMediaExistente(modulo.querySelector("[data-modulo-imagen-preview]"), modulo.dataset.mediaImage, "img", "Sin imagen del tema"); }
    catch (error) { mostrarToastAdmin(error.message, "error"); }
  });
  modulo.querySelector("[data-modulo-video]")?.addEventListener("change", async () => {
    const archivo = modulo.querySelector("[data-modulo-video]").files?.[0];
    if (!archivo) return;
    try { modulo.dataset.mediaVideo = await leerArchivoComoDataUrl(archivo, 25); pintarMediaExistente(modulo.querySelector("[data-modulo-video-preview]"), modulo.dataset.mediaVideo, "video", "Sin video del tema"); }
    catch (error) { mostrarToastAdmin(error.message, "error"); }
  });
  agregarTemaEditor(modulo.querySelector(".editor-temas"));
  actualizarResumenModulo(modulo);
  actualizarResumenEditor();
}

function agregarTemaEditor(contenedor) {
  const tema = document.createElement("div");
  tema.className = "editor-tema";
  tema.innerHTML = `
    <div class="editor-tema-cabecera">
      <label class="editor-modulo-indice" data-indice-tema>Unidad 1</label>
      <input type="text" class="editor-tema-nombre" placeholder="Ej. Conceptos principales" required />
      <span class="editor-tema-contador">0 subtemas</span>
      <button type="button" class="btn btn-texto editor-eliminar" data-eliminar-tema>Eliminar</button>
    </div>
    <div class="editor-media-nivel editor-media-tema">
      <div class="editor-media-nivel-campo">
        <label>Imagen de la unidad</label>
        <input type="file" accept="image/*" data-tema-imagen />
        <div class="editor-media-nivel-preview" data-tema-imagen-preview>Sin imagen de unidad</div>
      </div>
      <div class="editor-media-nivel-campo">
        <label>Video de la unidad (opcional, máx. 25 MB)</label>
        <input type="file" accept="video/*" data-tema-video />
        <div class="editor-media-nivel-preview" data-tema-video-preview>Sin video de unidad</div>
      </div>
    </div>
    <div class="editor-subtemas"></div>
    <button type="button" class="btn btn-secundario btn-sm" data-agregar-subtema>+ Agregar subtema</button>
  `;
  contenedor.appendChild(tema);
  tema.querySelector("[data-tema-imagen]")?.addEventListener("change", async () => {
    const archivo = tema.querySelector("[data-tema-imagen]").files?.[0];
    if (!archivo) return;
    try { tema.dataset.mediaImage = await leerArchivoComoDataUrl(archivo, 5); pintarMediaExistente(tema.querySelector("[data-tema-imagen-preview]"), tema.dataset.mediaImage, "img", "Sin imagen de unidad"); }
    catch (error) { mostrarToastAdmin(error.message, "error"); }
  });
  tema.querySelector("[data-tema-video]")?.addEventListener("change", async () => {
    const archivo = tema.querySelector("[data-tema-video]").files?.[0];
    if (!archivo) return;
    try { tema.dataset.mediaVideo = await leerArchivoComoDataUrl(archivo, 25); pintarMediaExistente(tema.querySelector("[data-tema-video-preview]"), tema.dataset.mediaVideo, "video", "Sin video de unidad"); }
    catch (error) { mostrarToastAdmin(error.message, "error"); }
  });
  agregarSubtemaEditor(tema.querySelector(".editor-subtemas"));
  actualizarResumenTema(tema);
}

function agregarSubtemaEditor(contenedor) {
  const fila = document.createElement("div");
  fila.className = "editor-subtema";
  fila.innerHTML = `
    <div class="editor-subtema-campos">
      <label class="editor-modulo-indice" data-indice-subtema>Subtema 1</label>
      <input type="text" class="editor-subtema-nombre" placeholder="Nombre del subtema" required />
      <div class="editor-subtema-tipo-grupo" role="tablist" aria-label="Tipo de contenido del subtema">
        <button type="button" class="editor-subtema-tipo-boton" data-tipo-subtema="texto">📝 Texto</button>
        <button type="button" class="editor-subtema-tipo-boton" data-tipo-subtema="video">🎬 Video</button>
        <button type="button" class="editor-subtema-tipo-boton" data-tipo-subtema="imagen">🖼️ Imagen</button>
        <button type="button" class="editor-subtema-tipo-boton" data-tipo-subtema="documento">Documento PDF</button>
      </div>
      <input type="hidden" class="editor-subtema-tipo" value="texto" />
      <textarea class="editor-subtema-informacion" placeholder="Texto o descripción del subtema" aria-label="Información del subtema" rows="3"></textarea>
      <label class="editor-subtema-recurso">
        <span>Archivo del subtema (imagen, video o PDF)</span>
        <input type="file" class="editor-subtema-archivo" accept="image/*,video/*" aria-label="Archivo del subtema" />
        <div class="editor-subtema-preview">Sin archivo seleccionado</div>
      </label>
    </div>
    <button type="button" class="btn btn-texto editor-eliminar" data-eliminar-subtema>Eliminar</button>
  `;
  contenedor.appendChild(fila);
  fila.querySelectorAll("[data-tipo-subtema]").forEach((boton) => {
    boton.addEventListener("click", () => aplicarTipoSubtema(fila, boton.dataset.tipoSubtema));
  });
  fila.querySelector(".editor-subtema-archivo").addEventListener("change", () => {
    fila.dataset.mediaUrl = "";
    actualizarVistaSubtema(fila);
  });
  aplicarTipoSubtema(fila, "texto");
  numerarEstructuraAprendizaje();
}

function aplicarTipoSubtema(fila, tipo) {
  const tipoInput = fila.querySelector(".editor-subtema-tipo");
  const archivo = fila.querySelector(".editor-subtema-archivo");
  const recurso = fila.querySelector(".editor-subtema-recurso");
  if (!tipoInput || !archivo || !recurso) return;
  tipoInput.value = tipo;
  fila.querySelectorAll("[data-tipo-subtema]").forEach((boton) => {
    const activo = boton.dataset.tipoSubtema === tipo;
    boton.classList.toggle("activo", activo);
    boton.setAttribute("aria-pressed", String(activo));
  });
  archivo.accept = tipo === "documento" ? "application/pdf,.pdf" : tipo === "video" ? "video/*" : tipo === "imagen" ? "image/*" : "image/*,video/*";
  recurso.hidden = tipo === "texto";
  actualizarVistaSubtema(fila);
}

function actualizarVistaSubtema(fila) {
  const tipo = fila.querySelector(".editor-subtema-tipo")?.value || "texto";
  const archivo = fila.querySelector(".editor-subtema-archivo");
  const preview = fila.querySelector(".editor-subtema-preview");
  if (!archivo || !preview) return;
  const archivoSeleccionado = archivo.files?.[0];
  const urlVista = archivoSeleccionado ? URL.createObjectURL(archivoSeleccionado) : fila.dataset.mediaUrl || "";
  preview.replaceChildren();
  if (tipo !== "texto" && urlVista) {
    const vista = document.createElement(tipo === "documento" ? "a" : tipo === "video" ? "video" : "img");
    if (tipo === "documento") {vista.href=urlVista; vista.textContent="Ver documento PDF"; vista.target="_blank"; vista.rel="noopener";}
    vista.src = urlVista;
    if (tipo === "video") {
      vista.muted = true;
      vista.controls = true;
    } else {
      vista.alt = "Vista previa del subtema";
    }
    preview.appendChild(vista);
  }
  const etiqueta = document.createElement("small");
  etiqueta.textContent = archivoSeleccionado
    ? `${archivoSeleccionado.name} listo para guardar`
    : fila.dataset.mediaUrl
      ? "Archivo actual conservado"
      : tipo === "texto"
        ? "Este subtema es solo texto"
        : "Sin archivo seleccionado";
  preview.appendChild(etiqueta);
  preview.classList.toggle("tiene-archivo", Boolean(urlVista));
}

function actualizarResumenTema(tema) {
  const contador = tema.querySelector(".editor-tema-contador");
  if (!contador) return;
  const total = tema.querySelectorAll(":scope > .editor-subtemas > .editor-subtema").length;
  contador.textContent = `${total} subtema${total === 1 ? "" : "s"}`;
}

function actualizarResumenModulo(modulo) {
  const contador = modulo.querySelector(".editor-modulo-contador");
  if (!contador) return;
  const total = modulo.querySelectorAll(":scope > .editor-temas > .editor-tema").length;
  contador.textContent = `${total} unidad${total === 1 ? "" : "es"}`;
}

async function construirModulosDesdeEditor() {
  let siguienteId = Math.max(0, ...listaCursos.flatMap(obtenerLeccionesCurso).map(l => Number(l.id) || 0)) + 1;
  const modulos = [];
  for (const [indiceModulo, modulo] of [...document.querySelectorAll("#constructor-modulos > .editor-modulo")].entries()) {
    const imagenModuloArchivo = modulo.querySelector("[data-modulo-imagen]")?.files?.[0];
    const videoModuloArchivo = modulo.querySelector("[data-modulo-video]")?.files?.[0];
    const imagenModulo = imagenModuloArchivo ? await leerArchivoComoDataUrl(imagenModuloArchivo, 5) : (modulo.dataset.mediaImage || "");
    const videoModulo = videoModuloArchivo ? await leerArchivoComoDataUrl(videoModuloArchivo, 25) : (modulo.dataset.mediaVideo || "");
    const temas = [];
    for (const tema of [...modulo.querySelectorAll(":scope > .editor-temas > .editor-tema")]) {
      const imagenTemaArchivo = tema.querySelector("[data-tema-imagen]")?.files?.[0];
      const videoTemaArchivo = tema.querySelector("[data-tema-video]")?.files?.[0];
      const imagenTema = imagenTemaArchivo ? await leerArchivoComoDataUrl(imagenTemaArchivo, 5) : (tema.dataset.mediaImage || "");
      const videoTema = videoTemaArchivo ? await leerArchivoComoDataUrl(videoTemaArchivo, 25) : (tema.dataset.mediaVideo || "");
      const subtemas = [];
      for (const subtema of [...tema.querySelectorAll(":scope > .editor-subtemas > .editor-subtema")]) {
        const tipo = subtema.querySelector(".editor-subtema-tipo").value;
        const archivo = subtema.querySelector(".editor-subtema-archivo").files?.[0];
        if (tipo === "documento" && archivo && archivo.type !== "application/pdf" && !/\.pdf$/i.test(archivo.name)) throw new Error("Selecciona un documento PDF.");
        const url = tipo === "texto"
          ? ""
          : archivo ? await leerArchivoComoDataUrl(archivo, tipo === "video" ? 25 : 5) : subtema.dataset.mediaUrl || "";
        subtemas.push({
          id: Number(subtema.dataset.leccionId) || siguienteId++,
          nombre: subtema.querySelector(".editor-subtema-nombre").value.trim(),
          informacion: subtema.querySelector(".editor-subtema-informacion").value.trim(),
          tipo,
          url,
        });
      }
      temas.push({ nombre: tema.querySelector(".editor-tema-nombre").value.trim(), imagen: imagenTema, video: videoTema, subtemas });
    }
    modulos.push({ id: indiceModulo + 1, nombre: modulo.querySelector(".editor-modulo-nombre").value.trim(), imagen: imagenModulo, video: videoModulo, temas });
  }
  return modulos;
}

document.getElementById("btn-agregar-modulo")?.addEventListener("click", agregarModuloEditor);
document.getElementById("btn-agregar-examen-estructura")?.addEventListener("click", () => {
  const opciones = {
    nombre: document.getElementById("nc-nombre").value.trim() || "Nuevo curso",
    tipo: "examen",
    evaluacion: examenPendiente || { minimaAprobatoria: 70, preguntas: [] },
  };
  administrarExamen(cursoEnEdicionId || null, opciones);
});
document.getElementById("constructor-modulos")?.addEventListener("click", (e) => {
  const boton = e.target.closest("button");
  if (!boton) return;
  if (boton.matches("[data-toggle-modulo]")) {
    const modulo = boton.closest(".editor-modulo");
    const abierto = modulo.classList.toggle("colapsado") === false;
    boton.setAttribute("aria-expanded", String(abierto));
    boton.title = abierto ? "Contraer tema" : "Expandir tema";
    return;
  }
  if (boton.matches("[data-agregar-tema]")) {
    agregarTemaEditor(boton.previousElementSibling);
    actualizarResumenModulo(boton.closest(".editor-modulo"));
  }
  if (boton.matches("[data-agregar-subtema]")) {
    agregarSubtemaEditor(boton.previousElementSibling);
    actualizarResumenTema(boton.closest(".editor-tema"));
    actualizarResumenModulo(boton.closest(".editor-modulo"));
  }
  if (boton.matches("[data-eliminar-modulo]")) boton.closest(".editor-modulo").remove();
  if (boton.matches("[data-eliminar-tema]")) {
    const modulo = boton.closest(".editor-modulo");
    boton.closest(".editor-tema").remove();
    actualizarResumenModulo(modulo);
  }
  if (boton.matches("[data-eliminar-subtema]")) {
    const tema = boton.closest(".editor-tema");
    const modulo = boton.closest(".editor-modulo");
    boton.closest(".editor-subtema").remove();
    actualizarResumenTema(tema);
    actualizarResumenModulo(modulo);
  }
  actualizarResumenEditor();
});


document.getElementById("form-curso").addEventListener("submit", async (e) => {
  e.preventDefault();
  const botonEnviar = e.target.querySelector('[type="submit"]');
  if (botonEnviar.disabled) return;
  botonEnviar.disabled = true;
  guardandoCursoAdmin = true;
  solicitudEditorCurso += 1;
  const nombre = document.getElementById("nc-nombre").value.trim();
  const horas = Number(document.getElementById("nc-horas").value);
  const descripcion = document.getElementById("nc-descripcion").value.trim();
  const fechaInicio = document.getElementById("nc-fecha-inicio")?.value || "";
  const fechaFin = document.getElementById("nc-fecha-fin")?.value || "";
  if (fechaInicio && fechaFin && new Date(fechaFin) <= new Date(fechaInicio)) { mostrarToastAdmin("La fecha de cierre debe ser posterior a la fecha de apertura.", "error"); botonEnviar.disabled = false; guardandoCursoAdmin = false; return; }
  const totalPreguntasExamen = examenPendiente?.preguntas?.length || 0;
  if (totalPreguntasExamen < 5 || totalPreguntasExamen > 25) {
    mostrarToastAdmin("Configura el Examen final con entre 5 y 25 preguntas. La Evaluación del curso usará 5 de ellas automáticamente.", "error");
    botonEnviar.disabled = false;
    guardandoCursoAdmin = false;
    return;
  }
  const asignacion = {};
  const imagenArchivo = document.getElementById("nc-imagen").files?.[0];
  const videoArchivo = document.getElementById("nc-video").files?.[0];
  try {
    const [thumbnail, video, modulos] = await Promise.all([
      leerArchivoComoDataUrl(imagenArchivo, 5),
      leerArchivoComoDataUrl(videoArchivo, 25),
      construirModulosDesdeEditor(),
    ]);
    if (cursoEnEdicionId) {
      permisos.exigir("editarCursos");
      const comentarioCorreccion = sesion.rol() === "superadmin" ? window.prompt("Describe las correcciones realizadas (opcional):", "") : "";
      if (comentarioCorreccion === null) return;
      const cursoActual = listaCursos.find((curso) => String(curso.id) === String(cursoEnEdicionId));
      await cursos.actualizar(cursoEnEdicionId, {
        comentarioCorreccion,
        nombre, horas, duracion: horas + " h", descripcion, fechaInicio, fechaFin, ...asignacion, modulos,
        thumbnail: thumbnail || cursoActual?.thumbnail || "",
        video: video || cursoActual?.video || "",
      });
      if (examenPendiente) await evaluaciones.actualizarTipo(cursoEnEdicionId, "examen", examenPendiente);
      mostrarToastAdmin("Curso actualizado. Requiere aprobación.", "exito");
    } else {
      const cursoCreado = await cursos.crear({
        nombre, horas, descripcion, fechaInicio, fechaFin, ...asignacion, thumbnail, video, modulos,
        categoria: "General", duracion: `${horas} h`, estado: "pendiente",
        evaluacionesIniciales: { evaluacion: null, examen: examenPendiente },
      });
      cursoEnEdicionId = cursoCreado.id;
      listaCursos.push(cursoCreado);
      document.getElementById("btn-guardar-curso").textContent = "Guardar cambios";
      mostrarToastAdmin("Curso creado. Se envió a Administración para aprobación.", "exito");
    }
    limpiarFormularioCurso();
    await cargarTodo();
  } catch (error) {
    mostrarToastAdmin(error.message, "error");
  } finally {
    guardandoCursoAdmin = false;
    botonEnviar.disabled = false;
  }
});

configurarVistaPreviaMedia();
document.getElementById("btn-cancelar-edicion").addEventListener("click", () => { if (!guardandoCursoAdmin) limpiarFormularioCurso(); });

const modalContenidoCurso = document.getElementById("modal-contenido-curso");
function abrirContenidoCurso() {
  modalContenidoCurso?.removeAttribute("hidden");
  modalContenidoCurso?.setAttribute("aria-hidden", "false");
  document.body.classList.add("admin-modal-abierto");
  document.getElementById("btn-cerrar-contenido-curso")?.focus();
}
function cerrarContenidoCurso() {
  modalContenidoCurso?.setAttribute("hidden", "");
  modalContenidoCurso?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("admin-modal-abierto");
}
document.getElementById("btn-abrir-contenido-curso")?.addEventListener("click", abrirContenidoCurso);
document.getElementById("btn-cerrar-contenido-curso")?.addEventListener("click", cerrarContenidoCurso);
modalContenidoCurso?.querySelector("[data-cerrar-contenido]")?.addEventListener("click", cerrarContenidoCurso);
document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape" && modalContenidoCurso && !modalContenidoCurso.hasAttribute("hidden")) {
    cerrarContenidoCurso();
  }
});

// Revela el campo inválido antes de que el navegador intente enfocarlo.
document.getElementById("form-curso").addEventListener("invalid", (evento) => {
  document.getElementById("alta-curso").open = true;
  if (modalContenidoCurso?.contains(evento.target)) {
    abrirContenidoCurso();
    evento.target.closest(".editor-modulo")?.classList.remove("colapsado");
    const toggle = evento.target.closest(".editor-modulo")?.querySelector("[data-toggle-modulo]");
    toggle?.setAttribute("aria-expanded", "true");
  }
}, true);
