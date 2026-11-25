/* WinMatch BIM shared data and schedule engine — MIT */
(function (root) {
  "use strict";
  const VERSION = "1.0.0";
  const text = v => typeof v === "string" ? v.trim() : "";
  const mm = v => typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : null;
  const optionalMm = v => typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : null;
  const dimensionFields=["openingWidthMm","openingHeightMm","actualWidthMm","actualHeightMm","subsillDepthMm","subsillHeightMm","subsillLengthMm","revealDepthMm"];
  const fields = [...dimensionFields,"mark","kind","widthMm","heightMm","level","room","typeName","operation","material","glazing","orientation","sillMm","notes","handing","series","colour","hardware","manufacturer","sku"];
  const editFields = ["mark","room","operation","material","glazing","orientation","notes","handing","series","colour","hardware","manufacturer","sku"];
  const area = o => o.widthMm && o.heightMm ? o.widthMm * o.heightMm / 1e6 : null;
  function normalize(x) {
    if (!x || x.schemaVersion !== VERSION || !text(x.source) || !text(x.projectId) || !Array.isArray(x.openings)) throw Error("Expected a WinMatch snapshot (schema 1.0.0).");
    if (x.openings.length > 50000) throw Error("This desktop preview supports up to 50,000 openings.");
    const seen = new Set();
    return {
      schemaVersion: VERSION, source: text(x.source), projectId: text(x.projectId), projectName: text(x.projectName) || "Untitled project",
      capturedAt: text(x.capturedAt), hostVersion: text(x.hostVersion),
      quantitySettings: quantitySettings(x.quantitySettings),
      priceSettings: priceSettings(x.priceSettings),
      siteContext: siteContext(x.siteContext,x.source==="Demo"),
      curtainWalls: Array.isArray(x.curtainWalls)?x.curtainWalls.slice(0,10000).map(c=>({id:text(c.id),mark:text(c.mark),typeName:text(c.typeName),level:text(c.level),modelWidthMm:mm(c.modelWidthMm),modelHeightMm:mm(c.modelHeightMm),panels:Number.isInteger(c.panels)?c.panels:null,mullions:Number.isInteger(c.mullions)?c.mullions:null,uLines:Number.isInteger(c.uLines)?c.uLines:null,vLines:Number.isInteger(c.vLines)?c.vLines:null})):[],
      curtainDesign: curtainDesign(x.curtainDesign),
      warnings: Array.isArray(x.warnings) ? x.warnings.map(text).filter(Boolean) : [],
      openings: x.openings.map((o,i) => {
        if (!o || !text(o.id)) throw Error("Opening " + (i+1) + " has no stable ID.");
        const id = text(o.id);
        if (seen.has(id)) throw Error("Duplicate stable ID: " + id);
        seen.add(id);
        const kind = text(o.kind).toLowerCase();
        if (!["window","door"].includes(kind)) throw Error("Unsupported opening kind at row " + (i+1));
        const row = {id,kind,widthMm:mm(o.widthMm),heightMm:mm(o.heightMm),sillMm:optionalMm(o.sillMm)};
        for(const f of dimensionFields)row[f]=["openingWidthMm","openingHeightMm","actualWidthMm","actualHeightMm"].includes(f)?mm(o[f]):optionalMm(o[f]);
        for (const f of fields) if (!(f in row)) row[f] = text(o[f]);
        row.dimensionBasis = text(o.dimensionBasis) || "Unspecified";
        row.hostRef = text(o.hostRef);
        row.revealMode = ["auto","none","head","jambs","three","four"].includes(o.revealMode)?o.revealMode:"auto";
        row.lintelIncluded = o.lintelIncluded===true;
        row.flashingIncluded = o.flashingIncluded===true;
        row.priceMode=o.priceMode==="area"?"area":"each";
        row.supplyRate=optionalMm(o.supplyRate);row.installRate=optionalMm(o.installRate);
        return row;
      })
    };
  }
  function audit(rows) {
    const marks = new Map();
    rows.forEach(o=> {const k = text(o.mark).toLocaleUpperCase();if(k) marks.set(k,(marks.get(k)||0)+1);});
    return rows.map(o => {
      const issues = [];
      if(!o.mark) issues.push({code:"missing-id",label:"Missing mark",severity:"error"});
      if(o.mark && marks.get(o.mark.toLocaleUpperCase()) > 1) issues.push({code:"duplicate-mark",label:"Repeated mark — check intent",severity:"review"});
      if(!o.widthMm || !o.heightMm) issues.push({code:"dimensions",label:"Missing dimensions",severity:"error"});
      if(o.dimensionBasis === "Unspecified") issues.push({code:"basis",label:"Dimension basis unknown",severity:"review"});
      if(!o.level) issues.push({code:"level",label:"Level not assigned",severity:"review"});
      if(!o.operation) issues.push({code:"operation",label:"Operation not specified",severity:"review"});
      if(!o.glazing) issues.push({code:"glazing",label:"Glazing not specified",severity:"review"});
      if(!o.material) issues.push({code:"material",label:"Frame material not specified",severity:"review"});
      return {id:o.id,issues};
    });
  }
  function summary(rows) {
    const checks = audit(rows), complete = checks.filter(r=>!r.issues.length).length;
    return {total:rows.length, windows:rows.filter(o=>o.kind==="window").length,doors:rows.filter(o=>o.kind==="door").length,
      area:rows.reduce((a,o)=>a+(area(o)||0),0),unknownArea:rows.filter(o=>area(o)===null).length,
      ready:complete,review:rows.length-complete,percent:rows.length?Math.round(100*complete/rows.length):0};
  }
  function changes(previous,current) {
    if (previous.projectId!==current.projectId || previous.source!==current.source) throw Error("Snapshots must be from the same source and project.");
    const old = new Map(previous.openings.map(o=>[o.id,o])), now=new Map(current.openings.map(o=>[o.id,o]));
    const result=[];
    for(const o of current.openings) {
      const p=old.get(o.id);
      if(!p) result.push({id:o.id,mark:o.mark,type:"Added",changes:[]});
      else {
        const diff=[...fields,"dimensionBasis","revealMode","lintelIncluded","flashingIncluded","priceMode","supplyRate","installRate"].filter(f=>p[f]!==o[f]).map(f=>({field:f,before:p[f],after:o[f]}));
        if(diff.length) result.push({id:o.id,mark:o.mark,type:"Changed",changes:diff});
      }
    }
    for(const p of previous.openings) if(!now.has(p.id)) result.push({id:p.id,mark:p.mark,type:"Removed",changes:[]});
    return result;
  }
  function markPatch(original,current) {
    if(original.projectId!==current.projectId || original.source!==current.source) throw Error("Project mismatch.");
    const rows=new Map(original.openings.map(o=>[o.id,o]));
    return {schemaVersion:VERSION,patchType:"mark-update",source:current.source,projectId:current.projectId,
      createdAt:new Date().toISOString(),changes:current.openings.filter(o=>rows.has(o.id)&&rows.get(o.id).mark!==o.mark)
      .map(o=>({id:o.id,expectedMark:rows.get(o.id).mark,newMark:o.mark}))};
  }
  function suggestMarks(rows,ids) {
    const wanted=new Set(ids), used=new Set(rows.map(o=>text(o.mark).toUpperCase()).filter(Boolean));
    const next={window:1,door:1};
    return rows.map(o=>{
      if(!wanted.has(o.id)||o.mark) return {...o};
      const prefix=o.kind==="window"?"W":"D";let candidate;
      do {candidate=prefix+String(next[o.kind]++).padStart(2,"0");} while(used.has(candidate));
      used.add(candidate);return {...o,mark:candidate};
    });
  }
  function csvCell(v) {
    let s = v===null||v===undefined?"":String(v);
    if(typeof v==="string" && /^[\s]*[=+\-@\t\r\n]/.test(s)) s="'"+s;
    return '"'+s.replace(/"/g,'""')+'"';
  }
  function csv(rows) {
    const headers=["Mark","Category","Model width mm","Model height mm","Structural opening width mm","Structural opening height mm","Actual unit width mm","Actual unit height mm","Subsill depth mm","Subsill height mm","Subsill length mm","Reveal depth mm","Nominal opening area m²","Level","Room","Type","Operation","Frame","Glazing","Handing","Series","Colour","Hardware","Manufacturer","SKU","Orientation","Sill mm","Dimension basis","Notes","Stable ID"];
    return "\uFEFF"+[headers,...rows.map(o=>[o.mark,o.kind,o.widthMm,o.heightMm,...dimensionFields.map(f=>o[f]),area(o)?.toFixed(2)??"",o.level,o.room,o.typeName,o.operation,o.material,o.glazing,o.handing,o.series,o.colour,o.hardware,o.manufacturer,o.sku,o.orientation,o.sillMm,o.dimensionBasis,o.notes,o.id])].map(r=>r.map(csvCell).join(",")).join("\r\n");
  }
  function quantitySettings(s={}) {
    const n=(key,def,max)=>typeof s?.[key]==="number"&&Number.isFinite(s[key])?Math.max(0,Math.min(max,s[key])):def;
    return {basis:["model","opening","actual"].includes(s?.basis)?s.basis:"model",revealWastePct:n("revealWastePct",0,100),lintelBearingMm:n("lintelBearingMm",0,10000),flashingExtensionMm:n("flashingExtensionMm",300,10000),flashingWastePct:n("flashingWastePct",20,100)};
  }
  function takeoff(o,options={}) {
    const q=quantitySettings(options),mode=o.revealMode==="auto"||!o.revealMode?(o.kind==="window"?"four":"three"):o.revealMode;
    const w=q.basis==="opening"?o.openingWidthMm:q.basis==="actual"?o.actualWidthMm:o.widthMm,h=q.basis==="opening"?o.openingHeightMm:q.basis==="actual"?o.actualHeightMm:o.heightMm,round=v=>Math.round(v*100)/100;
    const reveal=mode==="none"?0:mode==="head"?(w?w/1000:null):mode==="jambs"?(h?2*h/1000:null):w&&h?((mode==="four"?2*w:w)+2*h)/1000:null;
    return {areaM2:w>0&&h>0?w*h/1e6:null,revealLm:reveal==null?null:round(reveal*(1+q.revealWastePct/100)),
      lintelLm:o.lintelIncluded?(w?round((w+2*q.lintelBearingMm)/1000):null):0,
      flashingLm:o.flashingIncluded?(w?round((w+2*q.flashingExtensionMm)/1000*(1+q.flashingWastePct/100)):null):0};
  }
  const manufacturerFields = [...dimensionFields,"mark","kind","widthMm","heightMm","quantity","areaM2","revealLm","lintelLm","flashingLm","level","room","typeName","operation","handing","material","glazing","series","colour","hardware","manufacturer","sku","orientation","sillMm","dimensionBasis","notes","id"];
  function mappedCsv(rows, columns, units="mm",options={}) {
    if (!Array.isArray(columns) || !columns.length || columns.length>50) throw Error("Choose 1–50 export columns.");
    const names=new Set();
    for(const c of columns) {
      if(!c || !text(c.header) || !manufacturerFields.includes(c.field)) throw Error("Invalid export column.");
      if(names.has(c.header.trim().toLowerCase()))throw Error("Duplicate export column: "+c.header);
      names.add(c.header.trim().toLowerCase());
    }
    if(!["mm","in"].includes(units))throw Error("Unsupported units.");
    function value(o,f) {
      if(f==="quantity")return 1;
      if(["areaM2","revealLm","lintelLm","flashingLm"].includes(f))return takeoff(o,options)[f]?.toFixed(2)??"";
      if(["widthMm","heightMm","sillMm",...dimensionFields].includes(f))return o[f]==null?"":units==="in"?Number((o[f]/25.4).toFixed(2)):o[f];
      return o[f]??"";
    }
    return "\uFEFF"+[columns.map(c=>c.header),...rows.map(o=>columns.map(c=>value(o,c.field)))].map(r=>r.map(csvCell).join(",")).join("\r\n");
  }
  function parseCsv(input) {
    if(typeof input!=="string"||input.length>10000000)throw Error("Invalid catalogue CSV.");
    let rows=[],row=[],cell="",quoted=false;const str=input.replace(/^\uFEFF/,"");
    for(let i=0;i<str.length;i++){const c=str[i];if(quoted){if(c==='"'&&str[i+1]==='"'){cell+='"';i++}else if(c==='"')quoted=false;else cell+=c}
    else if(c==='"'&&!cell)quoted=true;else if(c===","){row.push(cell);cell=""}else if(c==="\n"||c==="\r"){if(c==="\r"&&str[i+1]==="\n")i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell=""}else cell+=c}
    if(quoted)throw Error("Unclosed quoted CSV field.");row.push(cell);if(row.some(Boolean))rows.push(row);
    if(!rows.length)throw Error("Catalogue CSV is empty.");const h=rows.shift().map(v=>v.trim().toLowerCase());if(new Set(h).size!==h.length)throw Error("Duplicate catalogue headers.");
    return rows.map((r,i)=>{if(r.length!==h.length)throw Error("Wrong number of columns on catalogue row "+(i+2));return Object.fromEntries(h.map((k,j)=>[k,r[j]]))});
  }
  function catalogue(input) {
    const raw=Array.isArray(input)?input:input?.products;
    if(!Array.isArray(raw)||raw.length>25000)throw Error("Expected a catalogue array or {products:[]} (up to 25,000 products).");
    const seen=new Set();
    return raw.map((r,i)=>{
      const manufacturer=text(r.manufacturer),sku=text(r.sku),kind=text(r.kind).toLowerCase();
      const widthMm=mm(Number(r.width_mm??r.widthMm)),heightMm=mm(Number(r.height_mm??r.heightMm));
      if(!manufacturer||!sku||!["window","door"].includes(kind)||!widthMm||!heightMm)throw Error("Catalogue row "+(i+1)+" needs manufacturer, SKU, kind and positive width/height in mm.");
      const key=JSON.stringify([manufacturer,sku]);if(seen.has(key))throw Error("Duplicate manufacturer + SKU on row "+(i+1));seen.add(key);
      return {manufacturer,sku,kind,widthMm,heightMm,operation:text(r.operation),handing:text(r.handing),series:text(r.series),material:text(r.material),glazing:text(r.glazing),colour:text(r.colour),notes:text(r.notes)};
    })
  }
  function matchProducts(opening,products,tolerance=50) {
    if(!opening||!opening.widthMm||!opening.heightMm)return [];
    if(!Number.isFinite(tolerance)||tolerance<0||tolerance>500)throw Error("Tolerance must be 0–500 mm.");
    return products.filter(p=>p.kind===opening.kind&&Math.abs(p.widthMm-opening.widthMm)<=tolerance&&Math.abs(p.heightMm-opening.heightMm)<=tolerance)
      .map(p=>{const dw=p.widthMm-opening.widthMm,dh=p.heightMm-opening.heightMm,conflicts=[],unknown=[];
        for(const f of ["operation","handing","material","glazing","colour"]) {
          if(!opening[f]||!p[f])unknown.push(f);
          else if(opening[f].toLowerCase()!==p[f].toLowerCase())conflicts.push(f);
        }
        return {product:p,dw,dh,conflicts,unknown,status:conflicts.length?"Specification differs":dw||dh?"Near size":unknown.length?"Exact size · verify specs":"Exact size & listed specs"};})
      .sort((a,b)=>a.conflicts.length-b.conflicts.length||Math.abs(a.dw)+Math.abs(a.dh)-Math.abs(b.dw)-Math.abs(b.dh));
  }
  function priceSettings(s={}) {
    const num=(k,max=1e9)=>typeof s?.[k]==="number"&&Number.isFinite(s[k])?Math.max(0,Math.min(max,s[k])):0;
    return {currency:["AUD","NZD","USD","EUR","GBP","CAD","CNY"].includes(s?.currency)?s.currency:"AUD",
      revealRate:num("revealRate"),lintelRate:num("lintelRate"),flashingRate:num("flashingRate"),markupPct:num("markupPct",500),taxPct:num("taxPct",100)};
  }
  function estimate(o,quantityOptions,pricingOptions) {
    const q=takeoff(o,quantityOptions),p=priceSettings(pricingOptions);
    const supply=o.supplyRate==null?null:o.priceMode==="area"?q.areaM2==null?null:o.supplyRate*q.areaM2:o.supplyRate;
    const extras=[["revealLm","revealRate"],["lintelLm","lintelRate"],["flashingLm","flashingRate"]];
    const incomplete=extras.some(([qty,rate])=>p[rate]>0&&q[qty]==null);
    const accessory=incomplete?null:extras.reduce((a,[qty,rate])=>a+(q[qty]||0)*p[rate],0);
    const cost=supply==null||accessory==null?null:supply+(o.installRate??0)+accessory;
    const sell=cost==null?null:cost*(1+p.markupPct/100);
    const round=x=>x==null?null:Math.round(x*100)/100;
    return {supply:round(supply),installation:round(o.installRate??0),accessory:round(accessory),cost:round(cost),sell:round(sell),total:round(sell==null?null:sell*(1+p.taxPct/100))};
  }
  function curtainDesign(c={}) {
    const dims=(a,d)=>Array.isArray(a)&&a.length>=1&&a.length<=20&&a.every(v=>typeof v==="number"&&Number.isFinite(v)&&v>0&&v<=25000)?a.map(v=>Math.round(v*100)/100):d;
    const widths=dims(c?.widths,[1200,1200,1200]),heights=dims(c?.heights,[1500,1500]);
    const types={};for(const [k,v] of Object.entries(c?.types||{}))if(/^\d+-\d+$/.test(k)&&["Glazing","Spandrel","Operable","Door","Opaque"].includes(v))types[k]=v;
    return {mark:text(c?.mark)||"CW01",widths,heights,types};
  }
  function curtainQuantities(design) {
    const c=curtainDesign(design),w=c.widths.reduce((a,b)=>a+b,0),h=c.heights.reduce((a,b)=>a+b,0),panels=[];
    for(let r=0;r<c.heights.length;r++)for(let col=0;col<c.widths.length;col++)panels.push({id:c.mark+"-P"+(r+1)+"-"+(col+1),row:r,column:col,widthMm:c.widths[col],heightMm:c.heights[r],areaM2:c.widths[col]*c.heights[r]/1e6,type:c.types[r+"-"+col]||"Glazing"});
    return {widthMm:w,heightMm:h,areaM2:w*h/1e6,panels,
      internalMullionLm:((c.widths.length-1)*h+(c.heights.length-1)*w)/1000,perimeterLm:2*(w+h)/1000};
  }
  function siteContext(c={},demo=false) {
    const n=(key,def,min,max)=>typeof c?.[key]==="number"&&Number.isFinite(c[key])?Math.max(min,Math.min(max,c[key])):def;
    return {latitude:n("latitude",demo?-27.47:0,-89.9,89.9),longitude:n("longitude",demo?153.03:0,-180,180),northBearing:n("northBearing",0,0,360),summerWind:n("summerWind",45,0,360),winterWind:n("winterWind",225,0,360),siteNotes:text(c?.siteNotes),locationConfirmed:c?.locationConfirmed===true||demo};
  }
  function solarPosition(latitude,declination,solarHour) {
    const rad=Math.PI/180,phi=latitude*rad,d=declination*rad,H=(solarHour-12)*15*rad;
    const altitude=Math.asin(Math.sin(phi)*Math.sin(d)+Math.cos(phi)*Math.cos(d)*Math.cos(H));
    const x=-Math.sin(H)*Math.cos(d),y=Math.cos(phi)*Math.sin(d)-Math.sin(phi)*Math.cos(d)*Math.cos(H);
    return {altitude:altitude/rad,azimuth:(Math.atan2(x,y)/rad+360)%360};
  }
  function databuildVariables(rows,options) {
    const vals={wmWinCount:rows.filter(o=>o.kind==="window").length,wmDoorCount:rows.filter(o=>o.kind==="door").length,wmAreaM2:0,wmRevealLM:0,wmLintelLM:0,wmFlashLM:0,wmSubsillLM:0};
    for(const o of rows){const t=takeoff(o,options);for(const [v,f] of [["wmAreaM2","areaM2"],["wmRevealLM","revealLm"],["wmLintelLM","lintelLm"],["wmFlashLM","flashingLm"]]){if(t[f]==null)throw Error("Incomplete quantity for "+(o.mark||o.id)+": "+f);vals[v]+=t[f]}vals.wmSubsillLM+=(o.subsillLengthMm||0)/1000}
    for(const k of Object.keys(vals))vals[k]=Math.round(vals[k]*100)/100;
    return vals;
  }
  function databuildXml(rows,q,carrier) {
    const x=v=>String(v).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
    for(const f of ["jobNo","costCentre","itemCode"])if(!/^[A-Za-z0-9_-]{1,20}$/.test(carrier[f]||""))throw Error("Enter a valid "+f+" (1–20 alphanumeric, dash or underscore).");
    const load=Number(carrier.bLoad);if(!Number.isInteger(load)||load<0)throw Error("Invalid bill load.");
    const v=databuildVariables(rows,q),qgen=Object.entries(v).map(([k,n])=>n.toFixed(2)+"^^["+k+"]").join(" [LF] ");
    return '<?xml version="1.0" encoding="UTF-8"?>\n<Databuild><Bill><BillRecord><BLoad>'+load+'</BLoad><CostCentre>'+x(carrier.costCentre)+'</CostCentre><ItemCode>'+x(carrier.itemCode)+'</ItemCode><JobNo>'+x(carrier.jobNo)+'</JobNo><Price>0</Price><PriceLevel>1</PriceLevel><PriceLock>False</PriceLock><QGen>'+x(qgen)+'</QGen><Quantity>1</Quantity><UnitPrice>0</UnitPrice></BillRecord></Bill></Databuild>';
  }
  function bluebeamSnapshot(input,projectId) {
    if(!text(projectId))throw Error("Enter a stable project ID.");
    const rows=parseCsv(input),openings=[];
    for(const [i,r] of rows.entries()){
      const subject=text(r.subject),kind=/door|stacker|bifold/i.test(subject)?"door":/window|awning|casement|louvre/i.test(subject)?"window":null;
      if(!kind)continue;
      const qty=Number(r.count||1),w=mm(Number(r.width)),h=mm(Number(r.height));
      if(!Number.isInteger(qty)||qty<1||qty>1000||!w||!h)throw Error("Invalid width, height or count on Bluebeam row "+(i+2)+"; use mm.");
      for(let j=0;j<qty;j++)openings.push({id:"bb-"+(i+1)+"-"+(j+1),kind,mark:text(r.label||r.mark),widthMm:w,heightMm:h,typeName:subject,operation:"",level:text(r.level),room:text(r.room),notes:[text(r["page label"]),text(r.comments)].filter(Boolean).join(" · "),dimensionBasis:"Bluebeam user-entered dimension (mm)"});
      if(openings.length>50000)throw Error("Too many openings.");
    }
    if(!openings.length)throw Error("No recognised window/door markup rows.");
    return {schemaVersion:VERSION,source:"Bluebeam CSV",projectId,projectName:projectId,capturedAt:new Date().toISOString(),warnings:["Bluebeam row-derived IDs are not persistent BIM GUIDs; revision compare is unreliable if row order changes. Width and height are explicit user-entered mm values."],openings}
  }
  const api={VERSION,normalize,audit,summary,area,changes,markPatch,suggestMarks,csv,fields,editFields,manufacturerFields,mappedCsv,parseCsv,catalogue,matchProducts,quantitySettings,takeoff,dimensionFields,priceSettings,estimate,curtainDesign,curtainQuantities,siteContext,solarPosition,databuildVariables,databuildXml,bluebeamSnapshot};
  if(typeof module!=="undefined" && module.exports) module.exports=api;
  else root.WinMatch=api;
})(globalThis);
