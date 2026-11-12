/* แดชบอร์ด Packing — ใช้ window.sb (supabase.js กลาง) */
const GAS_URL='https://script.google.com/macros/s/AKfycbw4UvKuRrAQ_3Ldm8U0VJqfjfBQUSYaTEdrxkdXUVN98G68XseCquhDeXfMgU8cVYaY/exec';
const LIFF_ID='';   // ⚠️ ใส่ LIFF ID ของ SSB-App ที่นี่ (เปิดผ่าน LINE) · เว้นว่าง = เทสด้วย ?uid=<UID> ใน URL
const PENDING=['Waiting','Planned','Loading'];
const LABEL={Waiting:'รอจัด',Planned:'จัดแล้ว',Loading:'วิ่งงานแล้ว',Delivered:'ส่งแล้ว'};
/* 📦 12 พ.ย. คุณน้อง "งาน packing ไม่มีลานขากลับ": สถานะใช้ช่องร่วมกับงานไร่ → โชว์ตามฟอร์มคนขับ (ค่าใน DB เดิม)
   n = จำนวนจุด (pk_request_items) · ⚠️ ตรงกับ Order_Status pkStatusLabel / dev-drivers stTh */
function pkStLbl(st,n){
  if(st==='เริ่มงานแล้ว') return 'ออกจาก SSB แล้ว';
  if(st==='ถึงลูกค้า') return 'เช็คอินถึงร้านแล้ว';
  const sl={'ถึงลานวางกระบะ':'rampDrop','ออกจากลูกค้า':'client','ถึงลานขากลับ':'ramp','ถึงลาน':'ramp'}[st]; if(!sl) return '';
  if(!n) return sl==='ramp'?'ส่งครบทุกจุด':sl==='rampDrop'?'ส่งจุด 1 แล้ว':'ส่งของแล้ว';
  const ss=n<=1?['client']:n===2?['client','ramp']:['rampDrop','client','ramp'], i=ss.indexOf(sl);
  if(i<0) return sl==='ramp'?'ส่งครบทุกจุด':sl==='rampDrop'?'ส่งจุด 1 แล้ว':'ส่งของแล้ว';
  const upto=i===ss.length-1?n:i+1; return upto>=n?`ส่งครบ ${n} จุด`:`ส่งจุด ${upto} แล้ว`;
}
/* ข้อความใต้ป้ายสถานะ จากออเดอร์จริง */
function drvLine(o){const x=o._o;if(!x)return '';
  const has=!!(x.driver_name||x.plate), wait=!has||x.status==='ไม่มีคนขับรับงาน'||x.status==='รอคนขับ'||x.status==='รอคนขับรับงาน';
  const st=x.status==='ยกเลิก'?'❌ ออเดอร์ถูกยกเลิก':wait?'⏳ รอคนขับรับงาน':x.status==='รับงานแล้ว'?'✅ ได้คนขับแล้ว':x.status==='เสร็จงาน'?'🏁 เสร็จงาน':'🚚 '+(pkStLbl(x.status,(ITEMS[o.request_id]||[]).length)||x.status);
  return '<div class="drv'+(wait?' w':'')+'"><b>'+esc(st)+'</b>'+(has&&!wait?' · 🧑 '+esc(x.driver_name||'-')+(x.plate?' · '+esc(x.plate):''):'')+'<span class="oid">'+esc(x.order_id)+'</span></div>';}
let ORDERS=[],ITEMS={},ROUTES={},filter='ค้าง';
const $=s=>document.querySelector(s);
const num=n=>(n||0).toLocaleString('en-US');
/* จำนวนแยกตามหน่วย (ลัง/พาเลท…) — ไม่บวกพาเลทรวมกับลัง */
const qtyBy=its=>its.reduce((m,x)=>{const u=String(x.unit||'').trim()||'ลัง';m[u]=(m[u]||0)+(+x.qty||0);return m;},{});
const qtyTxt=(q,tag)=>{const k=Object.keys(q).filter(u=>q[u]);if(!k.length)return tag?'<b>0</b> ลัง':'0';k.sort((a,b)=>(a==='ลัง'?-1:b==='ลัง'?1:0));return k.map(u=>tag?'<b>'+num(q[u])+'</b> '+esc(u):num(q[u])+'<small> '+esc(u)+'</small>').join(' · ');};
const ton=kg=>((kg||0)/1000).toFixed(2);
/* วันที่ไทย: 2026-11-11 → พ. 11/11/2569 */
const DOW=['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'];
const dTH=s=>{const m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})/);if(!m)return String(s||'-');const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));return DOW[d.getUTCDay()]+' '+m[3]+'/'+m[2]+'/'+(+m[1]+543);};
const esc=s=>String(s==null?'':s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));

