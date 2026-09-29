// Fuente compartida para administración y guía de uso en modo demo.
const tutoriales = {
  clave: "cicsa_tutoriales",
  listar() {
    const datos = JSON.parse(localStorage.getItem(this.clave) || "[]");
    if (!Array.isArray(datos)) throw new Error("No se pudieron leer los materiales publicados.");
    return datos.filter(t => t && typeof t === "object");
  },
  guardar(items) {
    permisos.exigir("tutorial");
    localStorage.setItem(this.clave, JSON.stringify(items));
    window.dispatchEvent(new Event("cicsa-tutoriales-actualizados"));
  },
  publicar(datos) {
    permisos.exigir("tutorial");
    if (!datos.titulo.trim() || !datos.url) throw new Error("Completa el título y selecciona un archivo o enlace.");
    if (!["video", "pdf", "enlace"].includes(datos.tipo)) throw new Error("Selecciona un tipo de material válido.");
    const url = new URL(datos.url, window.location.href);
    const archivoLocal = url.protocol === "file:" && window.location.protocol === "file:" && !/^[a-z]+:/i.test(datos.url);
    const archivoSubido = (datos.tipo === "video" && /^data:video\//i.test(datos.url)) || (datos.tipo === "pdf" && /^data:application\/pdf[;,]/i.test(datos.url));
    if (!["https:", "http:"].includes(url.protocol) && !archivoLocal && !archivoSubido) throw new Error("El enlace o archivo no es compatible con el tipo de material.");
    const nuevo = { ...datos, titulo: datos.titulo.trim(), id: "tutorial-" + Date.now() + "-" + Math.random().toString(36).slice(2), fechaPublicacion: new Date().toISOString() };
    this.guardar([...this.listar(), nuevo]);
    return nuevo;
  },
  eliminar(material) {
    const items = this.listar();
    const indice = items.findIndex(t => material.id ? t.id === material.id : JSON.stringify(t) === JSON.stringify(material));
    if (indice < 0) throw new Error("Este material ya fue eliminado. Actualiza la lista.");
    items.splice(indice, 1);
    this.guardar(items);
  }
};
