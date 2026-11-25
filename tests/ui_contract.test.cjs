// Minimal DOM contract for all page initialisers, not a layout/accessibility test.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class Element {
 constructor(tag){this.tagName=tag;this.children=[];this.className="";this.style={};this.dataset={};this.attributes={};this.value="";this.hidden=false;this.textContent="";this.innerHTML=""}
 append(...items){this.children.push(...items)}
 replaceChildren(...items){this.children=items}
 setAttribute(k,v){this.attributes[k]=v}
 querySelectorAll(){return []}
 querySelector(){return null}
 scrollIntoView(){}
}
test('all Studio screen initialisers: demo and empty model',()=>{
  const html=fs.readFileSync(path.resolve(__dirname,"../dist/WinMatch-BIM-Studio.html"),'utf8');
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  assert.equal(scripts.length,2);
  const map=new Map(),doc={createElement:t=>new Element(t),getElementById(id){if(!map.has(id))map.set(id,new Element("div"));return map.get(id)},documentElement:new Element("html"),body:new Element("body")};
  const context=vm.createContext({document:doc,window:{scrollTo(){},innerWidth:1440},structuredClone,localStorage:{getItem:()=>null,setItem(){}},console,setTimeout:()=>0,clearTimeout(){},confirm:()=>true});
  scripts.forEach(code=>vm.runInContext(code,context));
  for(const v of ["Schedule","Model review","Type catalogue","Manufacturer library","Sheet designer","Measured quantities","Pricing","Curtain wall","Site climate","Estimating bridges","Revision compare","Export"]){
    vm.runInContext("setTab("+JSON.stringify(v)+")",context);assert.ok(map.get("main").children.length>=1,v)
  }
  vm.runInContext('load({schemaVersion:"1.0.0",source:"IFC",projectId:"empty",projectName:"Empty",openings:[]})',context);
  for(const v of ["Schedule","Model review","Type catalogue","Manufacturer library","Sheet designer","Measured quantities","Pricing","Curtain wall","Site climate","Estimating bridges","Revision compare","Export"]){
    vm.runInContext("setTab("+JSON.stringify(v)+")",context);assert.ok(map.get("main").children.length>=1,v)
  }
});
