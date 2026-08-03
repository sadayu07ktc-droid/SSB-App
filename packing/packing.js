/* แดชบอร์ด Packing — ใช้ window.sb (supabase.js กลาง) */
const GAS_URL='https://script.google.com/macros/s/AKfycbw4UvKuRrAQ_3Ldm8U0VJqfjfBQUSYaTEdrxkdXUVN98G68XseCquhDeXfMgU8cVYaY/exec';
const LIFF_ID='';   // ⚠️ ใส่ LIFF ID ของ SSB-App ที่นี่ (เปิดผ่าน LINE) · เว้นว่าง = เทสด้วย ?uid=<UID> ใน URL
const PENDING=['Waiting','Planned','Loading'];
const LABEL={Waiting:'รอจัด',Planned:'จัดแล้ว',Loading:'กำลังขึ้นของ',Delivered:'ส่งแล้ว'};
let ORDERS=[],ITEMS={},ROUTES={},filter='ค้าง';
const $=s=>document.querySelector(s);
const num=n=>(n||0).toLocaleString('en-US');
const ton=kg=>((kg||0)/1000).toFixed(2);
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
    ITEMS={}; items.forEach(it=>{(ITEMS[it.request_id]=ITEMS[it.request_id]||[]).push(it);});
    ROUTES={}; palm.forEach(l=>{(ROUTES[l.route_id]=ROUTES[l.route_id]||[]).push(l);});
    ORDERS=reqs.map(o=>{
      const its=ITEMS[o.request_id]||[];
      o._n=its.length;
      o._qty=its.reduce((s,x)=>s+(+x.qty||0),0);
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
  const t=pending.reduce((a,o)=>{a.q+=o._qty;a.kg+=o._kg;a.m3+=o._m3;return a;},{q:0,kg:0,m3:0});
  $('#tOrd').innerHTML=pending.length+'<small> ใบ</small>';
  $('#tQty').textContent=num(t.q);
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
  const its=(ITEMS[o.request_id]||[]).map(it=>
    '<div class="item"><span>'+esc(it.product_name||it.product_id)+'</span>'+
    '<b>'+num(+it.qty)+' '+esc(it.unit||'')+' · '+num(Math.round(it.weight_kg||0))+' กก.</b></div>').join('');
  return '<div class="ord">'+
    '<div class="top"><div><div class="cust">'+esc(o.customer_name||'-')+'</div>'+
      '<div class="route-to">→ '+esc(o.destination||'-')+'</div></div>'+
      '<span class="badge b-'+o.status+'">'+(LABEL[o.status]||o.status)+'</span></div>'+
    '<div class="meta"><span class="rid">'+esc(o.request_id)+'</span>'+
      '<span>📅 '+esc(o.want_date||'-')+'</span>'+
      '<span>🚚 '+esc(o.vehicle_type||'-')+(o.vehicle_count?' ×'+o.vehicle_count:'')+'</span></div>'+
    '<div class="sum"><b>'+o._n+'</b> รายการ · <b>'+num(o._qty)+'</b> ลัง · <b>'+ton(o._kg)+'</b> ตัน · <b>'+o._m3.toFixed(2)+'</b> m³</div>'+
    (its?('<div class="items">'+its+'</div><button class="toggle" data-n="'+o._n+'">ดูรายการ ('+o._n+') ▼</button>'):'')+
    (o.status==='Waiting'?('<button class="mkord" onclick="doCreateOrder(\''+esc(o.request_id)+'\')">🚚 สร้างออเดอร์ (จัดรถ)</button>'):'')+
    routeBox(o)+
    '</div>';
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
async function doCreateOrder(rid){
  if(!window.SSB_UID){ toast('ไม่พบตัวตนผู้ใช้ — เปิดผ่าน LINE หรือใส่ ?uid=<UID> ใน URL'); return; }
  const ok=await confirmModal({icon:'🚚',title:'สร้างออเดอร์จัดรถ?',
    msg:'คำขอ '+rid+'\nออเดอร์จะไปโผล่หน้า “ติดตามสถานะออเดอร์” ให้กด “หาคนขับ” ต่อ',
    okText:'สร้างออเดอร์',cancelText:'ยกเลิก'});
  if(!ok) return;
  try{
    const res=await fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({action:'createPackingOrder',userId:window.SSB_UID,requestId:rid})});
    const txt=await res.text();
    let d=null; try{ d=JSON.parse(txt); }catch(_){}
    if(d && d.success){ toast('✅ สร้างออเดอร์ '+d.orderId+' แล้ว · ไปกด “หาคนขับ” ที่หน้าติดตาม'); load(); return; }
    if(d && !d.success){ toast('ไม่สำเร็จ: '+(d.error||'unknown')); load(); return; }
    // ⚠️ GAS POST บางครั้งส่ง response กลับเป็น HTML (ไม่ใช่ JSON) แต่ฝั่ง server ทำสำเร็จแล้ว
    //    → ไม่ต้อง error · รีเฟรชเช็คสถานะจริง (คำขอจะย้ายไป "จัดแล้ว")
    toast('✅ ส่งคำขอสร้างออเดอร์แล้ว · กำลังตรวจสอบสถานะ');
    setTimeout(load, 1500);
  }catch(e){ toast('ผิดพลาด: '+(e.message||e)); }
}

(async()=>{ try{ await ssbAuth(LIFF_ID); }catch(e){ console.warn(e); } load(); setInterval(load,60000); })();