async function load(){
  try{
    const [r1,r2,r3]=await Promise.all([
      sb.from('pk_requests').select('*').order('want_date',{ascending:true}),
      sb.from('pk_request_items').select('*'),
      sb.from('orders').select('order_id,garden_name,pickup_point,route_id,route_seq,route_role,bin_count,status').not('route_id','is',null)
    ]);
    if(r1.error) throw r1.error;
    const reqs=r1.data||[], items=r2.data||[], palm=r3.data||[];
    /* ออเดอร์ที่สร้างจากคำขอ: DB trigger trg_pk_req_sync_from_order copy สถานะ/คนขับ/ทะเบียน มาที่ pk_requests (order_id/order_status/driver_name/plate) */
    reqs.forEach(o=>{o._o=o.order_id?{order_id:o.order_id,status:o.order_status||'',driver_name:o.driver_name,plate:o.plate}:null;});
    ITEMS={}; items.forEach(it=>{(ITEMS[it.request_id]=ITEMS[it.request_id]||[]).push(it);});
    ROUTES={}; palm.forEach(l=>{(ROUTES[l.route_id]=ROUTES[l.route_id]||[]).push(l);});
    ORDERS=reqs.map(o=>{
      const its=ITEMS[o.request_id]||[];
      o._n=its.length;
      o._qty=its.reduce((s,x)=>s+(+x.qty||0),0);
      o._qu=qtyBy(its);
      o._kg=its.reduce((s,x)=>s+(+x.weight_kg||0),0);
      o._m3=its.reduce((s,x)=>s+(+x.volume_m3||0),0);
      return o;
    });
    $('#conn').textContent='● เชื่อมต่อแล้ว · '+ORDERS.length+' ออเดอร์';
    render();
  }catch(e){
    $('#conn').textContent='● เชื่อมต่อไม่ได้';
    $('#list').innerHTML='<div class="state err">โหลดข้อมูลไม่ได้: '+esc(e.message||e)+'</div>';
  }
}

function render(){
  const pending=ORDERS.filter(o=>PENDING.includes(o.status));
  const t=pending.reduce((a,o)=>{Object.keys(o._qu).forEach(u=>a.qu[u]=(a.qu[u]||0)+o._qu[u]);a.kg+=o._kg;a.m3+=o._m3;return a;},{qu:{},kg:0,m3:0});
  $('#tOrd').innerHTML=pending.length+'<small> ใบ</small>';
  $('#tQty').innerHTML=qtyTxt(t.qu,false);
  $('#tTon').innerHTML=ton(t.kg)+'<small> ตัน</small>';
  $('#tVol').innerHTML=t.m3.toFixed(2)+'<small> m³</small>';

  const counts={}; ORDERS.forEach(o=>counts[o.status]=(counts[o.status]||0)+1);
  const pc=pending.length;
  const tabs=[['ค้าง','ค้าง ('+pc+')'],...PENDING.map(s=>[s,LABEL[s]+' ('+(counts[s]||0)+')']),['Delivered','ส่งแล้ว ('+(counts.Delivered||0)+')']];
  $('#filters').innerHTML=tabs.map(([k,l])=>'<button class="rbtn'+(filter===k?' active':'')+'" data-f="'+k+'">'+l+'</button>').join('');
  $('#filters').querySelectorAll('button').forEach(b=>b.onclick=()=>{filter=b.dataset.f;render();});

  let rows=filter==='ค้าง'?pending:ORDERS.filter(o=>o.status===filter);
  const ord={Waiting:0,Planned:1,Loading:2,Delivered:3};
  rows.sort((a,b)=>(ord[a.status]-ord[b.status])||String(a.want_date).localeCompare(String(b.want_date)));
  $('#ordCount').textContent=rows.length+' ใบ';
  $('#list').innerHTML=rows.length?rows.map(card).join(''):'<div class="state">ไม่มีออเดอร์ในสถานะนี้</div>';
  $('#list').querySelectorAll('.toggle').forEach(b=>b.onclick=()=>{
    const box=b.previousElementSibling;box.classList.toggle('show');
    b.textContent=box.classList.contains('show')?'ซ่อนรายการ ▲':'ดูรายการ ('+b.dataset.n+') ▼';
  });
}

