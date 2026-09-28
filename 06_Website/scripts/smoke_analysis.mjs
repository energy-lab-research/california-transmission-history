import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8').replace(/main\(\);\s*$/, '');
const packed = JSON.parse(fs.readFileSync(path.join(root, 'dist/data.json'), 'utf8'));
const elements = new Map();
function element(id) {
  if (!elements.has(id)) {
    const item = {value:id==='dollar-year'?'nominal':'',textContent:'',listeners:{},inputs:[],buttons:[],_html:'',classList:{toggle(){}},setAttribute(){},scrollIntoView(){},
      set innerHTML(value) { this._html=value; if(['category-options','utility-options','period-options'].includes(id)) this.inputs=[...value.matchAll(/<input type="checkbox" value="([^"]+)"/g)].map(m=>({value:m[1],checked:false,listeners:{},addEventListener(type,fn){this.listeners[type]=fn;}})); this.buttons=[...value.matchAll(/<button\b([^>]*)>/g)].map(m=>({dataset:Object.fromEntries([...m[1].matchAll(/data-([a-z]+)="([^"]+)"/g)].map(x=>[x[1],x[2]]))})); },
      get innerHTML() { return this._html; },
      addEventListener(type,fn){this.listeners[type]=fn;},
      querySelectorAll(selector){return selector.startsWith('button')?this.buttons:this.inputs;},
      insertAdjacentHTML(_position,value){this._html+=value;}
    };
    elements.set(id,item);
  }
  return elements.get(id);
}
const context = vm.createContext({document:{getElementById:element},console,URL,Number,Map,Set,Date,Array,Math});
vm.runInContext(source,context);
const rows=packed.rows.map(r=>vm.runInContext('rowObject',context)(r,packed.sources));
vm.runInContext('analysis',context)(rows);
if (!element('delay-distribution').innerHTML.includes('Within ±90 days')) throw new Error('Aggregate distribution missing');
if (!element('delay-stack').innerHTML.includes('stack-segment')) throw new Error('Type comparison graph missing');
element('delay-stack').buttons[0].onclick();
if(element('delay-drilldown').hidden||!element('delay-drilldown').innerHTML.includes('project keys')) throw new Error('Graph drilldown failed');
const [first,second]=element('category-options').inputs;
first.checked=true;first.listeners.change();second.checked=true;second.listeners.change();
if(!element('filter-status').textContent.includes('Types: 2 selected')) throw new Error('Type multi-select failed');
element('clear-types').onclick();
if(!element('filter-status').textContent.includes('Types: all')) throw new Error('Type reset failed');
const [u1,u2]=element('utility-options').inputs;u1.checked=true;u1.listeners.change();u2.checked=true;u2.listeners.change();
if(!element('filter-status').textContent.includes('Utilities: 2 selected')) throw new Error('Utility multi-select failed');
const period=element('period-options').inputs[0];period.checked=true;period.listeners.change();
if(!element('filter-status').textContent.includes('periods: 1 selected')) throw new Error('Period multi-select failed');
element('count-mode').onclick();
if(!element('delay-stack').innerHTML.includes('stack-segment')) throw new Error('Chart mode failed');
if(!element('distribution-definition').textContent.includes('utility TPR project keys')) throw new Error('Utility filter failed');
element('clear-utilities').onclick();element('clear-periods').onclick();
const nominalCount=Number(element('cost-definition').textContent.match(/^([\d,]+)/)?.[1].replaceAll(',',''));
element('dollar-year').value='2025';element('dollar-year').onchange();
const fixedCount=Number(element('cost-definition').textContent.match(/^([\d,]+)/)?.[1].replaceAll(',',''));
if(!(fixedCount<nominalCount&&fixedCount>0))throw new Error('Fixed-dollar eligibility did not change');
if(!element('cost-year-note').textContent.includes('excluded'))throw new Error('Missing cost-year limitation');
console.log(JSON.stringify({records:rows.length,types:element('category-options').inputs.length,utilities:element('utility-options').inputs.length,periods:element('period-options').inputs.length,filters:'ok'}));
