const fs=require("fs"),vm=require("vm"),assert=require("assert/strict");
const data=new Map();
const localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),key:i=>[...data.keys()][i],get length(){return data.size}};
let reloj=0,timer;
function emisor(extra={}) {const eventos={};return {...extra,addEventListener:(k,f)=>{(eventos[k]??=[]).push(f)},removeEventListener:(k,f)=>{eventos[k]=(eventos[k]||[]).filter(x=>x!==f)},emit:(k,event)=>(eventos[k]||[]).map(f=>f(event))};}
const document=emisor({hidden:false});
const ctx=vm.createContext({localStorage,console,document,performance:{now:()=>reloj},URLSearchParams,setTimeout:fn=>{fn();return 0},setInterval:fn=>{timer=fn;return 1},clearInterval(){},window:{location:{pathname:"/index.html",replace(){}},addEventListener(){}}});
vm.runInContext(fs.readFileSync("js/api.js","utf8")+fs.readFileSync("js/validacion-leccion.js","utf8")+"\nthis.app={auth,sesion,usuarios,cursos,progreso,DB,dbListaPromise,reglaConsumoLeccion,cumpleConsumoLeccion,crearControlConsumo};",ctx);
const a=ctx.app;
function control(tipo,video=null,otros={}) {
 const leccion={id:1,tipo,informacion:tipo==="texto"?"Texto para estudiar":"",url:tipo==="texto"?"":"material."+(tipo==="video"?"mp4":"pdf")};
 return a.crearControlConsumo({leccion,contenido:{},raiz:{querySelector:s=>s.startsWith("video")?video:otros[s]||null},clave:"prueba-"+Math.random(),vigente:()=>true,actualizar(){}});
}
function tick(segundos=.25){reloj+=segundos*1000;timer();}
(async()=>{
 await a.dbListaPromise;
 assert.equal(a.cumpleConsumoLeccion({tipo:"lectura",disponible:true},{segundos:119}),false);
 assert.equal(a.cumpleConsumoLeccion({tipo:"lectura",disponible:true},{segundos:120}),true);
 assert.equal(a.cumpleConsumoLeccion({tipo:"video",disponible:true},{duracion:100,tramos:[[0,99]]}),false);
 assert.equal(a.cumpleConsumoLeccion({tipo:"video",disponible:true},{duracion:100,tramos:[[0,50],[0,50]]}),false);
 assert.equal(a.cumpleConsumoLeccion({tipo:"video",disponible:true},{duracion:100,tramos:[[0,50],[50,100]]}),true);
 let c=control("texto");
 document.hidden=true;document.emit("visibilitychange");for(let i=0;i<480;i++)tick();assert.equal(c.evidencia().segundos,0);
 document.hidden=false;document.emit("visibilitychange");for(let i=0;i<479;i++)tick();assert.equal(c.listo(),false);tick();assert.equal(c.listo(),true);c.detener();
 let v=emisor({currentTime:0,duration:10,paused:false,ended:false,seeking:false,playbackRate:1,readyState:4});
 c=control("video",v);v.emit("playing");
 for(let i=1;i<40;i++){v.currentTime=i*.25;tick();}
 v.currentTime=10;v.ended=true;v.paused=true;reloj+=250;v.emit("ended");assert.equal(c.listo(),true,"El final real cuenta hasta el 100 %");c.detener();
 v=emisor({currentTime:0,duration:10,paused:false,ended:false,seeking:false,playbackRate:1,readyState:4});
 c=control("video",v);v.emit("playing");v.seeking=true;v.emit("seeking");v.currentTime=9;v.seeking=false;v.emit("seeked");
 for(let i=1;i<=4;i++){v.currentTime=9+i*.25;tick();}
 assert.equal(c.listo(),false,"Adelantar al final no completa");c.detener();
 v=emisor({currentTime:0,duration:1,paused:false,ended:false,seeking:false,playbackRate:1,readyState:4});
 c=control("video",v);v.emit("playing");v.currentTime=.25;tick();
 v.currentTime=.4;reloj+=150;v.paused=true;v.emit("pause");
 reloj+=5000;v.paused=false;v.emit("playing");v.currentTime=.65;tick();v.currentTime=.9;tick();v.currentTime=1;reloj+=100;v.paused=true;v.ended=true;v.emit("ended");
 assert.equal(c.listo(),true,"Pausar y reanudar conserva todos los tramos vistos");c.detener();
 assert.equal(a.cumpleConsumoLeccion({tipo:"documento",disponible:true},{descargado:true}),true);
 assert.equal(a.cumpleConsumoLeccion({tipo:"video",disponible:true},{descargado:true,segundos:120}),false);
 const pdf=emisor();c=control("documento",null,{"iframe.lector-documento":pdf});for(let i=0;i<480;i++)tick();assert.equal(c.listo(),false,"No cuenta un documento sin cargar");pdf.emit("load");for(let i=0;i<480;i++)tick();assert.equal(c.listo(),true);c.detener();
 const boton=emisor({disabled:false}), aviso={textContent:""}, archivo=emisor({src:"archivo.pdf"});
 c=control("documento",null,{"iframe.lector-documento":archivo,"[data-descargar-material]":boton,"[data-aviso-descarga]":aviso});
 ctx.fetch=async()=>({ok:false});
 await Promise.all(boton.emit("click",{currentTarget:boton}));assert.equal(c.listo(),false,"Descarga fallida no habilita avance");
 ctx.fetch=async()=>({ok:true,blob:async()=>({size:100})});ctx.URL={createObjectURL:()=>"blob:prueba",revokeObjectURL(){}};
 document.createElement=()=>({click(){},remove(){}});document.body={append(){}};
 await Promise.all(boton.emit("click",{currentTarget:boton}));assert.equal(c.listo(),true,"Archivo obtenido e inicio de descarga habilitan avance");c.detener();
 async function login(n,p){const r=await a.auth.login(n,p);a.sesion.guardar(r.token,r.usuario);return r.usuario;}
 await login("ana","Admin2026");
 const curso=await a.cursos.crear({nombre:"Consumo",horas:6,modulos:[{id:500,lecciones:[{id:5001,nombre:"Texto",tipo:"texto",informacion:"Lee"},{id:5002,nombre:"Video",tipo:"video",url:"video.mp4"},{id:5003,nombre:"PDF",tipo:"documento",url:"archivo.pdf"}]}]});
 await a.cursos.asignar(curso.id,{asignadoA:"Todos"});await a.cursos.cambiarEstado(curso.id,"publicado");
 const trabajador=await login("jhovany","Cicsa2026");
 await assert.rejects(a.progreso.completarLeccion(5001,{segundos:120}),/Evaluación del curso/);
 const avances=JSON.parse(data.get("cicsa_progreso")||"{}");avances[trabajador.id]??={};avances[trabajador.id][curso.id]={completadas:[],evaluacionInicialAprobada:true};data.set("cicsa_progreso",JSON.stringify(avances));
 await assert.rejects(a.progreso.completarLeccion(5001));
 await assert.rejects(a.progreso.completarLeccion(5001,{segundos:119}));
 await assert.rejects(a.progreso.completarLeccion(5002,{duracion:10,tramos:[[0,10]]}),/anteriores/);
 await a.progreso.completarLeccion(5001,{segundos:120});
 await assert.rejects(a.progreso.completarLeccion(5002,{duracion:10,tramos:[[0,9.9]]}));
 await a.progreso.completarLeccion(5002,{duracion:10,tramos:[[0,10]]});
 await a.progreso.completarLeccion(5003,{descargado:true});
 assert.equal((await a.progreso.misCursos()).find(x=>x.curso.id===curso.id).progreso.porcentaje,100);
 await a.progreso.completarLeccion(5001); // Revisión de unidades completadas no reinicia requisitos.
 console.log("PASS: 100 % de video, saltos, tramos repetidos, fin real, 120 s visibles, PDF, Evaluación del curso, orden y validación API.");
})().catch(e=>{console.error(e);process.exitCode=1;});
