const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const {createClient}=supabase;
const db=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
let currentUser=null, editingId=null, detailFiles=[], coverFile=null, socialCoverFile=null;

function showMessage(msg,type='error'){
  const el=$('#message'); if(!el)return;
  el.textContent=msg; el.className=`message ${type}`; el.hidden=false;
}
function hideMessage(){const el=$('#message');if(el){el.hidden=true;el.textContent='';}}
function previewImage(file,target){
  const el=$(target); if(!el)return;
  if(!file){el.innerHTML='<span>이미지를 선택하세요.</span>';return;}
  const r=new FileReader(); r.onload=()=>{el.innerHTML=`<img src="${r.result}" alt="미리보기">`}; r.readAsDataURL(file);
}
function bindFileButton(btn){
  const target=btn.dataset.target, input=$(`#${target}`); if(!input)return;
  btn.addEventListener('click',()=>input.click());
}
$$('.upload-btn').forEach(bindFileButton);
$('#cover-input')?.addEventListener('change',()=>{coverFile=$('#cover-input').files[0]||null;previewImage(coverFile,'#cover-preview')});
$('#social-cover-input')?.addEventListener('change',()=>{socialCoverFile=$('#social-cover-input').files[0]||null;previewImage(socialCoverFile,'#social-cover-preview')});
$('#detail-input')?.addEventListener('change',()=>{detailFiles=[...($('#detail-input').files||[])];$('#detail-count').textContent=`${detailFiles.length}장 선택됨`});

function setLoggedIn(user){
  currentUser=user;
  $('#login-panel').hidden=!!user;
  $('#admin-panel').hidden=!user;
  if(user) loadWorks();
}

async function init(){
  hideMessage();
  const {data,error}=await db.auth.getSession();
  if(error){showMessage(`세션 확인 실패: ${error.message}`);return;}
  setLoggedIn(data.session?.user||null);
  db.auth.onAuthStateChange((_event,session)=>setLoggedIn(session?.user||null));
}

$('#login-form')?.addEventListener('submit',async e=>{
  e.preventDefault();
  hideMessage();
  const email=$('#login-email').value.trim(), password=$('#login-password').value;
  if(!email||!password){showMessage('이메일과 비밀번호를 입력하세요.');return;}
  const btn=$('#login-form button[type="submit"]'); if(btn){btn.disabled=true;btn.textContent='로그인 중...';}
  const {data,error}=await db.auth.signInWithPassword({email,password});
  if(error){showMessage(`로그인 실패: ${error.message}`);if(btn){btn.disabled=false;btn.textContent='로그인';}return;}
  setLoggedIn(data.user);
  if(btn){btn.disabled=false;btn.textContent='로그인';}
});

$('#logout-btn')?.addEventListener('click',async()=>{await db.auth.signOut();setLoggedIn(null);});

function categoryFromUi(v){
  const map={'BANNER':'banner','DETAIL PAGE':'detail','BLOG':'blog','SOCIAL / VIDEO':'social','AI VISUAL':'ai','WEB':'web'};return map[v]||String(v||'').toLowerCase();
}
function uiCategory(v){const map={banner:'BANNER',detail:'DETAIL PAGE',blog:'BLOG',social:'SOCIAL / VIDEO',video:'SOCIAL / VIDEO',ai:'AI VISUAL',web:'WEB'};return map[v]||v;}

async function uploadFile(file,path){
  if(!file)return null;
  const {error}=await db.storage.from('portfolio').upload(path,file,{upsert:true,cacheControl:'3600'});
  if(error)throw error;
  return db.storage.from('portfolio').getPublicUrl(path).data.publicUrl;
}

function resetForm(){
  editingId=null; detailFiles=[];coverFile=null;socialCoverFile=null;
  $('#work-form')?.reset();
  $('#form-title').textContent='새 작업 등록';
  $('#detail-count').textContent='0장 선택됨';
  previewImage(null,'#cover-preview');previewImage(null,'#social-cover-preview');
  $$('.category-fields').forEach(x=>x.hidden=true);
  $('#fields-banner').hidden=false;
  $('#category').value='BANNER';
  $('#delete-btn').hidden=true;
}

function showCategoryFields(){
  const c=$('#category').value;
  $$('.category-fields').forEach(x=>x.hidden=true);
  const target=$(`#fields-${categoryFromUi(c)}`); if(target)target.hidden=false;
}
$('#category')?.addEventListener('change',showCategoryFields);

