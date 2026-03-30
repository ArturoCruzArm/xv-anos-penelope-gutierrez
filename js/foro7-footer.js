// foro7-footer.js — Link Foro 7 en footer + registro Supabase
(function(){
'use strict';
var SB='https://nzpujmlienzfetqcgsxz.supabase.co';
var K='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56cHVqbWxpZW56ZmV0cWNnc3h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2ODYzMzYsImV4cCI6MjA5MDI2MjMzNn0.xl3lsb-KYj5tVLKTnzpbsdEGoV9ySnswH4eyRuyEH1s';
var H={'apikey':K,'Authorization':'Bearer '+K,'Content-Type':'application/json'};
var URLS=[
  {url:'https://foro7.invitados.org',          label:'foro7.invitados.org'},
  {url:'https://invitados.org',                label:'invitados.org'},
  {url:'https://producciones-foro7.invitados.org', label:'Producciones Foro\u00a07'}
];
function sid(){var s=localStorage.getItem('foro7_sid');if(!s){s=crypto.randomUUID();localStorage.setItem('foro7_sid',s);}return s;}
function slug(){return(window.RSVP_CONFIG&&window.RSVP_CONFIG.slug)||(window.EVENT_CONFIG&&window.EVENT_CONFIG.slug)||'';}
function pick(){var t=slug()||location.pathname;var h=0;for(var i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))|0;return URLS[Math.abs(h)%URLS.length];}
function track(){
  var s=slug();if(!s)return;
  fetch(SB+'/rest/v1/eventos?slug=eq.'+s+'&select=id&limit=1',{headers:H})
    .then(function(r){return r.json();})
    .then(function(d){
      if(d[0]&&d[0].id)fetch(SB+'/rest/v1/visitas',{method:'POST',headers:Object.assign({},H,{'Prefer':'return=minimal'}),body:JSON.stringify({evento_id:d[0].id,pagina:'click-foro7',session_id:sid()})});
    }).catch(function(){});
}
function inject(){
  var f=document.querySelector('footer,.footer,[class*="footer"]');
  if(!f||f.querySelector('.foro7-web-link'))return;
  var p=pick();
  var a=document.createElement('a');
  a.href=p.url; a.target='_blank'; a.rel='noopener';
  a.textContent='\uD83C\uDF10 '+p.label;
  a.style.cssText='color:inherit;opacity:.8;text-decoration:none;font-size:.88em;';
  a.addEventListener('click',track);
  var el=document.createElement('p');
  el.className='foro7-web-link'; el.style.marginTop='6px';
  el.appendChild(a); f.appendChild(el);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);
else inject();
})();
