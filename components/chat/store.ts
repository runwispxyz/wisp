"use client";
// Chat history lives only in this browser (IndexedDB). Nothing here is sent to the server.
import type { Receipt } from "@/lib/client";
import type { Kind } from "@/lib/models";

export type Attachment = { name: string; mime: string; dataUrl?: string; text?: string };
export type ErrKind = "trial" | "balance" | "auth" | "other";
export type Media = { blob: Blob; mime: string; charged: number; held: number };
export type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  attachments?: Attachment[];
  model?: string;
  receipt?: Receipt | null;
  media?: Media;
  error?: { message: string; kind: ErrKind };
  free?: boolean; // ran on the no-wallet trial
};
export type Chat = { id: string; title: string; mode: Kind; model: string; system?: string; messages: Msg[]; updatedAt: number };

const DB = "wisp-chat", STORE = "chats";
let dbp: Promise<IDBDatabase> | null = null;
function open() {
  return (dbp ??= new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
}
async function run<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await open();
  return new Promise((res, rej) => {
    const q = f(db.transaction(STORE, mode).objectStore(STORE));
    q.onsuccess = () => res(q.result as T);
    q.onerror = () => rej(q.error);
  });
}

export const listChats = () => run<Chat[]>("readonly", (s) => s.getAll()).then((a) => a.sort((x, y) => y.updatedAt - x.updatedAt));
export const putChat = (c: Chat) => run("readwrite", (s) => s.put(c));
export const deleteChat = (id: string) => run("readwrite", (s) => s.delete(id));
export const wipeChats = () => run("readwrite", (s) => s.clear());

// randomUUID needs a secure context; plain-http LAN access falls back to Math.random (ids only need to be unique locally)
export const uid = () => crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);

const toDataUrl = (b: Blob) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(b); });

/** All chats as JSON, media blobs inlined as data URLs. */
export async function exportJson() {
  const chats = await listChats();
  for (const c of chats)
    for (const m of c.messages)
      if (m.media) (m.media as unknown as Record<string, unknown>).blob = await toDataUrl(m.media.blob);
  return new Blob([JSON.stringify({ app: "wisp-chat", exportedAt: new Date().toISOString(), chats }, null, 2)], { type: "application/json" });
}

export function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
