// seguimiento.js — Seguimiento académico de trabajadores y exportación

// ---------------------------------------------------------------
// SEGUIMIENTO ACADÉMICO — RF-039..044
// ---------------------------------------------------------------
function inicializarFiltrosReporte(){
  const area=document.getElementById("reporte-filtro-area"), trabajador=document.getElementById("reporte-filtro-trabajador"), curso=document.getElementById("reporte-filtro-curso");
  if(!area||!trabajador||!curso)return;
  const aActual=area.value,tActual=[...trabajador.selectedOptions].map(o=>o.value),cActual=curso.value;
  const areas=[...new Set(listaUsuarios.filter(u=>u.rol==="trabajador").map(u=>u.area||"Sin asignar"))].sort((a,b)=>a.localeCompare(b,"es"));
  area.innerHTML='<option value="">Todas las áreas</option>'+areas.map(x=>`<option value="${escaparHtml(x)}">${escaparHtml(x)}</option>`).join(""); area.value=areas.includes(aActual)?aActual:"";
  const areaSeleccionada=area.value;
  const trabajadores=listaUsuarios.filter(u=>u.rol==="trabajador").sort((a,b)=>a.nombre.localeCompare(b.nombre,"es"));
  const trabajadoresFiltrados=trabajadores.filter(u=>!areaSeleccionada || (u.area||"Sin asignar")===areaSeleccionada);
  trabajador.innerHTML='<option value="">Todos los trabajadores</option>'+trabajadoresFiltrados.map(u=>`<option value="${u.id}">${escaparHtml(u.nombre)}</option>`).join(""); const disponiblesIds=trabajadoresFiltrados.map(u=>String(u.id)); [...trabajador.options].forEach(o=>o.selected=tActual.includes(o.value)&&disponiblesIds.includes(o.value));
  curso.innerHTML='<option value="">Todos los cursos</option>'+(listaCursos||[]).map(c=>`<option value="${escaparHtml(c.nombre)}">${escaparHtml(c.nombre)}</option>`).join(""); curso.value=(listaCursos||[]).some(c=>c.nombre===cActual)?cActual:"";
  construirSelectorTrabajadoresReporte();
}

