const fallbackWorks = [
  {category:'BANNER', title:'Selected Banner Work', year:'2026', image:'assets/banner-lahom.jpg', featured:true},
  {category:'BANNER', title:'Promotion Banner', year:'2026', image:'assets/banner-haud-march.jpg', featured:true},
  {category:'BANNER', title:'Bedroom Promotion', year:'2026', image:'assets/banner-haud-bedroom.jpg', featured:true},
  {category:'BANNER', title:'May Promotion', year:'2026', image:'assets/banner-haud-may.jpg', featured:true}
];

const selectedGrid=document.querySelector('#selected-grid');
const workGrid=document.querySelector('#work-grid');
const emptyState=document.querySelector('#empty-state');
const filters=[...document.querySelectorAll('.filter')];
let works=[...fallbackWorks];

function card(work){
  const el=document.createElement('article');
  el.className='work-card';
  el.dataset.category=work.category;
  el.innerHTML=`<div class="work-media">${work.image?`<img src="${work.image}" alt="${work.title||work.category}" loading="lazy">`:''}</div><div class="work-meta"><span>${work.category||'WORK'}</span><span class="work-title">${work.title||''} ${work.year?`/ ${work.year}`:''}</span></div>`;
  return el;
}
function render(filter='ALL'){
  const list=filter==='ALL'?works:works.filter(w=>w.category===filter);
  workGrid.innerHTML='';
  list.forEach(w=>workGrid.appendChild(card(w)));
  emptyState.hidden=list.length!==0;
  selectedGrid.innerHTML='';
  works.filter(w=>w.featured).slice(0,8).forEach(w=>selectedGrid.appendChild(card(w)));
}
filters.forEach(btn=>btn.addEventListener('click',()=>{
  filters.forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  render(btn.dataset.filter);
}));

async function loadSupabaseWorks(){
  if(!window.supabase || !window.SUPABASE_CONFIG?.url || !window.SUPABASE_CONFIG?.anonKey) return;
  try{
    const client=window.supabase.createClient(SUPABASE_CONFIG.url,SUPABASE_CONFIG.anonKey);
    const {data,error}=await client.from('works').select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:false});
    if(error || !data?.length) return;
    works=data.map(w=>({category:w.category||'OTHER',title:w.title||'',year:w.year||'',image:w.image_url||w.image||'',featured:!!w.featured}));
    render(document.querySelector('.filter.active')?.dataset.filter||'ALL');
  }catch(e){console.warn('Supabase works could not be loaded.',e)}
}

render();
loadSupabaseWorks();
