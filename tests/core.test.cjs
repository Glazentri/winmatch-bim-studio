const {test}=require('node:test');
const assert=require('node:assert/strict');
const W=require('../studio/core.js');
const row={id:"1",kind:"window",mark:"W01",widthMm:1200,heightMm:900,level:"GF",operation:"Awning",material:"Aluminium",glazing:"Double",dimensionBasis:"Nominal",sillMm:0};
const doc=(rows=[row],projectId="p")=>W.normalize({schemaVersion:"1.0.0",source:"Revit",projectId,projectName:"Example",openings:rows});
test('normalisation, mm, area and missing values',()=>{const x=doc();assert.equal(x.openings[0].sillMm,0);assert.equal(W.area(x.openings[0]),1.08);assert.equal(W.summary(x.openings).percent,100);assert.equal(doc([{...row,widthMm:"1200"}]).openings[0].widthMm,null);assert.equal(W.area(doc([{...row,widthMm:-1}]).openings[0]),null)});
test('reject duplicate ids, unsupported kind, bad version',()=>{assert.throws(()=>doc([row,row]),/Duplicate/);assert.throws(()=>doc([{...row,kind:"wall"}]),/Unsupported/);assert.throws(()=>W.normalize({schemaVersion:"0"}),/Expected/)});
test('audit repeated case insensitive marks, missing dims, no certification',()=>{const x=doc([row,{...row,id:"2",mark:"w01",heightMm:null}]);assert.equal(W.audit(x.openings)[0].issues[0].code,"duplicate-mark");assert.ok(W.audit(x.openings)[1].issues.some(i=>i.code==="dimensions"))});
test('suggest missing marks only and avoid collisions',()=>{const x=doc([row,{...row,id:"2",mark:""},{...row,id:"3",kind:"door",mark:""}]);const y=W.suggestMarks(x.openings,["2","3"]);assert.deepEqual(y.map(o=>o.mark),["W01","W02","D01"]);assert.equal(x.openings[1].mark,"")});
test('revision compare identity and field changes',()=>{const a=doc([row,{...row,id:"2"}]);const b=doc([{...row,heightMm:1000},{...row,id:"3"}]);const c=W.changes(a,b);assert.deepEqual(c.map(x=>x.type),["Changed","Added","Removed"]);assert.equal(c[0].changes[0].field,"heightMm");assert.throws(()=>W.changes(a,doc([],"wrong")),/same source and project/)});
test('mark patch excludes other fields, optimistic precondition',()=>{const a=doc(),b=doc([{...row,mark:"W03",notes:"new",heightMm:1400}]);assert.deepEqual(W.markPatch(a,b).changes,[{id:"1",expectedMark:"W01",newMark:"W03"}])});
test('CSV quoting and spreadsheet formula protection',()=>{const x=doc([{...row,mark:"=SUM(1,2)",notes:'abc,"hi"'}]);const csv=W.csv(x.openings);assert.ok(csv.includes('"\'=SUM(1,2)"'));assert.ok(csv.includes('"abc,""hi"""'));assert.ok(csv.includes("Stable ID"))});
test('mapped CSV ordered headers, quantity and inches',()=>{const csv=W.mappedCsv(doc([{...row,widthMm:254}]).openings,[{header:"W",field:"widthMm"},{header:"Qty",field:"quantity"}],"in");assert.equal(csv,'\uFEFF"W","Qty"\r\n"10","1"');assert.throws(()=>W.mappedCsv([],[{header:"W",field:"bad"}]),/Invalid/);assert.throws(()=>W.mappedCsv([],[{header:"W",field:"mark"},{header:"w",field:"kind"}]),/Duplicate/)});
test('catalogue CSV parser handles quotes, CRLF, embedded line break',()=>{const data=W.parseCsv('manufacturer,sku,kind,width_mm,height_mm,notes\r\n"Demo, Inc",X,window,1200,900,"a\nb"');assert.equal(data[0].manufacturer,"Demo, Inc");assert.equal(data[0].notes,"a\nb");assert.throws(()=>W.parseCsv('a,b\n"x'),/Unclosed/)});
test('catalogue matching exact, near, conflicts and unknown; no dimension mutation',()=>{const p=W.catalogue([{manufacturer:"Demo",sku:"A",kind:"window",width_mm:1200,height_mm:900,operation:"Awning"},{manufacturer:"Demo",sku:"B",kind:"window",width_mm:1250,height_mm:900,operation:"Sliding"},{manufacturer:"Demo",sku:"C",kind:"door",width_mm:1200,height_mm:900}]);const matches=W.matchProducts(doc().openings[0],p,50);assert.deepEqual(matches.map(m=>m.product.sku),["A","B"]);assert.equal(matches[0].status,"Exact size · verify specs");assert.deepEqual(matches[1].conflicts,["operation"]);assert.equal(W.matchProducts({...row,widthMm:null},p).length,0);assert.throws(()=>W.catalogue([{manufacturer:"Demo",sku:"X",kind:"window",width_mm:"no",height_mm:900}]),/positive/)});
test('quantity basis and allowances preserve actual vs opening sizes',()=>{
 const o=doc([{...row,openingWidthMm:1240,openingHeightMm:940,actualWidthMm:1180,actualHeightMm:880,revealMode:"four",lintelIncluded:true,flashingIncluded:true}]).openings[0];
 assert.deepEqual(W.takeoff(o,{basis:"model",lintelBearingMm:150,flashingExtensionMm:300,flashingWastePct:20}),{areaM2:1.08,revealLm:4.2,lintelLm:1.5,flashingLm:2.16});
 assert.equal(W.takeoff(o,{basis:"opening"}).areaM2,1.1656);assert.equal(W.takeoff(o,{basis:"actual"}).revealLm,4.12);
 assert.equal(W.takeoff(doc().openings[0],{basis:"actual"}).areaM2,null);
});
test('price calculation, missing rates and unpriced quantities',()=>{
 const o=doc([{...row,supplyRate:500,priceMode:"area",installRate:100}]).openings[0];const p=W.estimate(o,{basis:"model"},{revealRate:10,markupPct:20,taxPct:10});
 assert.equal(p.supply,540);assert.equal(p.accessory,42);assert.equal(p.cost,682);assert.equal(p.sell,818.4);assert.equal(p.total,900.24);
 assert.equal(W.estimate(doc().openings[0],{},{}).total,null)
});
test('curtain quantities, non-uniform modules and solar position',()=>{
 const t=W.curtainQuantities({mark:"CW",widths:[1000,2000],heights:[1000,1500],types:{"1-0":"Door"}});
 assert.equal(t.areaM2,7.5);assert.equal(t.panels.length,4);assert.equal(t.panels[2].type,"Door");assert.equal(t.internalMullionLm,5.5);assert.equal(t.perimeterLm,11);
 const pos=W.solarPosition(-27.47,-23.44,12);assert.ok(Math.abs(pos.altitude-85.97)<0.02);assert.ok(Math.abs(pos.azimuth)<0.02);
});
test('Databuild XML and documented absolute assignment syntax',()=>{
 const x=doc([{...row,subsillLengthMm:1200}]);const v=W.databuildVariables(x.openings,x.quantitySettings);assert.equal(v.wmWinCount,1);assert.equal(v.wmSubsillLM,1.2);
 const xml=W.databuildXml(x.openings,x.quantitySettings,{jobNo:"1",costCentre:"900",itemCode:"0001",bLoad:1});assert.ok(xml.includes("1.00^^[wmWinCount] [LF]"));assert.ok(xml.includes("<QGen>"));assert.throws(()=>W.databuildXml(x.openings,{},{}),/Enter a valid/);
 assert.throws(()=>W.databuildVariables(doc([{...row,widthMm:null}]).openings,{}),/Incomplete/)
});
test('Bluebeam explicit mm and count conversion',()=>{
 const s=W.normalize(W.bluebeamSnapshot("Subject,Label,Count,Width,Height\nSliding door,D01,2,2400,2100\nLintel,Q01,1,500,100","p"));assert.equal(s.openings.length,2);assert.equal(s.openings[0].kind,"door");assert.notEqual(s.openings[0].id,s.openings[1].id);
 assert.throws(()=>W.bluebeamSnapshot("Subject,Label,Count,Width,Height\nWindow,W01,1,m,1200","p"),/Invalid/)
});