// Selector visual para trabajadores: reemplaza la lista nativa amontonada por
// una lista con buscador y casillas, manteniendo el <select> oculto como fuente
// de datos para la lógica de filtros y exportación existente.
function construirSelectorTrabajadoresReporte(){
  const select=document.getElementById("reporte-filtro-trabajador");
  const contenedor=document.getElementById("reporte-trabajadores-selector");
  const area=document.getElementById("reporte-filtro-area");
  if(!select||!contenedor)return;

  const opciones=[...select.options];
  const seleccionados=new Set([...select.selectedOptions].map(o=>String(o.value)));
  const areaSeleccionada=Boolean(area?.value);
  const todosSeleccionados=!seleccionados.size || seleccionados.has("") ||
    (opciones.length>1 && opciones.slice(1).every(o=>seleccionados.has(String(o.value))));

  contenedor.innerHTML=`
    <div class="selector-cabecera-buscador">
      <span class="selector-icono">🔎</span>
      <input type="search" class="selector-buscador" placeholder="Buscar trabajador..." aria-label="Buscar trabajador" autocomplete="off" />
    </div>
    <div class="selector-contenido">
      <label class="selector-opcion todos">
        <input type="checkbox" data-selector-todos ${todosSeleccionados?"checked":""}/>
        <span>Todos los trabajadores</span>
      </label>
      <div class="selector-lista">
        ${opciones.slice(1).map(o=>{
          const usuario=listaUsuarios.find(u=>String(u.id)===String(o.value));
          const areaUsuario=String(usuario?.area||"Sin asignar").trim()||"Sin asignar";
          const correoUsuario=String(usuario?.correo||"");
          return `
          <label class="selector-opcion" data-nombre-trabajador="${escaparHtml(o.textContent)}" data-area-trabajador="${escaparHtml(areaUsuario)}" data-correo-trabajador="${escaparHtml(correoUsuario)}">
            <input type="checkbox" data-selector-trabajador value="${escaparHtml(o.value)}" ${(!todosSeleccionados && seleccionados.has(String(o.value)))?"checked":""}/>
            <span class="selector-trabajador-datos"><strong>${escaparHtml(o.textContent)}</strong><small>${escaparHtml(areaUsuario)}</small></span>
          </label>`;
        }).join("") || '<div class="selector-vacio">No hay trabajadores para esta área.</div>'}
      </div>
    </div>`;

  const buscador=contenedor.querySelector(".selector-buscador");
  const actualizarVisibilidad=()=>{
    const q=(buscador?.value||"").trim();
    const mostrar=Boolean(area?.value) || Boolean(q);
    contenedor.classList.toggle("selector-colapsado",!mostrar);
    if(buscador){
      contenedor.querySelectorAll("[data-nombre-trabajador]").forEach(fila=>{
        const texto=[fila.dataset.nombreTrabajador||"",fila.dataset.areaTrabajador||"",fila.dataset.correoTrabajador||""].join(" ").toLowerCase();
        fila.hidden=Boolean(q) && !texto.includes(q.toLowerCase());
      });
    }
  };

  const sincronizar=()=>{
    const checks=[...contenedor.querySelectorAll("[data-selector-trabajador]")];
    const todos=contenedor.querySelector("[data-selector-todos]");
    const ids=checks.filter(c=>c.checked).map(c=>String(c.value));
    if(select.options[0]) select.options[0].selected=Boolean(todos?.checked);
    [...select.options].slice(1).forEach(o=>{ o.selected=ids.includes(String(o.value)); });
    if(!ids.length && todos) todos.checked=true;
    pintarSeguimiento();
  };

  contenedor.querySelector("[data-selector-todos]")?.addEventListener("change",e=>{
    contenedor.querySelectorAll("[data-selector-trabajador]").forEach(c=>c.checked=e.target.checked);
    sincronizar();
  });
  contenedor.querySelectorAll("[data-selector-trabajador]").forEach(check=>check.addEventListener("change",()=>{
    const checks=[...contenedor.querySelectorAll("[data-selector-trabajador]")];
    const todos=contenedor.querySelector("[data-selector-todos]");
    if(todos) todos.checked=checks.length>0 && checks.every(c=>c.checked);
    sincronizar();
  }));

  buscador?.addEventListener("focus",()=>actualizarVisibilidad());
  buscador?.addEventListener("click",()=>actualizarVisibilidad());
  buscador?.addEventListener("input",()=>actualizarVisibilidad());
  buscador?.addEventListener("keydown",e=>{ if(e.key==="Escape"){ buscador.value=""; actualizarVisibilidad(); buscador.blur(); } });

  actualizarVisibilidad();
}

function pintarVistaPreviaReporte() {
  const cuerpo = document.getElementById("tabla-vista-previa-reporte");
  if (!cuerpo) return;
  const filas = resultadosParaReporte();
  if (!filas.length) {
    cuerpo.innerHTML = '<tr><td colspan="8" class="muted" style="text-align:center;padding:18px">No hay información que coincida con los filtros.</td></tr>';
    return;
  }
  cuerpo.innerHTML = filas.slice(0, 100).map(f => `<tr>
    <td><strong>${escaparHtml(f.Trabajador)}</strong><br><small>${escaparHtml(f.Correo || "")}</small></td>
    <td>${escaparHtml(f.Area || "Sin asignar")}</td>
    <td>${escaparHtml(f.Curso || "—")}</td>
    <td>${escaparHtml(f.AvanceGeneral || "—")}</td>
    <td>${escaparHtml(f.Calificacion || "—")}</td>
    <td>${escaparHtml(f.Estado || "—")}</td>
    <td>${escaparHtml(f.Fecha || "—")}</td>
    <td>${escaparHtml(f.FechaInicioCurso || "—")}</td>
  </tr>`).join("");
  if (filas.length > 100) {
    cuerpo.insertAdjacentHTML("beforeend", `<tr><td colspan="8" class="muted" style="text-align:center;padding:12px">Vista previa limitada a 100 filas. El Excel incluirá las ${filas.length} filas completas.</td></tr>`);
  }
}

// Fecha de apertura del curso, no el inicio individual del trabajador.
function fechaInicioParaReporte(nombreCurso, cursoId) {
  const coincidencias = (listaCursos || []).filter(c =>
    cursoId != null ? String(c.id) === String(cursoId) : c.nombre === nombreCurso
  );
  if (coincidencias.length !== 1) return "—";
  return formatearFechaInicioCurso(coincidencias[0].fechaInicio);
}