function card(o){
  const mall=!!o.mall_ref;   /* 🚜 ขอรถไร่จากหน้าแพลนรถ Packing (งานห้าง) */
  const its=(ITEMS[o.request_id]||[]).slice().sort((a,b)=>(a.id||0)-(b.id||0)).map(it=>{
    const kg=+it.weight_kg||0, w=mall?(kg?ton(kg)+' ตัน':''):num(Math.round(kg))+' กก.';
    return '<div class="item"><span>'+esc(it.product_name||it.product_id)+'</span>'+
    '<b>'+num(+it.qty)+' '+esc(it.unit||'')+(w?' · '+w:'')+'</b></div>'+(it.note?'<div class="inote">📝 '+esc(it.note)+'</div>':'');}).join('');
  /* หมายเหตุคำขอ: แยก "ขึ้นสินค้า …" / "งานห้าง …" ออกมาเป็นแถวเด่น */
  const parts=String(o.note||'').split(' · ').map(s=>s.trim()).filter(Boolean);
  const loadP=parts.find(s=>/^ขึ้นสินค้า /.test(s)), dlvP=parts.find(s=>/^งานห้าง /.test(s));
  const rest=parts.filter(s=>s!==loadP&&s!==dlvP&&!/^🚜 งานห้าง/.test(s));
  return '<div class="ord">'+
    '<div class="top"><div><div class="cust">'+(mall?'<span class="mall">🚜 งานห้าง</span> ':'')+esc(o.customer_name||'-')+'</div>'+
      '<div class="route-to">→ '+esc(o.destination||'-')+'</div></div>'+
      '<span class="badge b-'+o.status+'">'+(LABEL[o.status]||o.status)+'</span></div>'+
    '<div class="meta"><span class="rid">'+esc(o.request_id)+'</span>'+
      '<span>📅 '+(mall?'งานห้าง ':'')+'<b>'+esc(mall&&dlvP?dlvP.replace(/^งานห้าง /,''):dTH(o.want_date))+'</b></span>'+
      (loadP?'<span>📦 ขึ้นสินค้า <b>'+esc(loadP.replace(/^ขึ้นสินค้า /,''))+'</b></span>':'')+
      (o.load_time?'<span>🕘 เข้าโหลด <b>'+esc(String(o.load_time).slice(0,5))+' น.</b></span>':'')+
      '<span>🚚 '+esc(o.vehicle_type||'-')+(o.vehicle_count?' ×'+o.vehicle_count:'')+'</span>'+
      (o.requester_name?'<span>👤 '+esc(o.requester_name)+'</span>':'')+'</div>'+
    drvLine(o)+slipLine(o)+
    (rest.length?'<div class="pnote">📝 '+rest.map(esc).join(' · ')+'</div>':'')+
    '<div class="sum"><b>'+o._n+'</b> รายการ · '+qtyTxt(o._qu,true)+' · <b>'+ton(o._kg)+'</b> ตัน · <b>'+o._m3.toFixed(2)+'</b> m³</div>'+
    (its?('<div class="items'+(mall?' show':'')+'">'+its+'</div><button class="toggle" data-n="'+o._n+'">'+(mall?'ซ่อนรายการ ▲':'ดูรายการ ('+o._n+') ▼')+'</button>'):'')+
    (o.status==='Waiting'?('<button class="mkord" onclick="doCreateOrder(this,\''+esc(o.request_id)+'\')">🚚 สร้างออเดอร์ (จัดรถ)</button>'):'')+
    routeBox(o)+
    '</div>';
}

