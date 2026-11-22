const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = { employees: [], editingId: '', deletingId: '', mode: 'local' };
const list = $('#employee-list');
const form = $('#employee-form');
const dialog = $('#employee-dialog');
const backdrop = $('#dialog-backdrop');
const confirmDialog = $('#confirm-dialog');
const photoInput = $('#photo');
const photoPreview = $('#photo-preview');
const navigationLinks = $$('.sidebar nav a');

const icons = {
  mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  pin: '<svg viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  building: '<svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 10h1M14 10h1M9 14h1M14 14h1"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6M14 10v6"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="m4 16-1 5 5-1L19 9l-4-4L4 16ZM13 7l4 4"/></svg>',
};

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function initials(employee) {
  return `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase();
}

function toast(message, type = '') {
  const node = $('#toast');
  node.textContent = message;
  node.className = `toast show ${type}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { node.className = 'toast'; }, 2800);
}

async function request(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'No se pudo completar la operación.');
  }
  return response.status === 204 ? null : response.json();
}

function renderMetrics() {
  const total = state.employees.length;
  const active = state.employees.filter((item) => item.status === 'Activo').length;
  const departments = new Set(state.employees.map((item) => item.department).filter(Boolean)).size;
  $('#metric-total').textContent = total;
  $('#metric-active').textContent = total ? `${Math.round(active / total * 100)}%` : '0%';
  $('#metric-departments').textContent = departments;
  $('#metric-updated').textContent = 'Ahora';
}

function renderDepartmentFilter() {
  const select = $('#department-filter');
  const selected = select.value;
  const departments = [...new Set(state.employees.map((item) => item.department).filter(Boolean))].sort();
  select.innerHTML = '<option value="">Todas</option>' + departments.map((item) => `<option>${escapeHtml(item)}</option>`).join('');
  select.value = selected;
}

function employeeCard(employee, index) {
  const photo = employee.photoUrl
    ? `<img src="${escapeHtml(employee.photoUrl)}" alt="Fotografía de ${escapeHtml(employee.firstName)} ${escapeHtml(employee.lastName)}">`
    : initials(employee);
  return `<tr class="employee-card" data-id="${escapeHtml(employee.employeeId)}">
    <td>${index + 1}</td>
    <td><div class="table-avatar">${photo}</div></td>
    <td><div class="employee-cell"><b>${escapeHtml(employee.firstName)} ${escapeHtml(employee.lastName)}</b><small>${escapeHtml(employee.email)}</small></div></td>
    <td>${escapeHtml(employee.department)}</td>
    <td>${escapeHtml(employee.role)}</td>
    <td>${escapeHtml(employee.location || 'Sin ubicación')}</td>
    <td><span class="status ${escapeHtml(employee.status.toLowerCase())}">${escapeHtml(employee.status)}</span></td>
    <td><div class="row-actions"><button class="action-view" type="button" data-action="view" aria-label="Ver empleado">${icons.eye}</button><button class="action-edit" type="button" data-action="edit" aria-label="Editar empleado">${icons.edit}</button><button class="action-delete" type="button" data-action="delete" aria-label="Eliminar empleado">${icons.trash}</button></div></td>
  </tr>`;
}

function renderList(items) {
  list.innerHTML = items.map(employeeCard).join('');
  $('#results-count').textContent = `${items.length} ${items.length === 1 ? 'empleado' : 'empleados'}`;
  $('#empty-state').hidden = items.length > 0;
  list.hidden = items.length === 0;
}

async function loadEmployees() {
  try {
    const parameters = new URLSearchParams({
      query: $('#search').value,
      department: $('#department-filter').value,
      status: $('#status-filter').value,
    });
    state.employees = await request(`/api/employees?${parameters}`);
    renderList(state.employees);
    renderMetrics();
    renderDepartmentFilter();
  } catch (error) { toast(error.message, 'error'); }
}

function openDialog(employee = null) {
  state.editingId = employee?.employeeId || '';
  form.reset();
  $('#employee-id').value = state.editingId;
  $('#dialog-title').textContent = employee ? 'Editar empleado' : 'Registrar empleado';
  $('#save-employee').textContent = employee ? 'Guardar cambios' : 'Guardar empleado';
  photoPreview.innerHTML = employee?.photoUrl
    ? `<img src="${escapeHtml(employee.photoUrl)}" alt="Vista previa">`
    : '<svg viewBox="0 0 24 24"><path d="M4 7h16v13H4zM8 7V4h8v3M8 14h8M12 10v8"/></svg>';
  if (employee) {
    ['firstName','lastName','email','phone','role','department','location','status'].forEach((field) => {
      form.elements[field].value = employee[field] || '';
    });
  }
  backdrop.hidden = false;
  dialog.classList.add('open');
  dialog.setAttribute('aria-hidden', 'false');
  setTimeout(() => form.elements.firstName.focus(), 100);
}