async function loadWorks(){
  const list=$('#work-list'); if(!list)return;
  list.innerHTML='<div class="loading">작업물을 불러오는 중...</div>';
  const {data,error}=await db.from('works').select('*').order('created_at',{ascending:false});
  if(error){list.innerHTML='';showMessage(`작업물 조회 실패: ${error.message}`);return;}
  list.innerHTML='';
  if(!data?.length){list.innerHTML='<div class="loading">등록된 작업이 없습니다.</div>';return;}
  data.forEach(renderRow);
}
function renderRow(w){
  const m=w.meta||{};
  const row=document.createElement('div');row.className='work-row';
  row.innerHTML=`<div class="work-thumb">${w.image_url||w.image?`<img src="${w.image_url||w.image}" alt="">`:''}</div><div class="work-info"><b>${escapeHtml(w.title||'제목 없음')}</b><span>${escapeHtml(uiCategory(w.category))}</span>${m.blog_url?`<small>BLOG URL</small>`:''}${m.social_url?`<small>REELS URL</small>`:''}</div><button type="button" class="edit-btn">수정</button>`;
  row.querySelector('.edit-btn').addEventListener('click',()=>editWork(w));list.appendChild(row);
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}

async function editWork(w){
  editingId=w.id; $('#form-title').textContent='작업 수정';$('#delete-btn').hidden=false;
  $('#title').value=w.title||'';$('#category').value=uiCategory(w.category);$('#description').value=w.description||'';showCategoryFields();
  coverFile=null;socialCoverFile=null;detailFiles=[];
  previewImage(null,'#cover-preview');previewImage(null,'#social-cover-preview');
  if(w.image_url||w.image) $('#cover-preview').innerHTML=`<img src="${w.image_url||w.image}" alt="현재 이미지">`;
  const m=w.meta||{};
  if($('#blog-url'))$('#blog-url').value=m.blog_url||'';
  if($('#social-url'))$('#social-url').value=m.social_url||'';
  if(w.category==='social'&&(w.image_url||w.image))$('#social-cover-preview').innerHTML=`<img src="${w.image_url||w.image}" alt="현재 썸네일">`;
  window.scrollTo({top:0,behavior:'smooth'});
}

$('#work-form')?.addEventListener('submit',async e=>{
  e.preventDefault();hideMessage();
  if(!currentUser){showMessage('로그인 세션이 없습니다. 새로고침 후 다시 로그인하세요.');return;}
  const title=$('#title').value.trim(), category=categoryFromUi($('#category').value), description=$('#description').value.trim();
  if(!title){showMessage('제목을 입력하세요.');return;}
  const submit=e.submitter; if(submit)submit.disabled=true;
  try{
    let image=editingId?null:null, detail_images=[];
    if(coverFile) image=await uploadFile(coverFile,`${editingId||crypto.randomUUID()}/cover`);
    if(category==='social'){
      const url=$('#social-url').value.trim();if(!url)throw new Error('릴스 / SNS 영상 URL을 입력하세요.');
      if(socialCoverFile) image=await uploadFile(socialCoverFile,`${editingId||crypto.randomUUID()}/cover`);
    }
    if(category==='detail'&&detailFiles.length){
      const base=editingId||crypto.randomUUID();
      for(let i=0;i<detailFiles.length;i++) detail_images.push(await uploadFile(detailFiles[i],`${base}/detail-${i+1}`));
      if(!image)image=detail_images[0]||null;
    }
    let existing=null;
    if(editingId){const r=await db.from('works').select('*').eq('id',editingId).single();if(r.error)throw r.error;existing=r.data;}
    const meta={...(existing?.meta||{})};
    if(category==='blog')meta.blog_url=$('#blog-url').value.trim();else delete meta.blog_url;
    if(category==='social')meta.social_url=$('#social-url').value.trim();else delete meta.social_url;
    const payload={title,category,description,meta};
    if(image)payload.image=image;
    else if(existing?.image_url)payload.image=existing.image_url;
    if(detail_images.length)payload.detail_images=detail_images;
    else if(existing?.detail_images)payload.detail_images=existing.detail_images;
    let result;
    if(editingId)result=await db.from('works').update(payload).eq('id',editingId);
    else result=await db.from('works').insert(payload);
    if(result.error)throw result.error;
    showMessage(editingId?'작업이 수정되었습니다.':'작업이 등록되었습니다.','success');
    resetForm();await loadWorks();
  }catch(err){console.error(err);showMessage(`저장 실패: ${err.message||err}`);}
  finally{if(submit)submit.disabled=false;}
});

$('#delete-btn')?.addEventListener('click',async()=>{
  if(!editingId)return;if(!confirm('이 작업을 삭제할까요?'))return;
  const {error}=await db.from('works').delete().eq('id',editingId);if(error){showMessage(`삭제 실패: ${error.message}`);return;}showMessage('삭제되었습니다.','success');resetForm();loadWorks();
});
$('#new-btn')?.addEventListener('click',resetForm);
showCategoryFields();init();