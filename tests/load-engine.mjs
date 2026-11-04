// Loads the chemistry engine (the region between /*ENGINE-BEGIN*/ and /*ENGINE-END*/ in index.html)
// without a browser, so counts can be tested. index.html stays the only shipped file.
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

export function loadEngine(exportNames){
  const file=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','index.html');
  const html=fs.readFileSync(file,'utf8');
  const a=html.indexOf('/*ENGINE-BEGIN*/'), b=html.indexOf('/*ENGINE-END*/');
  if(a<0||b<0||b<a) throw new Error('ENGINE markers not found in index.html');
  // the vector classes sit just above the engine; the engine needs them
  const head=html.slice(html.indexOf('class Vec3'),html.indexOf('const $ = '));
  const code=head+'\nconst $=()=>null,$$=()=>[];\n"use strict";\n'+html.slice(a,b)+
    '\n;this.__E={'+exportNames.join(',')+'};';
  const ctx={console,Math,Object,Array,Set,Map,JSON,String,Number,Error,RegExp};
  vm.createContext(ctx); vm.runInContext(code,ctx,{filename:'engine'});
  return ctx.__E;
}