function resultadosParaReporte(){
  const area=document.getElementById("reporte-filtro-area")?.value||"";
  const trabajadorEl=document.getElementById("reporte-filtro-trabajador");
  const trabajadoresSeleccionados=trabajadorEl?[...trabajadorEl.selectedOptions].map(o=>o.value).filter(Boolean):[];
  const curso=document.getElementById("reporte-filtro-curso")?.value||"";
  const desde=document.getElementById("reporte-fecha-desde")?.value||"";
  const hasta=document.getElementById("reporte-fecha-hasta")?.value||"";
  const filtroEstado=document.getElementById("filtro-estado-seguimiento")?.value||"";
  const usuarios=(listaUsuarios||[]).filter(u=>u.rol==="trabajador" && (!area || (u.area||"Sin asignar")===area) && (!trabajadoresSeleccionados.length || trabajadoresSeleccionados.includes(String(u.id))));
  const consulta = document.getElementById("buscar-seguimiento")?.value.trim().toLowerCase() || "";
  const filas=[];
  usuarios.forEach(u=>{
    if (consulta && ![u.nombre, u.correo, u.area].some(v => String(v || "").toLowerCase().includes(consulta))) return;
    const seguimiento=listaSeguimiento.find(s=>String(s.usuarioId)===String(u.id));
    if(filtroEstado && seguimiento?.estado!==filtroEstado) return;
    const resultados=listaResultados.filter(r=>(r.usuarioId===u.id || (!r.usuarioId&&r.usuario===u.nombre)) && r.tipo!=="evaluacion" && (!curso||r.curso===curso) && (!desde||String(r.fecha||"").slice(0,10)>=desde) && (!hasta||String(r.fecha||"").slice(0,10)<=hasta));
    const filasBase={Trabajador:u.nombre,Area:u.area||"Sin asignar",Correo:u.correo||"",AvanceGeneral:`${seguimiento?.avance||0}%`,CursosCompletados:`${seguimiento?.cursosCompletados||0}/${seguimiento?.cursosTotal||0}`,Horas:`${seguimiento?.horasHechas||0}/${seguimiento?.horasTotal||0} h`};
    if(resultados.length){
      resultados.forEach(r=>filas.push({...filasBase,Curso:r.curso||"—",Tipo:String(r.tipo||"examen").toLowerCase()==="evaluacion"?"Evaluación del curso":"Examen final",Calificacion:Number.isFinite(Number(r.nota))?`${r.nota}%`:"—",Estado:r.estado||seguimiento?.estado||"—",Fecha:r.fecha||"—",FechaInicioCurso:fechaInicioParaReporte(r.curso,r.cursoId)}));
    } else {
      filas.push({...filasBase,Curso:curso||"Resumen académico",Tipo:"Seguimiento",Calificacion:"—",Estado:seguimiento?.estado||"Sin iniciar",Fecha:"—",FechaInicioCurso:fechaInicioParaReporte(curso)});
    }
  });
  return filas;
}

function descargarReporteExcel(){
  if(typeof XLSX === "undefined"){ mostrarToastAdmin("No se pudo cargar el generador de Excel.","error"); return; }
  const filas=resultadosParaReporte();
  if(!filas.length){ mostrarToastAdmin("No hay información que coincida con los filtros seleccionados.","error"); return; }
  const hoja=XLSX.utils.json_to_sheet(filas); hoja['!cols']=Object.keys(filas[0]).map(k=>({wch:Math.min(32,Math.max(12,k.length+4))}));
  const libro=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(libro,hoja,"Seguimiento académico");
  XLSX.writeFile(libro,`reporte_seguimiento_${new Date().toISOString().slice(0,10)}.xlsx`);
  mostrarToastAdmin(`Reporte generado con ${filas.length} registro(s).`,"exito");
}

document.getElementById("btn-generar-reporte")?.addEventListener("click",descargarReporteExcel);
["reporte-filtro-area","reporte-filtro-trabajador","reporte-filtro-curso","reporte-fecha-desde","reporte-fecha-hasta"].forEach(id=>document.getElementById(id)?.addEventListener("change",()=>{ inicializarFiltrosReporte(); pintarSeguimiento(); actualizarResumenReporte(); }));
inicializarFiltrosReporte();