/* 🧾 ใบชั่งออก (11 พ.ย.) — Edge pk-slip-ocr อ่านรูปที่คนขับถ่ายตอนออกโรงงาน แล้วคัดลอก slip_* มาที่ pk_requests */
function slipLine(o){
  if(!o.slip_status) return '';
  const ok=o.slip_status==='ok'&&o.slip_net_kg!=null;
  const nums=ok?'สุทธิ <b>'+num(+o.slip_net_kg)+'</b> กก.'+(o.slip_tare_kg!=null&&o.slip_gross_kg!=null?' <small>(เข้า '+num(+o.slip_tare_kg)+' · ออก '+num(+o.slip_gross_kg)+')</small>':''):'อ่านตัวเลขไม่ได้ — ดูจากรูป';
  const url=String(o.slip_photo||'');
  return '<div class="slip'+(ok?'':' bad')+'">🧾 ใบชั่งออก · '+nums+
    (/^https:\/\//.test(url)?'<a href="'+esc(url).replace(/"/g,'%22')+'" target="_blank" rel="noopener">ดูรูป</a>':'')+'</div>';
}

function routeBox(o){
  if(!o.route_id) return '';
  const legs=(ROUTES[o.route_id]||[]).slice().sort((a,b)=>(a.route_seq||0)-(b.route_seq||0));
  const legHtml=legs.map(l=>'<div class="leg">↩️ ขากลับ: รับปาล์ม <b>'+esc(l.garden_name||l.pickup_point||'-')+'</b> · '+num(+l.bin_count||0)+' บิน<span class="lst">'+esc(l.status||'')+'</span></div>').join('')
    ||'<div class="leg">ยังไม่มีงานขากลับ — กด “เพิ่มงาน”</div>';
  return '<div class="rbox"><div class="rh">🔗 ทริป '+esc(o.route_id)+' · 🧑 '+esc(o.driver_name||'-')+(o.plate?' · '+esc(o.plate):'')+'</div>'+
    '<div class="leg go">🚚 ขาไป: ส่ง Packing <b>'+esc(o.customer_name||'-')+'</b></div>'+legHtml+'</div>';
}

/* 🚚 แอดมินกด "สร้างออเดอร์" → สร้าง STATUS order (Packing) เข้าคิว "หาคนขับ" บนหน้า tracking */
async function doCreateOrder(btn,rid){
  // เผื่อเรียกแบบเก่า doCreateOrder(rid) — ไม่มี btn
  if(typeof btn==='string'){ rid=btn; btn=null; }
  if(!window.SSB_UID){ toast('ไม่พบตัวตนผู้ใช้ — เปิดผ่าน LINE หรือใส่ ?uid=<UID> ใน URL'); return; }
  const ok=await confirmModal({icon:'🚚',title:'สร้างออเดอร์จัดรถ?',
    msg:'คำขอ '+rid+'\nออเดอร์จะไปโผล่หน้า “ติดตามสถานะออเดอร์” ให้กด “หาคนขับ” ต่อ',
    okText:'สร้างออเดอร์',cancelText:'ยกเลิก'});
  if(!ok) return;
  // 🔄 ล็อกปุ่ม + หมุน ระหว่างสร้าง (กันกดซ้ำ + ให้รู้ว่ากดไปแล้ว)
  const busy=(on)=>{ if(!btn)return; btn.disabled=on; if(on){ btn.dataset.orig=btn.innerHTML; btn.innerHTML='<span class="spin"></span>กำลังสร้างออเดอร์…'; } else if(btn.dataset.orig){ btn.innerHTML=btn.dataset.orig; } };
  busy(true);
  try{
    const res=await fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({action:'createPackingOrder',userId:window.SSB_UID,requestId:rid})});
    const txt=await res.text();
    let d=null; try{ d=JSON.parse(txt); }catch(_){}
    if(d && d.success){ toast('✅ สร้างออเดอร์ '+d.orderId+' แล้ว · ไปกด “หาคนขับ” ที่หน้าติดตาม'); load(); return; }
    if(d && !d.success){ busy(false); toast('ไม่สำเร็จ: '+(d.error||'unknown')); load(); return; }
    // ⚠️ GAS POST บางครั้งส่ง response กลับเป็น HTML (ไม่ใช่ JSON) แต่ฝั่ง server ทำสำเร็จแล้ว
    //    → ไม่ต้อง error · รีเฟรชเช็คสถานะจริง (คำขอจะย้ายไป "จัดแล้ว") · คงปุ่มหมุนไว้จนโหลดใหม่
    toast('✅ ส่งคำขอสร้างออเดอร์แล้ว · กำลังตรวจสอบสถานะ');
    setTimeout(load, 1500);
  }catch(e){ busy(false); toast('ผิดพลาด: '+(e.message||e)); }
}

(async()=>{ try{ await ssbAuth(LIFF_ID); }catch(e){ console.warn(e); } load(); setInterval(load,60000); })();