function closeDialog() {
  dialog.classList.remove('open');
  dialog.setAttribute('aria-hidden', 'true');
  backdrop.hidden = true;
  state.editingId = '';
}

async function saveEmployee(event) {
  event.preventDefault();
  const button = $('#save-employee');
  const original = button.textContent;
  button.disabled = true;
  button.textContent = 'Guardando…';
  try {
    const body = new FormData(form);
    const editing = Boolean(state.editingId);
    await request(editing ? `/api/employees/${state.editingId}` : '/api/employees', {
      method: editing ? 'PUT' : 'POST', body,
    });
    closeDialog();
    await loadEmployees();
    toast(editing ? 'Perfil actualizado correctamente.' : 'Empleado registrado correctamente.');
  } catch (error) { toast(error.message, 'error'); }
  finally { button.disabled = false; button.textContent = original; }
}

function askDelete(employeeId) {
  state.deletingId = employeeId;
  confirmDialog.hidden = false;
}

async function deleteEmployee() {
  try {
    await request(`/api/employees/${state.deletingId}`, { method: 'DELETE' });
    confirmDialog.hidden = true;
    state.deletingId = '';
    await loadEmployees();
    toast('Empleado eliminado del directorio.');
  } catch (error) { toast(error.message, 'error'); }
}

async function initialize() {
  try {
    const health = await request('/api/health');
    state.mode = health.mode;
    $('#cloud-state').innerHTML = `<i></i><b>${health.mode === 'aws' ? `AWS conectado · ${health.region}` : 'Entorno local'}</b>`;
  } catch {}
  await loadEmployees();
}

['#add-employee','#hero-add'].forEach((selector) => $(selector).addEventListener('click', () => openDialog()));
['#close-dialog','#cancel-dialog'].forEach((selector) => $(selector).addEventListener('click', closeDialog));
backdrop.addEventListener('click', closeDialog);
form.addEventListener('submit', saveEmployee);
photoInput.addEventListener('change', () => {
  const file = photoInput.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  photoPreview.innerHTML = `<img src="${url}" alt="Vista previa de la fotografía">`;
});
list.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const employeeId = button.closest('.employee-card').dataset.id;
  const employee = state.employees.find((item) => item.employeeId === employeeId);
  if (button.dataset.action === 'view') openDialog(employee);
  if (button.dataset.action === 'edit') openDialog(employee);
  if (button.dataset.action === 'delete') askDelete(employeeId);
});
$('#cancel-delete').addEventListener('click', () => { confirmDialog.hidden = true; state.deletingId = ''; });
$('#confirm-delete').addEventListener('click', deleteEmployee);
['#department-filter','#status-filter'].forEach((selector) => $(selector).addEventListener('change', loadEmployees));
let searchTimer;
$('#search').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(loadEmployees, 220); });

function activateNavigation(link) {
  navigationLinks.forEach((item) => {
    const selected = item === link;
    item.classList.toggle('active', selected);
    if (selected) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });
}

navigationLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    const sectionId = link.getAttribute('href').slice(1);
    const section = document.getElementById(sectionId);
    if (!section) return;
    activateNavigation(link);
    section.scrollIntoView({ behavior: 'smooth', block: sectionId === 'inicio' ? 'start' : 'center' });
    const highlight = sectionId === 'inicio' ? $('.welcome-row') : section;
    highlight.classList.remove('section-focus');
    requestAnimationFrame(() => highlight.classList.add('section-focus'));
    setTimeout(() => highlight.classList.remove('section-focus'), 950);
    history.replaceState(null, '', `#${sectionId}`);
  });
});

const initialNavigation = navigationLinks.find((link) => link.getAttribute('href') === location.hash) || navigationLinks[0];
activateNavigation(initialNavigation);

$('#view-toggle').addEventListener('click', () => {
  const listView = list.classList.toggle('list-view');
  $('#view-toggle').classList.toggle('active', listView);
  $('#view-toggle').setAttribute('aria-pressed', String(listView));
});

$('.global-search input').addEventListener('input', (event) => {
  $('#search').value = event.target.value;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    loadEmployees();
    $('#directorio').scrollIntoView({ behavior: 'smooth', block: 'center' });
    activateNavigation(navigationLinks.find((link) => link.getAttribute('href') === '#directorio'));
  }, 220);
});

$('.menu-button').addEventListener('click', () => {
  document.body.classList.toggle('sidebar-collapsed');
});

initialize();
