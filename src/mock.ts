import { randomUUID } from 'node:crypto';
import { selectProduct, type Quote, type Workplace, type Operation } from './domain.ts';
import type { Store } from './store.ts';
export type MockOutcome = 'completed' | 'timeout' | 'failed' | 'expired';
export class MockAdapter {
 store:Store; calls=0;
 constructor(store:Store){this.store=store;}
 quote(w:Workplace, now:number):Quote {const p=selectProduct(w);return {id:'quote_'+randomUUID(),workplaceId:w.id,variantId:p.id,product:p.name,merchant:p.merchant,quantity:1,subtotal:p.price,shipping:p.shipping,tax:p.tax,total:p.price+p.shipping+p.tax,currency:'MXN',delivery:'Estándar · 3–5 días ficticios',destination:'Oficina de demostración · dirección sintética',expiresAt:new Date(now+15*60_000).toISOString(),fixture:true};}
 async checkout(op:Operation,outcome:MockOutcome):Promise<Operation> {
  const previous=this.lookup(op.key);if(previous)return previous;
  this.calls++;
  const result:Operation={...op,checkoutId:'mock_'+randomUUID(),status:outcome==='failed'?'FAILED':outcome==='expired'?'EXPIRED':'COMPLETED',note:outcome==='failed'?'El proveedor mock rechazó el intento.':outcome==='expired'?'El checkout mock venció.':'Pedido simulado confirmado; instalación pendiente.'};
  if(result.status==='COMPLETED'){result.orderId='fixture-order_'+randomUUID();result.finalAmount=op.quote.total;}
  this.store.db.prepare('INSERT INTO mock_orders VALUES (?,?)').run(op.key,JSON.stringify(result));
  if(outcome==='timeout')throw new Error('MOCK_TIMEOUT');
  return result;
 }
 lookup(key:string):Operation|undefined {const row=this.store.db.prepare('SELECT data FROM mock_orders WHERE key=?').get(key) as {data:string}|undefined;return row?JSON.parse(row.data) as Operation:undefined;}
}
