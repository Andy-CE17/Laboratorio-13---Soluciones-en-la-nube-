import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import multer from 'multer';
import { config, assertAwsConfig } from './config.js';
import { LocalEmployeeStore } from './services/local-store.js';
import { DynamoEmployeeStore } from './services/dynamo-store.js';
import { PhotoStorage } from './services/photo-storage.js';

if (config.mode === 'aws') assertAwsConfig();

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    callback(allowed.includes(file.mimetype) ? null : new Error('La fotografía debe ser JPG, PNG o WebP.'), allowed.includes(file.mimetype));
  },
});
const store = config.mode === 'aws' ? new DynamoEmployeeStore() : new LocalEmployeeStore();
const photos = new PhotoStorage();

app.disable('x-powered-by');
app.use(express.json());
app.use(express.static(path.join(root, 'public')));
app.use('/uploads', express.static(path.join(root, 'storage', 'uploads')));

function clean(value, limit = 120) {
  return String(value || '').trim().slice(0, limit);
}

function employeePayload(body) {
  return {
    firstName: clean(body.firstName, 60),
    lastName: clean(body.lastName, 60),
    email: clean(body.email, 120).toLowerCase(),
    phone: clean(body.phone, 30),
    role: clean(body.role, 100),
    department: clean(body.department, 60),
    location: clean(body.location, 60),
    status: clean(body.status, 30) || 'Activo',
  };
}

function validate(employee) {
  const required = ['firstName', 'lastName', 'email', 'role', 'department'];
  const missing = required.filter((key) => !employee[key]);
  if (missing.length) return 'Completa los campos obligatorios.';
  if (!/^\S+@\S+\.\S+$/.test(employee.email)) return 'Ingresa un correo válido.';
  return '';
}

async function hydrate(employee) {
  return { ...employee, photoUrl: await photos.url(employee.photoKey) };
}

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, mode: config.mode, region: config.region, service: 'Atlas People' });
});

app.get('/api/employees', async (request, response, next) => {
  try {
    const query = clean(request.query.query, 80).toLowerCase();
    const department = clean(request.query.department, 60);
    const status = clean(request.query.status, 30);
    const all = await store.list();
    const filtered = all.filter((item) => {
      const searchable = `${item.firstName} ${item.lastName} ${item.email} ${item.role} ${item.location}`.toLowerCase();
      return (!query || searchable.includes(query))
        && (!department || item.department === department)
        && (!status || item.status === status);
    }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    response.json(await Promise.all(filtered.map(hydrate)));
  } catch (error) { next(error); }
});

app.post('/api/employees', upload.single('photo'), async (request, response, next) => {
  try {
    const values = employeePayload(request.body);
    const issue = validate(values);
    if (issue) return response.status(400).json({ message: issue });
    const now = new Date().toISOString();
    const photoKey = await photos.save(request.file);
    const employee = await store.create({
      employeeId: randomUUID(),
      ...values,
      photoKey,
      createdAt: now,
      updatedAt: now,
    });
    response.status(201).json(await hydrate(employee));
  } catch (error) { next(error); }
});

app.put('/api/employees/:id', upload.single('photo'), async (request, response, next) => {
  try {
    const current = await store.get(request.params.id);
    if (!current) return response.status(404).json({ message: 'Empleado no encontrado.' });
    const values = employeePayload(request.body);
    const issue = validate(values);
    if (issue) return response.status(400).json({ message: issue });
    let photoKey = current.photoKey;
    if (request.file) {
      const replacement = await photos.save(request.file);
      await photos.remove(current.photoKey);
      photoKey = replacement;
    }
    const updated = await store.update(request.params.id, {
      ...values,
      photoKey,
      updatedAt: new Date().toISOString(),
    });
    response.json(await hydrate(updated));
  } catch (error) { next(error); }
});

app.delete('/api/employees/:id', async (request, response, next) => {
  try {
    const removed = await store.remove(request.params.id);
    if (!removed) return response.status(404).json({ message: 'Empleado no encontrado.' });
    await photos.remove(removed.photoKey);
    response.status(204).end();
  } catch (error) { next(error); }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return response.status(400).json({ message: 'La fotografía no puede superar 5 MB.' });
  }
  response.status(500).json({ message: error.message || 'No se pudo completar la operación.' });
});

app.listen(config.port, '127.0.0.1', () => {
  console.log(`Atlas People disponible en http://127.0.0.1:${config.port} (${config.mode})`);
});
