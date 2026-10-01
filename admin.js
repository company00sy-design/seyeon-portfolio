const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const {createClient}=supabase;
const db=createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY);
let currentUser=null,editingId=null,detailFiles=[],coverFile=null,detailCoverFile=null,socialCoverFile=null,socialVideoFile=null,aiFiles=[],photoFiles=[],videoFile=null,webFiles=[],webCoverFile=null;
function messageEl(){return $('#form-message')||$('#login-error');}
function showMessage(msg,type='error'){const el=messageEl();if(!el)return;el.textContent=msg;el.className=type==='success'?'form-message success':'error';el.hidden=false;}
function hideMessage(){$$('.error,.form-message').forEach(el=>{el.hidden=true;el.textContent='';});}
function previewImage(file,target){const el=$(target);if(!el)return;if(!file){el.innerHTML='<span>이미지를 선택하세요.</span>';return;}const r=new FileReader();r.onload=()=>{el.innerHTML=`<img src="${r.result}" alt="미리보기">`};r.readAsDataURL(file);}
function previewImages(files,target){const el=$(target);if(!el)return;if(!files?.length){el.innerHTML='';return;}el.innerHTML='';files.forEach(file=>{const r=new FileReader();r.onload=()=>{const img=document.createElement('img');img.src=r.result;img.alt='미리보기';el.appendChild(img);};r.readAsDataURL(file);});}
function previewVideo(file,target){const el=$(target);if(!el)return;if(!file){el.innerHTML='<span>동영상 파일을 선택하세요.</span>';return;}const url=URL.createObjectURL(file);el.innerHTML=`<video src="${url}" controls muted playsinline autoplay loop></video>`;}
function previewExistingImages(urls,target){const el=$(target);if(!el)return;el.innerHTML='';(urls||[]).forEach((src,i)=>{const wrap=document.createElement('div');wrap.className='existing-detail-item';wrap.innerHTML=`<img src="${escapeHtml(src)}" alt="현재 상세 이미지 ${i+1}"><span>${i+1}</span>`;el.appendChild(wrap);});}
function bindFileButton(btn){const target=btn.dataset.target,input=$(`#${target}`);if(input)btn.addEventListener('click',()=>input.click());}
$$('.upload-btn').forEach(bindFileButton);
$('#cover-input')?.addEventListener('change',()=>{coverFile=$('#cover-input').files[0]||null;previewImage(coverFile,'#cover-preview');});
$('#detail-cover-input')?.addEventListener('change',()=>{detailCoverFile=$('#detail-cover-input').files[0]||null;previewImage(detailCoverFile,'#detail-cover-preview');});
$('#social-cover-input')?.addEventListener('change',()=>{socialCoverFile=$('#social-cover-input').files[0]||null;previewImage(socialCoverFile,'#social-cover-preview');});$('#social-video-input')?.addEventListener('change',()=>{socialVideoFile=$('#social-video-input').files[0]||null;previewVideo(socialVideoFile,'#social-video-preview');});
function syncSocialSource(){const source=$('#social-source')?.value||'file';const urlWrap=$('#social-url-wrap'),fileWrap=$('#social-file-wrap');if(urlWrap)urlWrap.hidden=source!=='url';if(fileWrap)fileWrap.hidden=source!=='file';const url=$('#social-url');if(url)url.required=source==='url';}
$('#social-source')?.addEventListener('change',syncSocialSource);
syncSocialSource();
$('#detail-input')?.addEventListener('change',()=>{detailFiles=[...($('#detail-input').files||[])];const c=$('#detail-count');if(c)c.textContent=`${detailFiles.length}장 선택됨`;previewImages(detailFiles,'#detail-preview');});
$('#ai-input')?.addEventListener('change',()=>{aiFiles=[...($('#ai-input').files||[])];previewImages(aiFiles,'#ai-preview');});
$('#photo-input')?.addEventListener('change',()=>{photoFiles=[...($('#photo-input').files||[])];previewImages(photoFiles,'#photo-preview');});
$('#video-only-input')?.addEventListener('change',()=>{videoFile=$('#video-only-input').files[0]||null;previewVideo(videoFile,'#video-only-preview');});
$('#web-input')?.addEventListener('change',()=>{webFiles=[...($('#web-input').files||[])];previewImages(webFiles,'#web-preview');});
$('#web-cover-input')?.addEventListener('change',()=>{webCoverFile=$('#web-cover-input').files[0]||null;previewImage(webCoverFile,'#web-cover-preview');});
function setLoggedIn(user){currentUser=user;const loginView=$('#login-view'),adminView=$('#admin-view');if(loginView)loginView.hidden=!!user;if(adminView)adminView.hidden=!user;if(user)loadWorks();}
async function init(){hideMessage();if(!window.SUPABASE_URL||!window.SUPABASE_ANON_KEY){showMessage('Supabase 설정을 찾을 수 없습니다.');return;}try{const {data,error}=await db.auth.getSession();if(error){showMessage(`세션 확인 실패: ${error.message}`);return;}setLoggedIn(data.session?.user||null);db.auth.onAuthStateChange((_event,session)=>setLoggedIn(session?.user||null));}catch(err){showMessage(`초기화 실패: ${err.message||err}`);}}
$('#login-form')?.addEventListener('submit',async e=>{e.preventDefault();hideMessage();const email=$('#email')?.value.trim()||'',password=$('#password')?.value||'';if(!email||!password){showMessage('이메일과 비밀번호를 입력하세요.');return;}const btn=$('#login-form button[type="submit"]');if(btn){btn.disabled=true;btn.textContent='로그인 중...';}try{const {data,error}=await db.auth.signInWithPassword({email,password});if(error)throw error;setLoggedIn(data.user);}catch(err){showMessage(`로그인 실패: ${err.message||err}`);}finally{if(btn){btn.disabled=false;btn.textContent='로그인';}}});
$('#logout-btn')?.addEventListener('click',async()=>{await db.auth.signOut();setLoggedIn(null);});
function getPlatformFromUrl(url){try{const u=new URL(String(url||''));const host=u.hostname.toLowerCase().replace(/^www\./,'').replace(/^m\./,'');if(host.includes('youtube')||host==='youtu.be')return 'youtube';if(host==='instagram.com')return 'instagram';}catch{}return 'instagram';}
function categoryFromUi(v){const map={'BANNER':'banner','DETAIL PAGE':'detail','BLOG':'blog','SOCIAL / REELS':'social','SOCIAL / VIDEO':'social','VIDEO':'video','AI VISUAL':'ai','PHOTO / RETOUCHING':'photo','WEB':'web'};return map[v]||String(v||'').toLowerCase();}
function uiCategory(v){const map={banner:'BANNER',detail:'DETAIL PAGE',blog:'BLOG',social:'SOCIAL / REELS',video:'VIDEO',ai:'AI VISUAL',photo:'PHOTO / RETOUCHING',web:'WEB'};return map[v]||v;}
async function optimizeImage(file,max=2400,quality=.86){
  if(!file||!file.type.startsWith('image/')||/image\/(gif|svg\+xml|avif)/i.test(file.type))return file;
  try{
    const bitmap=await createImageBitmap(file);
    const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
    const width=Math.max(1,Math.round(bitmap.width*scale));
    const height=Math.max(1,Math.round(bitmap.height*scale));
    const canvas=document.createElement('canvas');
    canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d');
    ctx.drawImage(bitmap,0,0,width,height);
    bitmap.close?.();
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));
    if(!blob||blob.size>=file.size*0.92)return file;
    return new File([blob],(file.name.replace(/\.[^.]+$/,'')||'image')+'.webp',{type:'image/webp',lastModified:Date.now()});
  }catch{return file;}
}
async function createThumbnail(file){
  return optimizeImage(file,900,.80);
}
async function uploadThumbnail(file,path){
  if(!file)return null;
  const thumb=await createThumbnail(file);
  if(!thumb||!thumb.type.startsWith('image/'))return null;
  const uploadPath=path.replace(/\.(jpe?g|png|webp)$/i,'')+'-thumb.webp';
  const {error}=await db.storage.from('portfolio').upload(uploadPath,thumb,{upsert:true,cacheControl:'31536000',contentType:'image/webp'});
  if(error)throw error;
  return db.storage.from('portfolio').getPublicUrl(uploadPath).data.publicUrl;
}
async function createVideoThumbnail(file){
  if(!file)return null;
  return new Promise((resolve)=>{
    const video=document.createElement('video');
    const url=URL.createObjectURL(file);
    video.muted=true;video.playsInline=true;video.preload='metadata';
    video.onloadeddata=()=>{video.currentTime=Math.min(.15,video.duration||0);};
    video.onseeked=()=>{
      try{
        const canvas=document.createElement('canvas');
        const max=900,scale=Math.min(1,max/Math.max(video.videoWidth,video.videoHeight));
        canvas.width=Math.max(1,Math.round(video.videoWidth*scale));canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
        canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
        canvas.toBlob(blob=>{URL.revokeObjectURL(url);resolve(blob?new File([blob],'video-thumb.webp',{type:'image/webp'}):null);},'image/webp',.82);
      }catch{URL.revokeObjectURL(url);resolve(null);}
    };
    video.onerror=()=>{URL.revokeObjectURL(url);resolve(null);};
    video.src=url;
  });
}
async function fetchInstagramThumbnail(url){
  if(!url)return null;
  try{
    const res=await fetch('/api/instagram-thumb?url='+encodeURIComponent(url),{cache:'no-store'});
    if(!res.ok)return null;
    const blob=await res.blob();
    if(!blob.type.startsWith('image/'))return null;
    return new File([blob],'instagram-cover.jpg',{type:blob.type||'image/jpeg'});
  }catch(err){
    console.warn('Instagram thumbnail fetch failed:',err);
    return null;
  }
}
async function uploadVideoFile(file,path){
  if(!file)return null;
  const {error}=await db.storage.from('portfolio').upload(path,file,{upsert:true,cacheControl:'31536000',contentType:file.type||'video/mp4'});
  if(error)throw error;
  return db.storage.from('portfolio').getPublicUrl(path).data.publicUrl;
}
async function uploadFile(file,path){
  if(!file)return null;
  const optimized=await optimizeImage(file);
  const ext=/\.webp$/i.test(optimized.name)?'.webp':'';
  const uploadPath=path.replace(/\.(jpe?g|png|webp)$/i,'')+ext;
  const {error}=await db.storage.from('portfolio').upload(uploadPath,optimized,{upsert:true,cacheControl:'31536000',contentType:optimized.type||undefined});
  if(error)throw error;
  return db.storage.from('portfolio').getPublicUrl(uploadPath).data.publicUrl;
}
function setCategoryRequired(active){const ids=['blog-url','social-url','web-url','social-platform','social-source'];ids.forEach(id=>{const el=$(`#${id}`);if(el)el.required=false;});if(active==='blog')$('#blog-url')?.setAttribute('required','');if(active==='social'){$('#social-platform')?.setAttribute('required','');$('#social-source')?.setAttribute('required','');syncSocialSource();}if(active==='web')$('#web-url')?.setAttribute('required','');}
function resetForm(){editingId=null;detailFiles=[];coverFile=null;detailCoverFile=null;socialCoverFile=null;aiFiles=[];photoFiles=[];videoFile=null;webFiles=[];webCoverFile=null;$('#work-form')?.reset();const title=$('#form-title');if(title)title.textContent='작업 추가';const count=$('#detail-count');if(count)count.textContent='0장 선택됨';previewImage(null,'#cover-preview');previewImage(null,'#detail-cover-preview');previewImage(null,'#social-cover-preview');if($('#social-platform'))$('#social-platform').value='instagram';if($('#social-source'))$('#social-source').value='file';if($('#social-url'))$('#social-url').value='';if($('#social-video-input'))$('#social-video-input').value='';socialVideoFile=null;syncSocialSource();previewImages([],'#detail-preview');previewImages([],'#ai-preview');previewImages([],'#photo-preview');previewVideo(null,'#video-only-preview');previewImage(null,'#web-cover-preview');previewImages([],'#web-preview');$('.category-fields').forEach(x=>x.hidden=true);const banner=$('#fields-banner');if(banner)banner.hidden=false;const cat=$('#category');if(cat)cat.value='banner';setCategoryRequired('banner');const cancel=$('#cancel-edit');if(cancel)cancel.hidden=true;}
function showCategoryFields(){const c=$('#category')?.value||'banner';$$('.category-fields').forEach(x=>x.hidden=true);const target=$(`#fields-${categoryFromUi(c)}`);if(target)target.hidden=false;setCategoryRequired(c);}
$('#category')?.addEventListener('change',showCategoryFields);$('#cancel-edit')?.addEventListener('click',resetForm);
let allWorks=[];let activeWorkFilter='all';let workSearchTerm='';
const workCategories=[['all','전체'],['banner','배너'],['detail','상세페이지'],['blog','블로그'],['social','SNS · 영상'],['ai','AI 비주얼'],['photo','촬영 · 보정'],['web','웹']];
function initWorkFilters(){const wrap=$('#work-filters');if(!wrap)return;wrap.innerHTML='';workCategories.forEach(([value,label])=>{const b=document.createElement('button');b.type='button';b.className='work-filter'+(value==='all'?' active':'');b.dataset.filter=value;b.textContent=label;b.addEventListener('click',()=>{activeWorkFilter=value;$$('#work-filters .work-filter').forEach(x=>x.classList.toggle('active',x===b));renderWorkList();});wrap.appendChild(b);});$('#work-search')?.addEventListener('input',e=>{workSearchTerm=e.target.value.trim().toLowerCase();renderWorkList();});}
function matchesWork(w){const category=w.category||'';const title=String(w.title||'').toLowerCase();return(activeWorkFilter==='all'||category===activeWorkFilter)&&(!workSearchTerm||title.includes(workSearchTerm));}
function renderWorkList(){const list=$('#work-list');if(!list)return;list.innerHTML='';const filtered=allWorks.filter(matchesWork);const count=$('#work-count');if(count)count.textContent=String(filtered.length);const empty=$('#list-empty');if(empty)empty.hidden=!!filtered.length;if(!filtered.length)return;filtered.forEach(renderRow);}
initWorkFilters();
async function optimizeExistingImage(url){
  if(!url||!/^https?:\/\//i.test(url))return url;
  try{
    const parsed=new URL(url);
    const marker='/storage/v1/object/public/portfolio/';
    const idx=parsed.pathname.indexOf(marker);
    if(idx<0)return url;
    const path=decodeURIComponent(parsed.pathname.slice(idx+marker.length));
    const res=await fetch(url,{cache:'no-store'});
    if(!res.ok)return url;
    const blob=await res.blob();
    if(!blob.type.startsWith('image/')||/image\/(gif|svg\+xml|avif)/i.test(blob.type))return url;
    const optimized=await optimizeImage(new File([blob],path.split('/').pop()||'image',{type:blob.type}));
    const {error}=await db.storage.from('portfolio').upload(path,optimized,{upsert:true,cacheControl:'31536000',contentType:optimized.type||'image/webp'});
    if(error)throw error;
    return db.storage.from('portfolio').getPublicUrl(path).data.publicUrl+'?v=20260930';
  }catch(err){
    console.warn('Image optimization skipped:',url,err);
    return url;
  }
}
async function createExistingThumbnail(url){
  if(!url||!/^https?:\/\//i.test(url))return null;
  try{
    const parsed=new URL(url);
    const marker='/storage/v1/object/public/portfolio/';
    const idx=parsed.pathname.indexOf(marker);
    if(idx<0)return null;
    const path=decodeURIComponent(parsed.pathname.slice(idx+marker.length));
    const res=await fetch(url,{cache:'no-store'});
    if(!res.ok)return null;
    const blob=await res.blob();
    if(!blob.type.startsWith('image/')||/image\/(gif|svg\+xml|avif)/i.test(blob.type))return null;
    const thumb=await createThumbnail(new File([blob],path.split('/').pop()||'image',{type:blob.type}));
    const thumbPath=path.replace(/\.(jpe?g|png|webp)$/i,'')+'-thumb.webp';
    const {error}=await db.storage.from('portfolio').upload(thumbPath,thumb,{upsert:true,cacheControl:'31536000',contentType:'image/webp'});
    if(error)throw error;
    return db.storage.from('portfolio').getPublicUrl(thumbPath).data.publicUrl+'?v=20261001';
  }catch(err){
    console.warn('Thumbnail generation skipped:',url,err);
    return null;
  }
}
async function optimizeExistingWorks(){
  const btn=$('#optimize-existing-btn');
  if(!btn||!currentUser)return;
  if(!confirm('등록된 이미지들을 WebP로 최적화합니다. 이미지 수에 따라 시간이 걸릴 수 있습니다. 진행할까요?'))return;
  btn.disabled=true;
  const original=btn.textContent;
  let done=0,total=0;
  try{
    const {data,error}=await db.from('works').select('*');
    if(error)throw error;
    total=(data||[]).reduce((n,w)=>n+(w.image_url||w.image?1:0)+parseImages(w.detail_images).length,0);
    for(const w of data||[]){
      let changed=false;
      let image=w.image_url||w.image||'';
      let meta={...(w.meta||{})};
      if(image){
        const optimized=await optimizeExistingImage(image);
        if(optimized!==image){image=optimized;changed=true;}
        const thumb=await createExistingThumbnail(image);
        if(thumb&&thumb!==meta.thumbnail_url){meta.thumbnail_url=thumb;changed=true;}
        done++;btn.textContent='최적화 중 '+done+'/'+total;
      }
      let detail=parseImages(w.detail_images);
      if(detail.length){
        const next=[];
        for(const url of detail){
          const optimized=await optimizeExistingImage(url);
          next.push(optimized);
          if(optimized!==url)changed=true;
          done++;btn.textContent='최적화 중 '+done+'/'+total;
        }
        detail=next;
      }
      if(changed){
        const payload={meta};
        if(image)payload.image=image;
        if(detail.length)payload.detail_images=detail;
        const {error:updateError}=await db.from('works').update(payload).eq('id',w.id);
        if(updateError)throw updateError;
      }
    }
    allWorks=data||[];
    await loadWorks();
    showMessage('기존 이미지 최적화가 완료되었습니다.','success');
  }catch(err){
    console.error(err);
    showMessage('이미지 최적화 실패: '+(err.message||err));
  }finally{
    btn.disabled=false;btn.textContent=original;
  }
}
async function loadWorks(){const list=$('#work-list');if(!list)return;list.innerHTML='<div class="loading">작업물을 불러오는 중...</div>';const {data,error}=await db.from('works').select('*').order('created_at',{ascending:false});if(error){list.innerHTML='';showMessage(`작업물 조회 실패: ${error.message}`);return;}allWorks=data||[];renderWorkList();}
function renderRow(w){const m=w.meta||{},src=w.image_url||w.image||'';const row=document.createElement('div');row.className='work-row';row.innerHTML=`<div class="work-thumb">${src?`<img src="${escapeHtml(src)}" alt="" loading="lazy" decoding="async">`:w.category==='social'?'릴스 링크':escapeHtml(uiCategory(w.category))}</div><div class="work-info"><b>${escapeHtml(w.title||'제목 없음')}</b><span>${escapeHtml(uiCategory(w.category))}</span>${m.blog_url?'<small>BLOG URL</small>':''}${m.social_url?'<small>REELS URL</small>':''}</div><div class="row-actions"><button type="button" class="edit-btn">수정</button></div>`;row.querySelector('.edit-btn').addEventListener('click',()=>editWork(w));listAppend(row);}
function listAppend(row){$('#work-list')?.appendChild(row);}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
async function editWork(w){editingId=w.id;$('#form-title').textContent='작업 수정';$('#cancel-edit').hidden=false;$('#title').value=w.title||'';$('#category').value=w.category||'banner';$('#year').value=w.year||'';$('#sort-order').value=w.sort_order??0;$('#featured').checked=!!w.featured;$('#common-description').value=w.description||'';showCategoryFields();coverFile=null;detailCoverFile=null;socialCoverFile=null;detailFiles=[];aiFiles=[];photoFiles=[];videoFile=null;webFiles=[];webCoverFile=null;previewImage(null,'#cover-preview');previewImage(null,'#detail-cover-preview');previewImage(null,'#social-cover-preview');previewImages([],'#detail-preview');previewImages([],'#ai-preview');previewImages([],'#photo-preview');previewVideo(null,'#video-only-preview');previewImage(null,'#web-cover-preview');previewImages([],'#web-preview');const src=w.image_url||w.image||'';if(src&&w.category==='banner')$('#cover-preview').innerHTML=`<img src="${escapeHtml(src)}" alt="현재 이미지">`;const m=w.meta||{};if($('#blog-url'))$('#blog-url').value=m.blog_url||'';if($('#social-platform'))$('#social-platform').value=m.social_platform||(m.social_url&&getPlatformFromUrl(m.social_url))||'instagram';if($('#social-source'))$('#social-source').value=m.social_source||((m.video_url)?'file':'url');if($('#social-url'))$('#social-url').value=m.social_url||'';syncSocialSource();if($('#web-url'))$('#web-url').value=m.web_url||'';if(src&&w.category==='social')$('#social-cover-preview').innerHTML=`<img src="${escapeHtml(src)}" alt="현재 SNS 썸네일">`;if(w.category==='photo'){const images=parseImages(w.detail_images);if(images.length)previewExistingImages(images,'#photo-preview');}if(w.category==='web'){if(src)$('#web-cover-preview').innerHTML=`<img src="${escapeHtml(src)}" alt="현재 대표 이미지">`;const images=parseImages(w.detail_images);if(images.length)previewExistingImages(images,'#web-preview');}if(w.category==='detail'&&src)$('#detail-cover-preview').innerHTML=`<img src="${escapeHtml(src)}" alt="현재 썸네일">`;if(w.category==='detail'){const images=parseImages(w.detail_images);if(images.length){previewExistingImages(images,'#detail-preview');const c=$('#detail-count');if(c)c.textContent=`현재 ${images.length}장 등록됨`;}}window.scrollTo({top:0,behavior:'smooth'});}
$('#work-form')?.addEventListener('submit',async e=>{e.preventDefault();hideMessage();if(!currentUser){showMessage('로그인 세션이 없습니다. 새로고침 후 다시 로그인하세요.');return;}const title=$('#title')?.value.trim()||'',category=categoryFromUi($('#category')?.value),description=$('#common-description')?.value.trim()||'',year=Number($('#year')?.value)||new Date().getFullYear(),sort_order=Number($('#sort-order')?.value)||0,featured=!!$('#featured')?.checked;if(!title){showMessage('제목을 입력하세요.');return;}if(category==='web'&&!$('#web-url')?.value.trim()){showMessage('웹사이트 URL을 입력하세요.');return;}if(category==='blog'&&!$('#blog-url')?.value.trim()){showMessage('블로그 URL을 입력하세요.');return;}if(category==='social'&&!$('#social-platform')?.value){showMessage('SNS 플랫폼을 선택하세요.');return;}const submit=e.submitter;showMessage('저장 중입니다...','success');if(submit)submit.disabled=true;try{let image=null,detail_images=[];let thumbnail_url=null;let imageSourceFile=null;let existing=null;if(editingId){const r=await db.from('works').select('*').eq('id',editingId).single();if(r.error)throw r.error;existing=r.data;}const base=editingId||crypto.randomUUID();if(category==='banner'&&coverFile){image=await uploadFile(coverFile,`${base}/cover`);imageSourceFile=coverFile;}if(category==='detail'){if(detailCoverFile){image=await uploadFile(detailCoverFile,`${base}/cover`);imageSourceFile=detailCoverFile;}if(detailFiles.length){for(let i=0;i<detailFiles.length;i++)detail_images.push(await uploadFile(detailFiles[i],`${base}/detail-${i+1}`));if(!image){image=detail_images[0]||null;if(!imageSourceFile&&detailFiles[0])imageSourceFile=detailFiles[0];}}}if(category==='social'){const source=$('#social-source').value;if(source==='file'){if(!socialVideoFile&&!existing?.meta?.video_url)throw new Error('동영상 파일을 선택해주세요.');if(socialVideoFile){const videoUrl=await uploadVideoFile(socialVideoFile,`${base}/social-video`);if(!existing)existing={meta:{}};existing.meta={...(existing.meta||{}),video_url:videoUrl};if(!socialCoverFile){const videoThumb=await createVideoThumbnail(socialVideoFile);if(videoThumb){image=await uploadFile(videoThumb,`${base}/social-video-cover`);thumbnail_url=await uploadThumbnail(videoThumb,`${base}/social-video-cover`);}}}}else{const socialUrl=$('#social-url').value.trim();if(!socialUrl)throw new Error('영상 URL을 입력해주세요.');if($('#social-platform').value==='instagram'&&!socialCoverFile){const autoCover=await fetchInstagramThumbnail(socialUrl);if(autoCover){image=await uploadFile(autoCover,`${base}/social-cover-auto`);imageSourceFile=autoCover;}else{console.warn('Instagram 자동 썸네일을 가져오지 못했습니다.');}}}if(socialCoverFile){image=await uploadFile(socialCoverFile,`${base}/social-cover`);imageSourceFile=socialCoverFile;}}if(category==='ai'&&aiFiles.length){for(let i=0;i<aiFiles.length;i++)detail_images.push(await uploadFile(aiFiles[i],`${base}/ai-${i+1}`));if(!image){image=detail_images[0]||null;if(!imageSourceFile&&aiFiles[0])imageSourceFile=aiFiles[0];}}if(category==='photo'&&photoFiles.length){for(let i=0;i<photoFiles.length;i++)detail_images.push(await uploadFile(photoFiles[i],`${base}/photo-${i+1}`));if(!image){image=detail_images[0]||null;if(!imageSourceFile&&photoFiles[0])imageSourceFile=photoFiles[0];}}if(category==='video'&&videoFile)image=await uploadFile(videoFile,`${base}/video`);if(category==='web'){if(webFiles.length){for(let i=0;i<webFiles.length;i++)detail_images.push(await uploadFile(webFiles[i],`${base}/web-${i+1}`));}if(webCoverFile){image=await uploadFile(webCoverFile,`${base}/cover`);imageSourceFile=webCoverFile;}if(!image){image=detail_images[0]||null;if(!imageSourceFile&&webFiles[0])imageSourceFile=webFiles[0];}}if(category==='banner'&&!image&&$('#image-url')?.value.trim())image=$('#image-url').value.trim();if(imageSourceFile){thumbnail_url=await uploadThumbnail(imageSourceFile,`${base}/cover`);}const meta={...(existing?.meta||{})};if(thumbnail_url)meta.thumbnail_url=thumbnail_url;if(category==='blog')meta.blog_url=$('#blog-url').value.trim();else delete meta.blog_url;if(category==='social'){const source=$('#social-source').value;meta.social_platform=$('#social-platform').value;if(source==='url'){meta.social_url=$('#social-url').value.trim();delete meta.video_url;}else{delete meta.social_url;if(existing?.meta?.video_url)meta.video_url=existing.meta.video_url;meta.social_source='file';}}else{delete meta.social_url;delete meta.social_platform;delete meta.video_url;delete meta.social_source;}if(category==='web')meta.web_url=$('#web-url').value.trim();else delete meta.web_url;const payload={title,category,year,sort_order,featured,description,meta};if(image)payload.image=image;else if(existing?.image_url||existing?.image)payload.image=existing.image_url||existing.image;if(detail_images.length)payload.detail_images=detail_images;else if(existing?.detail_images)payload.detail_images=existing.detail_images;const result=editingId?await db.from('works').update(payload).eq('id',editingId):await db.from('works').insert(payload);if(result.error)throw result.error;showMessage(editingId?'작업이 수정되었습니다.':'작업이 등록되었습니다.','success');resetForm();await loadWorks();}catch(err){console.error(err);showMessage(`저장 실패: ${err.message||err}`)}finally{if(submit)submit.disabled=false;}});
$('#new-btn')?.addEventListener('click',resetForm);showCategoryFields();init();

$('#optimize-existing-btn')?.addEventListener('click',optimizeExistingWorks);
