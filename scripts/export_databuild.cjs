// SPDX-License-Identifier: MIT
const fs=require("node:fs"),W=require("../studio/core.js");
const [input,output,jobNo,costCentre,itemCode,bLoad="1"]=process.argv.slice(2);
if(!input||!output||!jobNo||!costCentre||!itemCode){
  console.error("Usage: node scripts/export_databuild.cjs snapshot.json output.xml jobNo costCentre itemCode [bLoad]");
  process.exit(2);
}
try{
  const snap=W.normalize(JSON.parse(fs.readFileSync(input,"utf-8")));
  const xml=W.databuildXml(snap.openings,snap.quantitySettings,{jobNo,costCentre,itemCode,bLoad});
  fs.writeFileSync(output,xml,"utf-8");
  console.log(JSON.stringify(W.databuildVariables(snap.openings,snap.quantitySettings),null,2));
}catch(e){console.error(e.message);process.exit(1)}
