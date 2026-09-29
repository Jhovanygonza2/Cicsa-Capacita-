sesion.requerir(["admin"]);

function esc(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");}
function leerLocalArray(clave){try{const raw=localStorage.getItem(clave);const data=raw?JSON.parse(raw):[];return Array.isArray(data)?data:[];}catch{return [];}}
function leerLocalObject(clave){try{const raw=localStorage.getItem(clave);const data=raw?JSON.parse(raw):{};return data&&typeof data==="object"&&!Array.isArray(data)?data:{};}catch{return {};}}

const INSIGNIAS=[
{id:"excelencia",icon:"🏆",nombre:"Excelencia en capacitación",detalle:"Promedio de 90% o más."},
{id:"alto",icon:"⭐",nombre:"Alto desempeño",detalle:"95% o más en un examen."},
{id:"formacion",icon:"🎓",nombre:"Formación continua",detalle:"3 cursos completados."},
{id:"desarrollo",icon:"📚",nombre:"Desarrollo profesional",detalle:"5 cursos completados."},
{id:"perfecta",icon:"💯",nombre:"Evaluación sobresaliente",detalle:"100% en un examen."},
{id:"inicio",icon:"🚀",nombre:"Impulso al aprendizaje",detalle:"Primer curso completado."},
{id:"destacado",icon:"🏅",nombre:"Destacado del curso",detalle:"Mejor calificación del curso consultado."}
];

async function iniciarExcelencia(){
  const [usuariosData,cursosData,resultadosData,seguimientoData]=await Promise.all([
    typeof usuarios!=="undefined"?usuarios.listar():Promise.resolve([]),
    typeof cursos!=="undefined"?cursos.listar():Promise.resolve([]),
    typeof reportes!=="undefined"?reportes.seguimiento():Promise.resolve([]),
    typeof reportes!=="undefined"?reportes.seguimientoTrabajadores():Promise.resolve([])
  ]);

  // Fusionamos API + localStorage para que una pestaña nueva vea los datos ya registrados.
  const usuariosBase=Array.isArray(usuariosData)?usuariosData:[];
  const usuariosLocal=leerLocalArray("cicsa_usuarios");
  const mapaUsuarios=new Map();
  [...usuariosBase,...usuariosLocal].forEach(u=>{if(u&&u.id!=null)mapaUsuarios.set(String(u.id),u);});
  const trabajadores=[...mapaUsuarios.values()].filter(u=>String(u.rol||"").toLowerCase()==="trabajador");

  const cursosBase=Array.isArray(cursosData)?cursosData:[];
  const cursosLocal=leerLocalArray("cicsa_cursos");
  const mapaCursos=new Map();
  [...cursosBase,...cursosLocal].forEach(c=>{if(c&&c.id!=null)mapaCursos.set(String(c.id),c);});
  const cursosLista=[...mapaCursos.values()];

  const resultadosApi=Array.isArray(resultadosData)?resultadosData:[];
  const resultadosLocal=leerLocalArray("cicsa_evaluaciones_resultado");
  const resultados=[];
  const claves=new Set();
  [...resultadosApi,...resultadosLocal].forEach(r=>{
    if(!r||!Number.isFinite(Number(r.nota)))return;
    const clave=[r.usuarioId||"",r.usuario||"",r.curso||"",r.tipo||"examen",r.fecha||"",r.nota].join("|");
    if(!claves.has(clave)){claves.add(clave);resultados.push({...r,nota:Number(r.nota)});}
  });

  const progresoPersistido=leerLocalObject("cicsa_progreso");
  const seguimiento=Array.isArray(seguimientoData)?seguimientoData:[];

  const usuarioIdDeResultado=(r)=>r.usuarioId!=null?String(r.usuarioId):null;
  const mismoUsuario=(r,u)=>{
    const rid=usuarioIdDeResultado(r);
    return (rid&&rid===String(u.id))||(!rid&&String(r.usuario||"").trim().toLowerCase()===String(u.nombre||"").trim().toLowerCase());
  };
  const resultadoDe=(u,curso="")=>resultados.filter(r=>mismoUsuario(r,u)&&String(r.tipo||"examen").toLowerCase()==="examen"&&(!curso||String(r.curso||"")===String(curso)));
  const mejorPorCurso=(u)=>{const mapa=new Map();resultadoDe(u).forEach(r=>{const key=String(r.curso||"Curso");const p=mapa.get(key);if(!p||r.nota>p.nota||(r.nota===p.nota&&String(r.fecha||"")>String(p.fecha||"")))mapa.set(key,r);});return [...mapa.values()];};
  const promedioGeneral=(u)=>{const notas=mejorPorCurso(u).map(r=>r.nota);return notas.length?Math.round(notas.reduce((a,b)=>a+b,0)/notas.length):null;};
  const cursosCompletados=(u)=>{
    const s=seguimiento.find(x=>String(x.usuarioId)===String(u.id));
    if(Number.isFinite(Number(s?.cursosCompletados)))return Number(s.cursosCompletados);
    const propio=progresoPersistido[u.id]||{};
    const completos=Object.values(propio).filter(x=>x?.estado==="completado").length;
    return completos||mejorPorCurso(u).length;
  };
  const horasCapacitacion=(u)=>{
    const propio=progresoPersistido[u.id]||{};
    return cursosLista.reduce((sum,c)=>sum+((Number(propio[c.id]?.porcentaje)||0)/100)*(Number(c.horas)||0),0);
  };
  const insigniasDe=(u,promedio,notasCurso,cursoActivo)=>{
    const todas=resultadoDe(u).map(r=>r.nota),completados=cursosCompletados(u),out=[];
    if(promedio!==null&&promedio>=90)out.push(INSIGNIAS[0]);
    if(todas.some(n=>n>=95))out.push(INSIGNIAS[1]);
    if(completados>=3)out.push(INSIGNIAS[2]);
    if(completados>=5)out.push(INSIGNIAS[3]);
    if(todas.some(n=>n===100))out.push(INSIGNIAS[4]);
    if(completados>=1)out.push(INSIGNIAS[5]);
    if(cursoActivo&&notasCurso.length){
      const maxGlobal=Math.max(...trabajadores.flatMap(t=>resultadoDe(t,cursoActivo).map(r=>r.nota)), -1);
      if(Math.max(...notasCurso.map(r=>r.nota))===maxGlobal)out.push(INSIGNIAS[6]);
    }
    return out;
  };
  const reconocimiento=(nota)=>{
    if(nota===null)return {clase:"sin",titulo:"Sin evaluación",mensaje:"Aún no cuenta con un examen registrado para esta consulta."};
    if(nota>=90)return {clase:"excelencia",titulo:"Excelencia en capacitación",mensaje:"¡Felicidades! Tu compromiso con la capacitación se refleja en tus resultados. Continúa fortaleciendo tus conocimientos."};
    if(nota>70)return {clase:"bueno",titulo:"Buen avance",mensaje:"Vas por buen camino. Continúa con tu formación para seguir desarrollando tus conocimientos."};
    return {clase:"proceso",titulo:"Continúa aprendiendo",mensaje:"No te rindas. Cada evaluación es una oportunidad para mejorar. ¡Inténtalo de nuevo!"};
  };

  const tipo=document.getElementById("excelencia-tipo"),cursoSelect=document.getElementById("excelencia-filtro-curso"),areaSelect=document.getElementById("excelencia-filtro-area"),busqueda=document.getElementById("excelencia-busqueda");
  cursosLista.sort((a,b)=>String(a.nombre||"").localeCompare(String(b.nombre||""),"es")).forEach(c=>{const o=document.createElement("option");o.value=String(c.nombre||"");o.textContent=c.nombre||"Curso";cursoSelect.appendChild(o);});
  [...new Set(trabajadores.map(u=>String(u.area||"Sin asignar").trim()||"Sin asignar"))].sort((a,b)=>a.localeCompare(b,"es")).forEach(a=>{const o=document.createElement("option");o.value=a;o.textContent=a;areaSelect.appendChild(o);});

  function construirFilas(){
    const curso=tipo.value==="curso"?cursoSelect.value:"",area=areaSelect.value,q=busqueda.value.trim().toLowerCase();
    let filas=trabajadores.map(u=>{const notasCurso=curso?resultadoDe(u,curso):mejorPorCurso(u);const promedio=curso?(notasCurso.length?Math.max(...notasCurso.map(r=>r.nota)):null):promedioGeneral(u);return {u,notasCurso,promedio,completados:cursosCompletados(u),horas:horasCapacitacion(u),insignias:insigniasDe(u,promedio,notasCurso,curso)};});
    return filas.filter(x=>(!area||String(x.u.area||"Sin asignar").trim()===area)&&(!q||[x.u.nombre,x.u.correo,x.u.area,x.u.puesto].some(v=>String(v||"").toLowerCase().includes(q))))
      .sort((a,b)=>{if(a.promedio===null&&b.promedio!==null)return 1;if(a.promedio!==null&&b.promedio===null)return -1;return (b.promedio??-1)-(a.promedio??-1)||String(a.u.nombre||"").localeCompare(String(b.u.nombre||""),"es");});
  }

  function pintar(){
    const filas=construirFilas(),evaluados=filas.filter(x=>x.promedio!==null),top=evaluados.slice(0,3),curso=tipo.value==="curso"?cursoSelect.value:"",area=areaSelect.value||"Todas las áreas";
    const promedioConsulta=evaluados.length?Math.round(evaluados.reduce((s,x)=>s+x.promedio,0)/evaluados.length):null;
    document.getElementById("excelencia-contexto").textContent=curso||"Promedio general";
    document.getElementById("excelencia-subcontexto").textContent=area;
    document.getElementById("excelencia-evaluados").textContent=evaluados.length;
    document.getElementById("excelencia-total-trabajadores").textContent=filas.length;
    document.getElementById("excelencia-promedio-consulta").textContent=promedioConsulta===null?"—":`${promedioConsulta}%`;
    document.getElementById("excelencia-podio-subtitulo").textContent=curso?`Mejores calificaciones del curso: ${curso}.`:`Mejores promedios generales de la consulta.`;
    document.getElementById("excelencia-grafica-titulo").textContent=curso?`Desempeño por trabajador · ${curso}`:"Mejores promedios generales";

    const podio=document.getElementById("excelencia-podio");
    if(!top.length){podio.innerHTML='<div class="excelencia-vacio" style="grid-column:1/-1"><strong>No hay calificaciones disponibles para estos filtros.</strong><br><span>Los trabajadores sin evaluación siguen visibles en la tabla.</span></div>';}else{
      const orden=[top[1],top[0],top[2]],medallas=["🥈","🥇","🥉"];
      podio.innerHTML=orden.filter(Boolean).map((x,i)=>`<article class="podio-card${i===1?" primer":""}"><div class="podio-medalla">${medallas[i]}</div><div class="podio-avatar">${esc(String(x.u.nombre||"?").split(/\s+/).slice(0,2).map(n=>n[0]).join("").toUpperCase())}</div><h3>${esc(x.u.nombre)}</h3><div class="podio-area">${esc(x.u.area||"Sin asignar")}</div><div class="podio-nota">${x.promedio}% <small>${curso?"calificación":"promedio"}</small></div><div class="podio-insignias">${x.insignias.slice(0,4).map(b=>`<span class="mini-insignia" title="${esc(b.nombre)}">${b.icon}</span>`).join("")}</div></article>`).join("");
    }

    const cuerpo=document.getElementById("tabla-excelencia-cuerpo");
    if(!filas.length){cuerpo.innerHTML='<tr><td colspan="8"><div class="excelencia-vacio">No hay trabajadores que coincidan con los filtros seleccionados.</div></td></tr>';}else{
      cuerpo.innerHTML=filas.map((x,i)=>{const r=reconocimiento(x.promedio),barra=x.promedio===null?"":`<span class="barra-nota"><i style="width:${Math.max(0,Math.min(100,x.promedio))}%"></i></span>`;const insignias=x.insignias.length?x.insignias.map(b=>`<span class="insignia-chip" title="${esc(b.nombre)}">${b.icon}</span>`).join(""):"—";return `<tr><td class="puesto">${x.promedio===null?"—":i+1}</td><td><span class="trabajador-nombre">${esc(x.u.nombre)}</span><span class="trabajador-correo">${esc(x.u.correo||"")}</span></td><td>${esc(x.u.area||"Sin asignar")}</td><td>${x.promedio===null?"—":`${barra}<span class="nota-num">${x.promedio}%</span>`}</td><td>${x.completados}</td><td>${x.horas.toFixed(1)} h</td><td><div class="insignias-celda">${insignias}</div></td><td><span class="estado ${r.clase}">${esc(r.titulo)}</span><div class="mensaje">${esc(r.mensaje)}</div></td></tr>`;}).join("");
    }

    const barras=document.getElementById("excelencia-grafica");
    const grafica=filas.filter(x=>x.promedio!==null).slice(0,8);
    barras.innerHTML=grafica.length?grafica.map((x,i)=>`<div class="grafica-fila"><div class="grafica-etiqueta"><span>${i+1}. ${esc(x.u.nombre)}</span><strong>${x.promedio}%</strong></div><div class="grafica-track"><span style="width:${x.promedio}%"></span></div><small>${esc(x.u.area||"Sin asignar")}</small></div>`).join(""):"<div class='excelencia-vacio'>No hay resultados para graficar con los filtros actuales.</div>";

    const resumenAreas=document.getElementById("excelencia-resumen-areas");
    const mapaAreas=new Map();
    filas.forEach(x=>{const a=String(x.u.area||"Sin asignar");if(!mapaAreas.has(a))mapaAreas.set(a,[]);if(x.promedio!==null)mapaAreas.get(a).push(x.promedio);});
    const areas=[...mapaAreas.entries()].map(([a,ns])=>({a,trabajadores:filas.filter(x=>String(x.u.area||"Sin asignar")===a).length,evaluados:ns.length,promedio:ns.length?Math.round(ns.reduce((s,n)=>s+n,0)/ns.length):null})).sort((a,b)=>(b.promedio??-1)-(a.promedio??-1));
    resumenAreas.innerHTML=areas.length?areas.map(a=>`<tr><td>${esc(a.a)}</td><td>${a.trabajadores}</td><td>${a.evaluados}</td><td><strong>${a.promedio===null?"—":a.promedio+"%"}</strong></td></tr>`).join(""):"<tr><td colspan='4' class='excelencia-vacio'>Sin datos</td></tr>";
  }

  document.getElementById("excelencia-insignias-definiciones").innerHTML=INSIGNIAS.map(b=>`<div class="insignia-def"><div class="insignia-icon">${b.icon}</div><div><strong>${esc(b.nombre)}</strong><span>${esc(b.detalle)}</span></div></div>`).join("");
  document.getElementById("btn-volver-panel")?.addEventListener("click",()=>{try{if(window.opener&&!window.opener.closed){window.opener.focus();window.close();return;}}catch{}window.location.replace("dashboard.html");});
  tipo.addEventListener("change",()=>{if(tipo.value==="general")cursoSelect.value="";pintar();});
  cursoSelect.addEventListener("change",()=>{if(cursoSelect.value){tipo.value="curso";}else{tipo.value="general";}pintar();});
  areaSelect.addEventListener("change",pintar);busqueda.addEventListener("input",pintar);
  pintar();
}

iniciarExcelencia().catch(e=>{console.error(e);const cuerpo=document.getElementById("tabla-excelencia-cuerpo");if(cuerpo)cuerpo.innerHTML=`<tr><td colspan="8"><div class="excelencia-vacio">No se pudo cargar la información. ${esc(e?.message||"")}</div></td></tr>`;});
