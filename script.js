const {createClient}=supabase;
const db=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
let works=[];
const CATEGORY_MAP={banner:'BANNER',detail:'DETAIL PAGE',blog:'BLOG',social:'SOCIAL / VIDEO',video:'SOCIAL / VIDEO',ai:'AI VISUAL',web:'WEB'};
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function categoryLabel(c){return CATEGORY_MAP[c]||String(c||'').toUpperCase();}
function normalizeWork(w){return {...w,image:w.image_url||w.image||'',detail_images:Array.isArray(w.detail_images)?w.detail_images:[],meta:w.meta||{}};}
async function loadWorks(){
  const empty=$('#empty-state');
  try{
    const {data,error}=await db.from('works').select('*').order('created_at',{ascending:false});
    if(error)throw error;
    works=(data||[]).map(normalizeWork);
    renderWorks('BANNER');
  }catch(error){
    console.error('Supabase works load error:',error);
    works=[];
    const grid=$('#work-grid');if(grid)grid.innerHTML='';
    if(empty){empty.hidden=false;empty.textContent='작업물을 불러오지 못했습니다. Supabase 설정을 확인해주세요.';}
  }
}
function imageCard(w,extra=''){return `<article class="work-card ${extra}" data-id="${esc(w.id)}" data-category="${esc(w.category)}"><div class="work-media">${w.image?`<img src="${esc(w.image)}" alt="${esc(w.title)}" loading="lazy">`:'<div class="media-placeholder">IMAGE</div>'}</div><div class="work-meta"><span>${esc(categoryLabel(w.category))}</span><h3>${esc(w.title)}</h3></div></article>`;}
function renderWorks(filter='BANNER'){
  const grid=$('#work-grid'),selected=$('#selected-grid'),empty=$('#empty-state');if(!grid)return;
  const exact=works.filter(w=>categoryLabel(w.category)===filter);
  grid.innerHTML=exact.map(w=>imageCard(w)).join('');
  if(empty){empty.hidden=exact.length>0;}
  if(selected)selected.innerHTML='';
  bindWorkCards();
}
function instagramEmbed(url){if(!url)return '';let u=url.trim().replace(/\/$/,'');if(!u.includes('/embed'))u+='/embed/';return u;}
function openModal(html){let modal=$('#work-modal');if(!modal){modal=document.createElement('div');modal.id='work-modal';modal.className='work-modal';modal.innerHTML='<div class="modal-backdrop"></div><div class="modal-content"><button class="modal-close" aria-label="닫기">×</button><div class="modal-body"></div></div>';document.body.appendChild(modal);modal.querySelector('.modal-backdrop').addEventListener('click',closeModal);modal.querySelector('.modal-close').addEventListener('click',closeModal);}modal.querySelector('.modal-body').innerHTML=html;modal.classList.add('open');document.body.style.overflow='hidden';}
function closeModal(){const m=$('#work-modal');if(m){m.classList.remove('open');m.querySelector('.modal-body').innerHTML='';}document.body.style.overflow='';}
function bindWorkCards(){$$('.work-card').forEach(card=>card.addEventListener('click',()=>{const w=works.find(x=>String(x.id)===String(card.dataset.id));if(!w)return;const c=w.category;if(c==='social'){const url=w.meta?.social_url||'';openModal(`<div class="social-modal"><div class="social-frame">${url?`<iframe src="${esc(instagramEmbed(url))}" title="Instagram reel" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>`:'<p>릴스 URL이 등록되지 않았습니다.</p>'}</div>${url?`<a class="modal-link" href="${esc(url)}" target="_blank" rel="noopener">Instagram에서 보기 ↗</a>`:''}</div>`);return;}if(c==='detail'){const imgs=w.detail_images?.length?w.detail_images:[w.image].filter(Boolean);openModal(`<div class="detail-modal">${imgs.map(src=>`<img src="${esc(src)}" alt="${esc(w.title)}">`).join('')}</div>`);return;}if(c==='blog'){const url=w.meta?.blog_url||'';openModal(`<div class="project-modal"><h2>${esc(w.title)}</h2><p>${esc(w.description||'')}</p>${url?`<a class="modal-link" href="${esc(url)}" target="_blank" rel="noopener">블로그 원문 보기 ↗</a>`:''}</div>`);return;}if(c==='web'){const url=w.meta?.web_url||'';openModal(`<div class="project-modal"><h2>${esc(w.title)}</h2><p>${esc(w.description||'')}</p>${url?`<a class="modal-link" href="${esc(url)}" target="_blank" rel="noopener">사이트 보기 ↗</a>`:''}</div>`);return;}openModal(`<div class="image-modal"><img src="${esc(w.image)}" alt="${esc(w.title)}"><h2>${esc(w.title)}</h2><p>${esc(w.description||'')}</p></div>`);}));}
$$('.filter').forEach(btn=>btn.addEventListener('click',()=>{$$('.filter').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderWorks(btn.dataset.filter);}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
loadWorks();