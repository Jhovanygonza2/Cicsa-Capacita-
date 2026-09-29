// Tiempo visible y tramos únicos reproducidos; los saltos no acumulan avance.
function registrarMuestraVideo(evidencia, anterior, actual) {
  if (anterior && actual.visible && anterior.visible && actual.reproduciendo && !actual.saltando && actual.dt > 0 && actual.dt <= 2) {
    const avance = actual.posicion - anterior.posicion;
    if (avance > 0 && avance <= actual.dt * actual.velocidad + 0.35) {
      evidencia.tramos = unirTramosVideo([...evidencia.tramos, [anterior.posicion, actual.posicion]], actual.duracion);
    }
  }
  if (Number.isFinite(actual.duracion) && actual.duracion > 0) evidencia.duracion = actual.duracion;
}
function crearControlConsumo({leccion, contenido, raiz, clave, vigente, actualizar}) {
  const regla = reglaConsumoLeccion(leccion, contenido);
  let evidencia = {segundos: 0, tramos: [], duracion: 0, descargado: false};
  try { const guardada = JSON.parse(localStorage.getItem(clave)); if (guardada) evidencia = {...evidencia, ...guardada}; } catch {}
  let detenido = false, anterior = null, ultimo = performance.now(), visibleAnterior = !document.hidden, ticks = 0;
  const video = raiz.querySelector("video.lector-media-recurso");
  const imagen = raiz.querySelector("img.lector-media-recurso");
  const documento = raiz.querySelector("iframe.lector-documento");
  let documentoCargado = false;
  documento?.addEventListener("load", () => {documentoCargado=true;});
  const guardar = () => { try { localStorage.setItem(clave, JSON.stringify(evidencia)); } catch {} };
  const reset = () => {
    ultimo=performance.now(); visibleAnterior=!document.hidden;
    anterior=video ? {posicion:video.currentTime, visible:visibleAnterior} : null;
  };
  const terminarVideo = (visible = !document.hidden) => {
    if (detenido || !vigente() || !video) return;
    const actual={posicion:video.currentTime, duracion:video.duration, visible,
      dt:(performance.now()-ultimo)/1000, reproduciendo:true, saltando:video.seeking, velocidad:video.playbackRate};
    registrarMuestraVideo(evidencia, anterior, actual); guardar(); actualizar();
  };
  video?.addEventListener("play", reset);
  video?.addEventListener("playing", () => { if (!anterior) reset(); else ultimo=performance.now(); });
  video?.addEventListener("ended", () => terminarVideo());
  video?.addEventListener("pause", () => terminarVideo());
  const cambiarVisibilidad = () => {
    if (document.hidden && visibleAnterior) terminarVideo(true);
    reset();
  };
  video?.addEventListener("seeking", reset);
  video?.addEventListener("seeked", reset);
  video?.addEventListener("ratechange", reset);
  document.addEventListener("visibilitychange", cambiarVisibilidad);
  const timer = setInterval(() => {
    if (detenido || !vigente()) return;
    const ahora = performance.now(), dt=(ahora-ultimo)/1000, visible=!document.hidden;
    ultimo=ahora;
    if (regla.tipo === "video" && video) {
      const actual={posicion:video.currentTime, duracion:video.duration, visible, dt, reproduciendo:!video.paused && !video.ended && video.readyState>=2, saltando:video.seeking, velocidad:video.playbackRate};
      registrarMuestraVideo(evidencia, anterior, actual); anterior=actual;
    } else {
      const disponible = regla.tipo === "documento" ? documentoCargado : !!(leccion.informacion || contenido.cuerpo) || (imagen?.complete && imagen.naturalWidth>0);
      if (visible && visibleAnterior && dt>0 && dt<=2 && disponible) evidencia.segundos=Math.min(REGLAS_CONSUMO.lectura,evidencia.segundos+dt);
    }
    visibleAnterior=visible;
    if (++ticks%20===0) guardar();
    actualizar();
  },250);
  raiz.querySelector("[data-descargar-material]")?.addEventListener("click", async event => {
    const boton=event.currentTarget; boton.disabled=true;
    const aviso=raiz.querySelector("[data-aviso-descarga]");
    aviso.textContent="Preparando descarga…";
    try {
      const respuesta=await fetch(documento.src);
      if (!respuesta.ok) throw new Error("No se pudo obtener el archivo.");
      const archivo=await respuesta.blob();
      if (!archivo.size) throw new Error("El archivo está vacío.");
      if (detenido || !vigente()) return;
      const url=URL.createObjectURL(archivo), enlace=document.createElement("a");
      enlace.href=url; enlace.download="material-consulta.pdf";
      document.body.append(enlace); enlace.click(); enlace.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
      evidencia.descargado=true; guardar(); actualizar();
      aviso.textContent="Descarga iniciada. Ya puedes continuar.";
    } catch { aviso.textContent="No se pudo descargar el archivo. Puedes cumplir el tiempo de consulta en la vista del documento o volver a intentarlo."; }
    finally {boton.disabled=false;}
  });
  return {
    listo:()=>cumpleConsumoLeccion(regla,evidencia),
    evidencia:()=>JSON.parse(JSON.stringify(evidencia)),
    mensaje:()=> {
      if (!regla.disponible) return "Esta unidad no tiene contenido disponible.";
      if (cumpleConsumoLeccion(regla,evidencia)) return "Puedes continuar. Pulsa Siguiente para guardar tu avance.";
      if (regla.tipo==="video") return `Mira el video completo para continuar. Visto: ${evidencia.duracion ? Math.min(100,Math.floor(segundosVideoVistos(evidencia)/evidencia.duracion*100)) : 0}%. Los saltos no cuentan.`;
      return "Puedes continuar con el siguiente subtema.";
    },
    detener:()=>{detenido=true;clearInterval(timer);document.removeEventListener("visibilitychange",cambiarVisibilidad);guardar();}
  };
}
function claveConsumoLeccion(usuarioId, curso, leccion, contenido) {
  const fuente=JSON.stringify([curso.fechaInicio, leccion, contenido]);
  let hash=0; for(let i=0;i<fuente.length;i++) hash=(Math.imul(hash,31)+fuente.charCodeAt(i))|0;
  return `cicsa_consumo_v1_${usuarioId}_${curso.id}_${leccion.id}_${hash}`;
}
