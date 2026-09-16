const { createClient } = window.supabase;
const sb = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
const BUCKET = 'portfolio';

const $ = (s) => document.querySelector(s);
const loginView = $('#login-view');
const adminView = $('#admin-view');
const loginForm = $('#login-form');
const loginError = $('#login-error');
const workForm = $('#work-form');
const workList = $('#work-list');
const listEmpty = $('#list-empty');
const workCount = $('#work-count');

let currentUser = null;
let coverFile = null;
let detailFiles = [];
let existingDetails = [];

function message(el, text, isError = false) {
  el.textContent = text;
  el.hidden = !text;
  el.classList.toggle('error', isError);
}

async function init() {
  const { data: { session } } = await sb.auth.getSession();
  currentUser = session?.user || null;
  showView();
  if (currentUser) loadWorks();
}

function showView() {
  loginView.hidden = !!currentUser;
  adminView.hidden = !currentUser;
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  message(loginError, '');
  const { data, error } = await sb.auth.signInWithPassword({
    email: $('#email').value.trim(),
    password: $('#password').value
  });
  if (error) return message(loginError, error.message || '로그인에 실패했습니다.', true);
  currentUser = data.user;
  showView();
  loadWorks();
});

$('#logout-btn').addEventListener('click', async () => {
  await sb.auth.signOut();
  currentUser = null;
  showView();
});

sb.auth.onAuthStateChange((_event, session) => {
  currentUser = session?.user || null;
  showView();
  if (currentUser) loadWorks();
});

function resetForm() {
  workForm.reset();
  $('#work-id').value = '';
  $('#sort-order').value = 0;
  $('#form-title').textContent = '작업 추가';
  $('#cancel-edit').hidden = true;
  $('#cover-preview').innerHTML = '<span>대표 이미지를 업로드하세요.</span>';
  $('#detail-preview').innerHTML = '';
  $('#image-url').value = '';
  coverFile = null;
  detailFiles = [];
  existingDetails = [];
  message($('#form-message'), '');
}

$('.upload-btn[data-target="cover-input"]').addEventListener('click', () => $('#cover-input').click());
$('.upload-btn[data-target="detail-input"]').addEventListener('click', () => $('#detail-input').click());

$('#cover-input').addEventListener('change', () => {
  coverFile = $('#cover-input').files[0] || null;
  if (!coverFile) return;
  const url = URL.createObjectURL(coverFile);
  $('#cover-preview').innerHTML = `<img src="${url}" alt="대표 이미지 미리보기">`;
});

$('#detail-input').addEventListener('change', () => {
  detailFiles = [...$('#detail-input').files];
  renderDetailPreview();
});