function pintarSeguimiento() {
  const filtroEstado = document.getElementById("filtro-estado-seguimiento")?.value || "";
  const q = document.getElementById("buscar-seguimiento")?.value.toLowerCase() || "";
  const usuariosTrabajadores = (listaUsuarios || []).filter((u) => u.rol === "trabajador");
  const filas = listaSeguimiento
    .map((s) => ({
      ...s,
      usuario: usuariosTrabajadores.find((u) => String(u.id) === String(s.usuarioId)),
    }))
    .filter((s) => !filtroEstado || s.estado === filtroEstado)
    .filter((s) => !q || [s.nombre, s.usuario?.area, s.usuario?.correo].some(v => String(v || "").toLowerCase().includes(q)));

  const cuerpo = document.getElementById("tabla-seguimiento");
  if (!cuerpo) {
    actualizarResumenReporte();
    pintarVistaPreviaReporte();
    return;
  }
  cuerpo.innerHTML = filas.map((s) => `<tr>
    <td><strong>${escaparHtml(s.nombre || "Trabajador sin nombre")}</strong><br><small>${escaparHtml(s.usuario?.correo || "")}</small></td>
    <td>${escaparHtml(s.usuario?.area || "Sin asignar")}</td>
    <td><div class="avance-mini"><div class="progreso-barra"><div class="progreso-relleno" style="width:${s.avance}%"></div></div><span>${s.avance}%</span></div></td>
    <td>${s.cursosCompletados}/${s.cursosTotal}</td>
    <td>${s.horasHechas}/${s.horasTotal} h</td>
    <td><span class="badge ${s.estado === "Completado" ? "badge-exito" : s.estado === "En progreso" ? "badge-proceso" : "badge-inactivo"}">${s.estado}</span></td>
    <td><button class="btn btn-secundario btn-sm" data-perfil-nuevo="${s.usuarioId}">Ver</button></td>
  </tr>`).join("") || '<tr><td colspan="7" class="muted" style="text-align:center; padding:20px;">Sin resultados.</td></tr>';
  document.querySelectorAll("[data-perfil-nuevo]").forEach((boton) => boton.addEventListener("click", () => abrirPerfilTrabajador(boton.dataset.perfilNuevo)));
  actualizarResumenReporte();
  pintarVistaPreviaReporte();
}

function actualizarResumenReporte() {
  const el = document.getElementById("resumen-reporte-academico");
  if (!el) return;
  const area = document.getElementById("reporte-filtro-area")?.value || "";
  const trabajadorEl = document.getElementById("reporte-filtro-trabajador");
  const ids = trabajadorEl ? [...trabajadorEl.selectedOptions].map(o => o.value).filter(Boolean) : [];
  const curso = document.getElementById("reporte-filtro-curso")?.value || "";
  const desde = document.getElementById("reporte-fecha-desde")?.value || "";
  const hasta = document.getElementById("reporte-fecha-hasta")?.value || "";
  const trabajadores = (listaUsuarios || []).filter(u => u.rol === "trabajador" && (!area || (u.area || "Sin asignar") === area) && (!ids.length || ids.includes(String(u.id))));
  const textoArea = area ? `Área: <strong>${escaparHtml(area)}</strong>` : "Todas las áreas";
  const textoTrab = ids.length === 1 ? ` · 1 trabajador seleccionado` : ids.length > 1 ? ` · ${ids.length} trabajadores seleccionados` : " · todos los trabajadores del filtro";
  const textoCurso = curso ? ` · Curso: <strong>${escaparHtml(curso)}</strong>` : " · todos los cursos";
  const fechas = desde || hasta ? ` · Periodo: ${escaparHtml(desde || "inicio")} a ${escaparHtml(hasta || "hoy")}` : " · todo el periodo";
  el.innerHTML = `👥 ${textoArea}${textoTrab}${textoCurso}${fechas} · <strong>${trabajadores.length}</strong> trabajador(es) incluidos. Puedes descargar el reporte con el botón de Excel.`;
}

document.getElementById("filtro-estado-seguimiento").addEventListener("change", pintarSeguimiento);
document.getElementById("buscar-seguimiento").addEventListener("input", pintarSeguimiento);
document.getElementById("btn-exportar").addEventListener("click", () => { const filas=resultadosParaReporte(); if(!filas.length){mostrarToastAdmin("No hay datos para exportar.","error");return;} reportes.exportarCSV(filas,"seguimiento-cicsa-capacita.csv"); });
