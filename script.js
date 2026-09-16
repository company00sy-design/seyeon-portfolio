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
  'BANNER':'banner','DETAIL PAGE':'detail','BLOG':'blog','SOCIAL / VIDEO':['social','video'],'AI VISUAL':'ai','WEB':'web'
};

const selectedGrid=document.querySelector('#selected-grid');
const workGrid=document.querySelector('#work-grid');
const emptyState=document.querySelector('#empty-state');
const filters=[...document.querySelectorAll('.filter')];
let works=[...fallbackWorks];

function normalizeCategory(category){
  return String(category||'').toLowerCase().trim();
}

function esc(value){
  return String(value||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}

function card(work){
  const el=document.createElement('article');
  const category=normalizeCategory(work.category);
  const label=categoryLabels[category]||category.toUpperCase()||'WORK';
  el.className=`work-card work-card-${category}`;
  el.dataset.category=label;
  el.dataset.hasImage=work.image?'true':'false';

  if(category==='blog'){
    el.innerHTML=`<div class="project-card"><div class="project-card-top"><span>${label}</span><span>${esc(work.year)}</span></div><div class="project-card-main"><h3>${esc(work.title||'Blog Content')}</h3><p>콘텐츠 기획 · 카피라이팅 · 비주얼 디자인</p></div><div class="project-card-arrow">↗</div></div><div class="work-meta"><span>${label}</span><span class="work-title">${esc(work.title||'')}</span></div>`;
    el.addEventListener('click',()=>openProjectModal(work,'blog'));
    return el;
  }

  if(category==='detail'){
    el.innerHTML=`<div class="detail-preview"><div class="detail-preview-inner">${work.image?`<img src="${esc(work.image)}" alt="${esc(work.title||label)}" loading="lazy">`:''}<span class="detail-preview-label">SCROLL TO VIEW</span></div></div><div class="work-meta"><span>${label}</span><span class="work-title">${esc(work.title||'')}${work.year?` / ${esc(work.year)}`:''}</span></div>`;
    if(work.image) el.addEventListener('click',()=>openProjectModal(work,'detail'));
    return el;
  }

  if(category==='social'||category==='video'){
    el.innerHTML=`<div class="video-preview">${work.video_url?`<video src="${esc(work.video_url)}" muted loop playsinline preload="metadata"></video>`:(work.image?`<img src="${esc(work.image)}" alt="${esc(work.title||label)}" loading="lazy">`:'' )}<div class="video-overlay"><span class="play-icon">▶</span><span>${category==='social'?'SOCIAL / VIDEO':'VIDEO'}</span></div></div><div class="work-meta"><span>${label}</span><span class="work-title">${esc(work.title||'')}${work.year?` / ${esc(work.year)}`:''}</span></div>`;
    const media=el.querySelector('video');
    if(media){el.addEventListener('mouseenter',()=>media.play().catch(()=>{}));el.addEventListener('mouseleave',()=>{media.pause();media.currentTime=0;});}
    el.addEventListener('click',()=>openProjectModal(work,'video'));
    return el;
  }

  if(category==='web'){
    el.innerHTML=`<div class="web-preview"><div class="browser-bar"><i></i><i></i><i></i></div>${work.image?`<img src="${esc(work.image)}" alt="${esc(work.title||label)}" loading="lazy">`:''}<div class="web-preview-label">WEB PROJECT</div></div><div class="work-meta"><span>${label}</span><span class="work-title">${esc(work.title||'')}${work.year?` / ${esc(work.year)}`:''}</span></div>`;
    if(work.image) el.addEventListener('click',()=>openProjectModal(work,'web'));
    return el;
  }

  el.innerHTML=`<div class="work-media">${work.image?`<img src="${esc(work.image)}" alt="${esc(work.title||label)}" loading="lazy">`:''}</div><div class="work-meta"><span>${label}</span><span class="work-title">${esc(work.title||'')}${work.year?` / ${esc(work.year)}`:''}</span></div>`;
  if(work.image) el.addEventListener('click',()=>openImageModal(work));
  return el;
}

function render(filter='BANNER'){
  const mapped=filterMap[filter]??filter.toLowerCase();
  const list=works.filter(w=>{
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
  const close=()=>{modal.classList.remove('open');document.body.style.overflow='';};
  modal.querySelector('.image-modal-close').addEventListener('click',close);
  modal.addEventListener('click',e=>{if(e.target===modal) close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open')) close();});
  return modal;
}
const imageModal=createImageModal();
function openImageModal(work){
  const img=imageModal.querySelector('img');
  const caption=imageModal.querySelector('.image-modal-caption');
  img.src=work.image;img.alt=work.title||'작업 이미지';caption.textContent=`${work.title||''}${work.year?` / ${work.year}`:''}`;
  imageModal.classList.add('open');document.body.style.overflow='hidden';
}

function createProjectModal(){
  const modal=document.createElement('div');
  modal.className='project-modal';
  modal.setAttribute('role','dialog');
  modal.setAttribute('aria-modal','true');
  modal.innerHTML=`<button class="project-modal-close" type="button" aria-label="닫기">×</button><div class="project-modal-content"></div>`;
  document.body.appendChild(modal);
  const close=()=>{modal.classList.remove('open');document.body.style.overflow='';const video=modal.querySelector('video');if(video)video.pause();};
  modal.querySelector('.project-modal-close').addEventListener('click',close);
  modal.addEventListener('click',e=>{if(e.target===modal)close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))close();});
  return modal;
}
const projectModal=createProjectModal();
function openProjectModal(work,type){
  const content=projectModal.querySelector('.project-modal-content');
  const title=esc(work.title||'Untitled Project');
  const year=esc(work.year||'');
  if(type==='detail'){
    content.innerHTML=`<div class="project-modal-head"><span>DETAIL PAGE</span><strong>${title}${year?` / ${year}`:''}</strong></div><div class="detail-viewer"><img src="${esc(work.image)}" alt="${title}"></div>`;
  }else if(type==='video'){
    content.innerHTML=`<div class="project-modal-head"><span>${normalizeCategory(work.category)==='social'?'SOCIAL / VIDEO':'VIDEO'}</span><strong>${title}${year?` / ${year}`:''}</strong></div>${work.video_url?`<video class="project-video" src="${esc(work.video_url)}" controls autoplay playsinline></video>`:(work.image?`<img class="project-image" src="${esc(work.image)}" alt="${title}">`:'<div class="project-empty">영상 파일을 등록하면 여기에 표시됩니다.</div>')}`;
  }else if(type==='web'){
    content.innerHTML=`<div class="project-modal-head"><span>WEB</span><strong>${title}${year?` / ${year}`:''}</strong></div><div class="web-viewer">${work.image?`<img src="${esc(work.image)}" alt="${title}">`:''}</div>`;
  }else{
    content.innerHTML=`<div class="project-modal-head"><span>BLOG CONTENT</span><strong>${title}${year?` / ${year}`:''}</strong></div><div class="blog-project"><div><small>ROLE</small><p>콘텐츠 기획 · 카피라이팅 · 비주얼 디자인</p></div>${work.image?`<img src="${esc(work.image)}" alt="${title}">`:''}</div>`;
  }
  projectModal.classList.add('open');
  document.body.style.overflow='hidden';
}

async function loadSupabaseWorks(){
  if(!window.supabase || !window.SUPABASE_CONFIG?.url || !window.SUPABASE_CONFIG?.anonKey) return;
  try{
    const client=window.supabase.createClient(SUPABASE_CONFIG.url,SUPABASE_CONFIG.anonKey);
    const {data,error}=await client.from('works').select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:false});
    if(error || !data?.length) return;
    works=data.map(w=>({category:normalizeCategory(w.category),title:w.title||'',year:w.year||'',image:w.image_url||w.image||'',video_url:w.video_url||w.video||'',featured:!!w.featured}));
    render(document.querySelector('.filter.active')?.dataset.filter||'BANNER');
  }catch(e){console.warn('Supabase works could not be loaded.',e)}
}

render('BANNER');
loadSupabaseWorks();
