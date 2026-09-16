const fallbackWorks = [
  {category:'banner', title:'Selected Banner Work', year:'2026', image:'assets/banner-lahom.jpg', featured:true},
  {category:'banner', title:'Promotion Banner', year:'2026', image:'assets/banner-haud-march.jpg', featured:true},
  {category:'banner', title:'Bedroom Promotion', year:'2026', image:'assets/banner-haud-bedroom.jpg', featured:true},
  {category:'banner', title:'May Promotion', year:'2026', image:'assets/banner-haud-may.jpg', featured:true}
];

const categoryLabels={
  banner:'BANNER',detail:'DETAIL PAGE',blog:'BLOG',social:'SOCIAL',video:'VIDEO',ai:'AI VISUAL',web:'WEB'
};
const filterMap={
  'ALL':'ALL','BANNER':'banner','DETAIL PAGE':'detail','BLOG':'blog','SOCIAL / VIDEO':['social','video'],'AI VISUAL':'ai','WEB':'web'
};

const selectedGrid=document.querySelector('#selected-grid');
const workGrid=document.querySelector('#work-grid');
const emptyState=document.querySelector('#empty-state');
const filters=[...document.querySelectorAll('.filter')];
let works=[...fallbackWorks];

function normalizeCategory(category){
  return String(category||'').toLowerCase().trim();
}

function card(work){
  const el=document.createElement('article');
  el.className='work-card';
  const category=normalizeCategory(work.category);
  el.dataset.category=categoryLabels[category]||category.toUpperCase();
  el.innerHTML=`<div class="work-media">${work.image?`<img src="${work.image}" alt="${work.title||categoryLabels[category]||category}" loading="lazy">`:''}</div><div class="work-meta"><span>${categoryLabels[category]||category.toUpperCase()||'WORK'}</span><span class="work-title">${work.title||''} ${work.year?`/ ${work.year}`:''}</span></div>`;
  if(work.image){
    el.addEventListener('click',()=>openImageModal(work));
  }
  return el;
}

function render(filter='ALL'){
  const mapped=filterMap[filter]??filter.toLowerCase();
  const list=filter==='ALL'?works:works.filter(w=>{
    const category=normalizeCategory(w.category);
    return Array.isArray(mapped)?mapped.includes(category):category===mapped;
  });
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

function createImageModal(){
  const modal=document.createElement('div');
  modal.className='image-modal';
  modal.setAttribute('role','dialog');
  modal.setAttribute('aria-modal','true');
  modal.setAttribute('aria-label','작업 이미지 크게 보기');
  modal.innerHTML=`<button class="image-modal-close" type="button" aria-label="닫기">×</button><img alt=""><div class="image-modal-caption"></div>`;
  document.body.appendChild(modal);
  const close=()=>{
    modal.classList.remove('open');
    document.body.style.overflow='';
  };
  modal.querySelector('.image-modal-close').addEventListener('click',close);
  modal.addEventListener('click',e=>{if(e.target===modal) close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open')) close();});
  return modal;
}

const imageModal=createImageModal();
function openImageModal(work){
  const img=imageModal.querySelector('img');
  const caption=imageModal.querySelector('.image-modal-caption');
  img.src=work.image;
  img.alt=work.title||'작업 이미지';
  caption.textContent=`${work.title||''}${work.year?` / ${work.year}`:''}`;
  imageModal.classList.add('open');
  document.body.style.overflow='hidden';
}

async function loadSupabaseWorks(){
  if(!window.supabase || !window.SUPABASE_CONFIG?.url || !window.SUPABASE_CONFIG?.anonKey) return;
  try{
    const client=window.supabase.createClient(SUPABASE_CONFIG.url,SUPABASE_CONFIG.anonKey);
    const {data,error}=await client.from('works').select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:false});
    if(error || !data?.length) return;
    works=data.map(w=>({category:normalizeCategory(w.category),title:w.title||'',year:w.year||'',image:w.image_url||w.image||'',featured:!!w.featured}));
    render(document.querySelector('.filter.active')?.dataset.filter||'ALL');
  }catch(e){console.warn('Supabase works could not be loaded.',e)}
}

render();
loadSupabaseWorks();
