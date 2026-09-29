// El panel compartido carga este archivo; solo administración gestiona tutoriales.
(() => {
if (!sesion.activa() || !permisos.tiene("tutorial")) return;
const form=document.getElementById("form-tutorial-admin");
const lista=document.getElementById("tutorial-admin-lista");
const tipo=document.getElementById("tutorial-tipo");
const archivo=document.getElementById("tutorial-archivo");
const url=document.getElementById("tutorial-url");
const archivoCampo=document.getElementById("tutorial-archivo-campo");
const urlCampo=document.getElementById("tutorial-url-campo");
const nombreArchivo=document.getElementById("tutorial-archivo-nombre");

function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function actualizarCampos(){
  const externo=false;
  archivoCampo.style.display=externo?"none":"flex";
  urlCampo.style.display="flex";
  url.placeholder="Opcional: ../assets/documento.pdf";
  archivo.accept=".pdf,application/pdf";
}
tipo.addEventListener("change",actualizarCampos);
archivo.addEventListener("change",()=>{nombreArchivo.textContent=archivo.files[0]?`✓ ${archivo.files[0].name}`:"Ningún archivo seleccionado";});

function pintar(){
 const a=tutoriales.listar();
 lista.innerHTML=a.length?a.map((t,i)=>`<article class="tutorial-admin-card"><div class="tutorial-admin-icono">${t.tipo==="video"?"🎬":t.tipo==="pdf"?"📄":"🔗"}</div><div class="tutorial-admin-info"><strong>${esc(t.titulo)}</strong><span>${esc(t.tipo.toUpperCase())}</span><p>${esc(t.descripcion||"Sin descripción")}</p><small>${esc(t.nombreArchivo||t.url||"Archivo guardado")}</small></div><button class="btn btn-texto peligro" data-borrar="${i}">Eliminar</button></article>`).join(""):"<div class='tutorial-vacio'>📚<strong>No hay materiales publicados</strong><span>Cuando publiques un tutorial, aparecerá aquí.</span></div>";
 lista.querySelectorAll("[data-borrar]").forEach(b=>b.onclick=()=>{permisos.exigir("tutorial");if(confirm("¿Eliminar este tutorial?")){tutoriales.eliminar(a[Number(b.dataset.borrar)]);pintar();document.getElementById("tutorial-publicacion-estado").textContent="Material eliminado de la guía del trabajador.";}});
}
form?.addEventListener("submit", async e => {
  e.preventDefault();
  if (!permisos.tiene("tutorial")) return;
  const boton = form.querySelector('[type="submit"]');
  if (boton.disabled) return;
  const estado = document.getElementById("tutorial-publicacion-estado");
  const datos = {
    titulo: document.getElementById("tutorial-titulo").value.trim(),
    descripcion: document.getElementById("tutorial-descripcion").value.trim(),
    tipo: tipo.value, url: url.value.trim(), nombreArchivo: ""
  };
  const file = archivo.files[0];
  boton.disabled = true;
  estado.textContent = "Publicando material…";
  try {
    if (datos.tipo !== "pdf") throw new Error("Los tutoriales solo pueden publicarse en formato PDF.");
    if (!file && !/\.pdf(?:$|[?#])/i.test(datos.url)) throw new Error("Selecciona un archivo PDF o indica una ruta que termine en .pdf.");
    if (file) {
      if (file.size > 3500000) throw new Error("El archivo supera 3.5 MB. Usa una URL para materiales más grandes.");
      
      if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) throw new Error("Selecciona un documento PDF.");
      datos.url = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
        reader.readAsDataURL(file);
      });
      datos.nombreArchivo = file.name;
    }
    tutoriales.publicar(datos);
    form.reset();
    nombreArchivo.textContent = "Ningún archivo seleccionado";
    actualizarCampos();
    pintar();
    estado.textContent = "Publicado. El material ya aparece en Tutorial de uso del trabajador.";
  } catch (error) {
    estado.textContent = error.name === "QuotaExceededError" ? "No hay espacio para este archivo. Usa una URL o un archivo más pequeño." : error.message;
  } finally { boton.disabled = false; }
});
function actualizarPublicados() {
  try { pintar(); }
  catch (error) { document.getElementById("tutorial-publicacion-estado").textContent = error.message; }
}
actualizarCampos();
actualizarPublicados();
window.addEventListener("cicsa-tutoriales-actualizados", actualizarPublicados);
window.addEventListener("focus", actualizarPublicados);
window.addEventListener("storage", e => { if (e.key === tutoriales.clave || e.key === null) actualizarPublicados(); });
})();