function renderDetailPreview() {
  const wrap = $('#detail-preview');
  wrap.innerHTML = '';
  existingDetails.forEach((url, index) => {
    const el = document.createElement('div');
    el.className = 'detail-thumb';
    el.innerHTML = `<img src="${url}" alt="상세 이미지"><button type="button" data-existing="${index}">×</button>`;
    el.querySelector('button').onclick = () => {
      existingDetails.splice(index, 1);
      renderDetailPreview();
    };
    wrap.appendChild(el);
  });
  detailFiles.forEach((file, index) => {
    const el = document.createElement('div');
    el.className = 'detail-thumb';
    el.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="새 상세 이미지"><button type="button">×</button>`;
    el.querySelector('button').onclick = () => {
      detailFiles.splice(index, 1);
      renderDetailPreview();
    };
    wrap.appendChild(el);
  });
}

async function uploadFile(file, folder) {
  const ext = file.name.split('.').pop().toLowerCase();
  const safeName = `${crypto.randomUUID()}.${ext}`;
  const path = `${folder}/${safeName}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, file, { upsert: false, cacheControl: '31536000' });
  if (error) throw error;
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

workForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('#form-message');
  message(msg, '저장 중…');

  try {
    const id = $('#work-id').value || crypto.randomUUID();
    let imageUrl = $('#image-url').value.trim();
    if (coverFile) imageUrl = await uploadFile(coverFile, `works/${id}/cover`);
    if (!imageUrl) throw new Error('대표 이미지를 선택하거나 이미지 URL을 입력해주세요.');

    const uploadedDetails = [];
    for (const file of detailFiles) uploadedDetails.push(await uploadFile(file, `works/${id}/details`));
    const detailImages = [...existingDetails, ...uploadedDetails];

    // The existing `works` table uses `image` for the representative image.
    // Do not send `image_url`, because that column does not exist in the current schema.
    const payload = {
      id,
      category: $('#category').value,
      title: $('#title').value.trim(),
      year: $('#year').value.trim(),
      image: imageUrl,
      featured: $('#featured').checked,
      sort_order: Number($('#sort-order').value) || 0,
      detail_images: detailImages
    };

    const isEdit = !!$('#work-id').value;
    let result;
    if (isEdit) result = await sb.from('works').update(payload).eq('id', id);
    else result = await sb.from('works').insert(payload);

    // detail_images is optional. If it has not been added to the DB yet,
    // save the rest of the work so representative-image registration still works.
    if (result.error && /detail_images|column/i.test(result.error.message || '')) {
      delete payload.detail_images;
      result = isEdit ? await sb.from('works').update(payload).eq('id', id) : await sb.from('works').insert(payload);
    }
    if (result.error) throw result.error;

    message(msg, '저장했습니다.');
    resetForm();
    await loadWorks();
  } catch (err) {
    console.error(err);
    message(msg, err.message || '저장 중 오류가 발생했습니다.', true);
  }
});

$('#cancel-edit').addEventListener('click', resetForm);

async function loadWorks() {
  const { data, error } = await sb.from('works').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false });
  if (error) {
    workList.innerHTML = `<div class="empty">작업을 불러오지 못했습니다.<br>${escapeHtml(error.message)}</div>`;
    return;
  }
  const works = data || [];
  workCount.textContent = works.length;
  listEmpty.hidden = works.length !== 0;
  workList.innerHTML = '';
  works.forEach(renderRow);
}

function renderRow(work) {
  const image = work.image_url || work.image || '';
  const row = document.createElement('div');
  row.className = 'work-row';
  row.innerHTML = `<img src="${escapeAttr(image)}" alt=""><div><b>${escapeHtml(work.title || '제목 없음')}</b><span>${escapeHtml(work.category || '')} · ${escapeHtml(work.year || '')}${work.featured ? ' · SELECTED' : ''}</span></div><div class="row-actions"><button type="button" data-edit>수정</button><button type="button" data-delete>삭제</button></div>`;
  row.querySelector('[data-edit]').onclick = () => editWork(work);
  row.querySelector('[data-delete]').onclick = () => deleteWork(work);
  workList.appendChild(row);
}

function editWork(work) {
  const image = work.image_url || work.image || '';
  $('#work-id').value = work.id;
  $('#title').value = work.title || '';
  $('#category').value = work.category || 'BANNER';
  $('#year').value = work.year || '';
  $('#sort-order').value = work.sort_order || 0;
  $('#featured').checked = !!work.featured;
  $('#image-url').value = image;
  $('#cover-preview').innerHTML = image ? `<img src="${escapeAttr(image)}" alt="대표 이미지">` : '<span>대표 이미지를 업로드하세요.</span>';
  existingDetails = Array.isArray(work.detail_images) ? [...work.detail_images] : [];
  detailFiles = [];
  renderDetailPreview();
  $('#form-title').textContent = '작업 수정';
  $('#cancel-edit').hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteWork(work) {
  if (!confirm(`“${work.title || '이 작업'}”을 삭제할까요?`)) return;
  const { error } = await sb.from('works').delete().eq('id', work.id);
  if (error) return alert(error.message);
  if ($('#work-id').value === work.id) resetForm();
  loadWorks();
}

function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function escapeAttr(value) { return escapeHtml(value); }

resetForm();
init();
