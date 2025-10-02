import { FieldValue } from 'firebase-admin/firestore';

// In-memory data stores
type Doc = Record<string, any>;
const rootStore: Record<string, Record<string, Doc>> = {};
const subStore: Record<string, Record<string, Doc>> = {};
let idSeq = 1;

export const docGetMock = jest.fn();

export const resetMockFirestore = () => {
  for (const k of Object.keys(rootStore)) delete rootStore[k];
  for (const k of Object.keys(subStore)) delete subStore[k];
  idSeq = 1;
  docGetMock.mockReset();
};

// Timestamp mock (minimal)
export class Timestamp {
  constructor(public seconds: number, public nanoseconds: number) {}
  static now(): Timestamp {
    const ms = Date.now();
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1e6);
  }
  toDate(): Date { return new Date(this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6)); }
  toMillis(): number { return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6); }
}

// FieldValue mock
export const mockFieldValue = {
  serverTimestamp: jest.fn(() => new Date()),
  increment: (by: number) => ({ __op: 'inc', by }),
  arrayUnion: (...values: any[]) => ({ __op: 'arrayUnion', values }),
} as unknown as typeof FieldValue & { increment: (by: number) => any; arrayUnion: (...values: any[]) => any };

function applyFieldOps(target: Doc, updates: Doc): Doc {
  const out = { ...target };
  for (const [k, v] of Object.entries(updates)) {
    const isObj = typeof v === 'object' && v !== null;
    const setAtPath = (obj: any, path: string[], val: any) => {
      const last = path[path.length - 1];
      const parent = path.slice(0, -1).reduce((o, p) => (o[p] ||= {}), obj);
      if (val && typeof val === 'object' && '__op' in val) {
        const op = (val as any).__op;
        if (op === 'inc') {
          const current = typeof parent[last] === 'number' ? parent[last] : 0;
          parent[last] = current + (val as any).by;
        } else if (op === 'arrayUnion') {
          const prev = Array.isArray(parent[last]) ? parent[last] : [];
          parent[last] = Array.from(new Set([...prev, ...(val as any).values]));
        }
      } else if (isObj && !Array.isArray(val)) {
        parent[last] = applyFieldOps(parent[last] || {}, val as Doc);
      } else {
        parent[last] = val;
      }
    };

    const path = k.split('.');
    setAtPath(out, path, v);
  }
  return out;
}

function collStore(key: string, isSub = false) {
  if (isSub) return (subStore[key] ||= {});
  return (rootStore[key] ||= {});
}

function makeDocRef(collPath: string, id: string) {
  const ref = {
    id,
    path: `${collPath}/${id}`,
    async get() {
      if (typeof docGetMock.getMockImplementation === 'function' && docGetMock.getMockImplementation()) {
        return await docGetMock({ path: this.path });
      }
      const data = collStore(collPath)[id];
      if (data) return { exists: true, id, ref, data: () => ({ ...data }) };
      return { exists: false, id, ref, data: () => undefined };
    },
    async set(data: Doc, options?: { merge?: boolean }) {
      const col = collStore(collPath);
      col[id] = options?.merge ? { ...(col[id] || {}), ...data } : { ...data };
    },
    async update(updates: Doc) {
      const col = collStore(collPath);
      col[id] = applyFieldOps(col[id] || {}, updates);
    },
    async delete() {
      const col = collStore(collPath);
      delete col[id];
    },
    collection(sub: string) {
      const key = `${collPath}/${id}/${sub}`;
      return makeCollection(key, true);
    },
  };
  return ref;
}

function filterDocs(docs: [string, Doc][], filters: any[]): [string, Doc][] {
  const toMillis = (x: any): any => {
    if (x == null) return x;
    if (typeof x?.toMillis === 'function') return x.toMillis();
    if (x instanceof Date) return x.getTime();
    if (typeof x?.toDate === 'function') return x.toDate().getTime();
    return x;
  };
  return docs.filter(([_, d]) =>
    filters.every(f => {
      const valRaw = f.field.split('.').reduce((o: any, key: string) => (o ? o[key] : undefined), d);
      const val = toMillis(valRaw);
      const cmp = toMillis(f.value);
      switch (f.op) {
        case '==': return val === cmp;
        case 'in': return Array.isArray(f.value) && f.value.map(toMillis).includes(val);
        case '<': return val < cmp;
        case '>': return val > cmp;
        case '<=': return val <= cmp;
        case '>=': return val >= cmp;
        default: return false;
      }
    })
  );
}

function makeCollection(path: string, isSub = false) {
  const filters: any[] = [];
  let lim: number | undefined;
  const api: any = {
    doc: (id: string) => makeDocRef(path, id),
    async add(data: Doc) {
      let id = `${idSeq++}`;
      if (path === 'trips') id = 'test-trip-id'; // helpful for some tests
      const ref = makeDocRef(path, id);
      await ref.set(data);
      return { id };
    },
    where(field: string, op: string, value: any) { filters.push({ field, op, value }); return api; },
    limit(n: number) { lim = n; return api; },
    async get() {
      const col = Object.entries(collStore(path, isSub));
      let rows = filters.length ? filterDocs(col, filters) : col;
      if (typeof lim === 'number') rows = rows.slice(0, lim);
      const docsArr = rows.map(([id, data]) => ({ id, data: () => ({ ...data }), ref: makeDocRef(path, id) }));
      return {
        empty: rows.length === 0,
        size: rows.length,
        docs: docsArr,
        forEach: (cb: (doc: any) => void) => { docsArr.forEach(cb); },
      };
    },
    async listDocuments() {
      return Object.keys(collStore(path, isSub)).map(id => makeDocRef(path, id));
    },
  };
  return api;
}

export const mockFirestore = () => ({
  runTransaction: async (updateFunction: (t: any) => Promise<any>) => {
    const transaction = {
      get: (docRef: any) => docRef.get(),
      update: (docRef: any, data: any) => docRef.update(data),
      set: (docRef: any, data: any) => docRef.set(data),
    };
    await updateFunction(transaction);
  },
  collection: (name: string) => makeCollection(name),
  batch() {
    const ops: Array<() => Promise<void>> = [];
    return {
      set(ref: any, data: Doc, options?: any) { ops.push(() => ref.set(data, options)); },
      update(ref: any, updates: Doc) { ops.push(() => ref.update(updates)); },
      delete(ref: any) { ops.push(() => ref.delete()); },
      async commit() { for (const op of ops) await op(); },
    };
  },
});

export const mockApp = { firestore: mockFirestore };

// Provide the firestore namespace mock for admin.firestore
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: mockFirestore,
  FieldValue: mockFieldValue,
  Timestamp,
}));
