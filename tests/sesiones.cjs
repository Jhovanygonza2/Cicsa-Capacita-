const fs = require("fs"), vm = require("vm"), assert = require("assert/strict");
const data = new Map();
const localStorage = {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),key:i=>[...data.keys()][i],get length(){return data.size}};
let ahora = Date.parse("2026-09-25T15:00:00Z");
class Reloj extends Date { constructor(...args){super(...(args.length?args:[ahora]));} static now(){return ahora;} }
function contexto() {
 const timers=[];
 const ctx=vm.createContext({localStorage,console,Date:Reloj,URLSearchParams,setTimeout:fn=>{fn();return 0},setInterval:fn=>{timers.push(fn);return timers.length},alert(){},window:{location:{pathname:"/index.html",replace(){}},addEventListener(){}}});
 vm.runInContext(fs.readFileSync("js/api.js","utf8")+"\nthis.app={auth,sesion,reportes,usuarios,solicitar,enviarPulsoUso,dbListaPromise};",ctx);
 return {...ctx.app,timers};
}
const registros=()=>JSON.parse(data.get("cicsa_sesiones_uso")||"[]");
(async()=>{
 let app=contexto(); await app.dbListaPromise;
 async function login(nombre,password){const r=await app.auth.login(nombre,password); app.sesion.guardar(r.token,r.usuario);}
 await login("ana","Admin2026");
 await app.usuarios.crear({nombre:"Trabajador prueba",correo:"uso@test.mx",password:"Test2026",rol:"trabajador"});
 await assert.rejects(app.auth.login("uso@test.mx","incorrecta"));
 assert.equal(registros().length,0);
 await login("uso@test.mx","Test2026");
 assert.equal(registros().length,1);
 const entrada=registros()[0].entrada;
 await assert.rejects(app.reportes.sesiones());
 await assert.rejects(app.solicitar("GET","/reportes/sesiones"));
 ahora+=30000; app.sesion.vigilarInactividad(); app.timers[0]();
 assert.equal(registros().length,1);
 assert.equal(registros()[0].ultimaSenal,new Reloj().toISOString());
 app=contexto(); await app.dbListaPromise; app.sesion.vigilarInactividad();
 assert.equal(registros().length,1,"Recarga conserva la sesión");
 ahora+=30000; app.sesion.cerrar();
 assert.equal(registros()[0].salida,new Reloj().toISOString());
 assert.equal(registros()[0].motivo,"cierre_manual");
 assert.equal(registros()[0].estimada,false);
 assert.equal(Date.parse(registros()[0].salida)-Date.parse(entrada),60000);
 await login("instructor","Instructor2026");
 await assert.rejects(app.reportes.sesiones());
 assert.equal(registros().length,1);
 await login("administrador","AdminDemo2026");
 assert.equal((await app.reportes.sesiones()).length,1);
 await login("uso@test.mx","Test2026");
 ahora+=30000; app.enviarPulsoUso();
 const ultima=registros()[1].ultimaSenal;
 ahora+=120001;
 await login("ana","Admin2026");
 let reporte=await app.reportes.sesiones();
 assert.equal(reporte[1].salida,ultima);
 assert.equal(reporte[1].estimada,true);
 assert.equal(reporte[1].motivo,"sin_senal");
 await login("uso@test.mx","Test2026");
 app=contexto(); await app.dbListaPromise; app.sesion.vigilarInactividad();
 // Mantener pulsos, pero ninguna interacción: cierre a los 20 minutos.
 for(let i=0;i<41;i++){ahora+=30000; app.timers[0]();}
 assert.equal(registros()[2].motivo,"inactividad");
 assert.equal(app.sesion.activa(),false);
 await login("uso@test.mx","Test2026");
 const viejo=contexto(); await viejo.dbListaPromise; viejo.sesion.vigilarInactividad();
 await login("administrador","AdminDemo2026");
 const cantidad=registros().length;
 ahora+=30000; viejo.timers[0]();
 assert.equal(registros().length,cantidad,"Pestaña vieja no inicia otra sesión");
 assert.equal(registros().at(-1).motivo,"cambio_cuenta");
 console.log("PASS: registro, permisos de cuatro roles, pulso, recarga, cierre manual, salida estimada, inactividad y pestañas.");
})().catch(e=>{console.error(e);process.exitCode=1;});
