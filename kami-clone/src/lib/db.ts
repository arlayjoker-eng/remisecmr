import type { Annotation, DocRecord } from "./types";

const NAME = "anota";
let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const r = indexedDB.open(NAME, 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        d.createObjectStore("docs", { keyPath: "id" });
        d.createObjectStore("files");
        d.createObjectStore("annos");
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  return dbp;
}

function done(t: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

function result<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export async function listDocs(): Promise<DocRecord[]> {
  const db = await open();
  const all = await result(db.transaction("docs").objectStore("docs").getAll() as IDBRequest<DocRecord[]>);
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getDoc(id: string): Promise<DocRecord | undefined> {
  const db = await open();
  return result(db.transaction("docs").objectStore("docs").get(id) as IDBRequest<DocRecord | undefined>);
}

export async function getFile(id: string): Promise<ArrayBuffer | undefined> {
  const db = await open();
  return result(db.transaction("files").objectStore("files").get(id) as IDBRequest<ArrayBuffer | undefined>);
}

export async function createDoc(doc: DocRecord, bytes: ArrayBuffer): Promise<void> {
  const db = await open();
  const t = db.transaction(["docs", "files"], "readwrite");
  t.objectStore("docs").put(doc);
  t.objectStore("files").put(bytes, doc.id);
  await done(t);
}

export async function renameDoc(id: string, title: string): Promise<void> {
  const db = await open();
  const t = db.transaction("docs", "readwrite");
  const s = t.objectStore("docs");
  const cur = (await result(s.get(id))) as DocRecord | undefined;
  if (cur) s.put({ ...cur, title, updatedAt: Date.now() });
  await done(t);
}

export async function touchDoc(id: string): Promise<void> {
  const db = await open();
  const t = db.transaction("docs", "readwrite");
  const s = t.objectStore("docs");
  const cur = (await result(s.get(id))) as DocRecord | undefined;
  if (cur) s.put({ ...cur, updatedAt: Date.now() });
  await done(t);
}

export async function deleteDoc(id: string): Promise<void> {
  const db = await open();
  const t = db.transaction(["docs", "files", "annos"], "readwrite");
  t.objectStore("docs").delete(id);
  t.objectStore("files").delete(id);
  t.objectStore("annos").delete(id);
  await done(t);
}

export async function loadAnnotations(id: string): Promise<Annotation[]> {
  const db = await open();
  const v = await result(db.transaction("annos").objectStore("annos").get(id) as IDBRequest<Annotation[] | undefined>);
  return v ?? [];
}

export async function saveAnnotations(id: string, annos: Annotation[]): Promise<void> {
  const db = await open();
  const t = db.transaction(["annos", "docs"], "readwrite");
  t.objectStore("annos").put(annos, id);
  const s = t.objectStore("docs");
  const cur = (await result(s.get(id))) as DocRecord | undefined;
  if (cur) s.put({ ...cur, updatedAt: Date.now() });
  await done(t);
}
