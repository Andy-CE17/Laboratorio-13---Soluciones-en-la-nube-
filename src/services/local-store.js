import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dataDirectory = path.join(root, 'data');
const filePath = path.join(dataDirectory, 'employees.json');

const seed = [
  {
    employeeId: 'emp-demo-01',
    firstName: 'Valeria',
    lastName: 'Rojas',
    email: 'valeria.rojas@atlas.pe',
    phone: '+51 987 430 218',
    role: 'Diseñadora de producto',
    department: 'Producto',
    location: 'Lima',
    status: 'Activo',
    photoKey: '',
    createdAt: '2026-11-22T14:20:00.000Z',
    updatedAt: '2026-11-22T14:20:00.000Z'
  },
  {
    employeeId: 'emp-demo-02',
    firstName: 'Mateo',
    lastName: 'Salazar',
    email: 'mateo.salazar@atlas.pe',
    phone: '+51 955 862 740',
    role: 'Ingeniero cloud',
    department: 'Tecnología',
    location: 'Arequipa',
    status: 'Activo',
    photoKey: '',
    createdAt: '2026-11-21T16:45:00.000Z',
    updatedAt: '2026-11-21T16:45:00.000Z'
  },
  {
    employeeId: 'emp-demo-03',
    firstName: 'Luciana',
    lastName: 'Campos',
    email: 'luciana.campos@atlas.pe',
    phone: '+51 944 320 178',
    role: 'Analista de personas',
    department: 'Personas',
    location: 'Lima',
    status: 'Vacaciones',
    photoKey: '',
    createdAt: '2026-11-20T12:10:00.000Z',
    updatedAt: '2026-11-20T12:10:00.000Z'
  }
];

async function ensureFile() {
  await mkdir(dataDirectory, { recursive: true });
  try {
    await readFile(filePath, 'utf8');
  } catch {
    await writeFile(filePath, JSON.stringify(seed, null, 2), 'utf8');
  }
}

async function readAll() {
  await ensureFile();
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function persist(items) {
  const temporary = `${filePath}.tmp`;
  await writeFile(temporary, JSON.stringify(items, null, 2), 'utf8');
  await rename(temporary, filePath);
}

export class LocalEmployeeStore {
  async list() {
    return readAll();
  }

  async get(employeeId) {
    return (await readAll()).find((item) => item.employeeId === employeeId) || null;
  }

  async create(employee) {
    const items = await readAll();
    items.push(employee);
    await persist(items);
    return employee;
  }

  async update(employeeId, changes) {
    const items = await readAll();
    const index = items.findIndex((item) => item.employeeId === employeeId);
    if (index < 0) return null;
    items[index] = { ...items[index], ...changes, employeeId };
    await persist(items);
    return items[index];
  }

  async remove(employeeId) {
    const items = await readAll();
    const found = items.find((item) => item.employeeId === employeeId);
    if (!found) return null;
    await persist(items.filter((item) => item.employeeId !== employeeId));
    return found;
  }
}
