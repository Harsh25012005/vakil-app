import type { DocumentCategory, PaymentMode } from '@vakil/shared';
import { MAX_FILE_BYTES, MAX_PINNED_NOTES } from '@vakil/shared';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { ApiError, notFound, unwrap } from './api';
import { toDocument, toNote, toNotification, toPayment, toTask, type Row } from './mappers';
import { currentUserId, supabase } from './supabase';
import type { CaseDocument, ISODate, Note, Payment, Task } from './types';

/** P1 modules (notes, documents, fees, tasks) and the notification centre. */

// ---- Notes (FR-NOTE) ----
export async function listNotes(caseId: string): Promise<Note[]> {
  const rows = await unwrap(
    supabase.from('notes').select('*').eq('case_id', caseId).order('is_pinned', { ascending: false }).order('updated_at', { ascending: false }),
  );
  return rows.map(toNote);
}

export async function saveNote(caseId: string, input: { id?: string; title?: string; body: string; isPinned: boolean }): Promise<Note> {
  const body = input.body.trim();
  if (!body) throw new ApiError(422, 'VALIDATION_ERROR', "Note can't be empty", { body: "Note can't be empty" });
  if (input.isPinned) {
    let pinned = supabase.from('notes').select('id', { count: 'exact', head: true }).eq('case_id', caseId).eq('is_pinned', true);
    if (input.id) pinned = pinned.neq('id', input.id);
    const { count } = await pinned;
    if ((count ?? 0) >= MAX_PINNED_NOTES) throw new ApiError(422, 'PIN_LIMIT', `You can pin up to ${MAX_PINNED_NOTES} notes per case`);
  }
  const fields = { title: input.title?.trim() || null, body, is_pinned: input.isPinned };
  const row = input.id
    ? await unwrap(supabase.from('notes').update(fields).eq('id', input.id).select('*').maybeSingle(), 'Note')
    : await unwrap(supabase.from('notes').insert({ ...fields, case_id: caseId }).select('*').single(), 'Note');
  if (!row) throw notFound('Note');
  return toNote(row);
}

export async function deleteNote(id: string) {
  await unwrap(supabase.from('notes').delete().eq('id', id), 'Note');
  return { id };
}

/** Undo: puts the exact note back (same id and timestamps). */
export async function restoreNote(note: Note): Promise<Note> {
  const row = await unwrap(
    supabase
      .from('notes')
      .insert({ id: note.id, case_id: note.caseId, title: note.title ?? null, body: note.body, is_pinned: note.isPinned, created_at: note.createdAt, updated_at: note.updatedAt })
      .select('*')
      .single(),
    'Note',
  );
  return toNote(row);
}

// ---- Documents (FR-DOC) ----
// Files live in the private "case-docs" bucket at {advocate_id}/{case_id}/{random}.{ext};
// the app reads them through signed URLs that expire after an hour.
const BUCKET = 'case-docs';
const SIGNED_URL_SECONDS = 60 * 60;

async function signedUrls(paths: string[]): Promise<Map<string, string>> {
  if (!paths.length) return new Map();
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
  const urls = new Map<string, string>();
  for (const d of data ?? []) if (d.path && d.signedUrl) urls.set(d.path, d.signedUrl);
  return urls;
}

export async function listDocuments(caseId: string): Promise<CaseDocument[]> {
  const rows = await unwrap(supabase.from('documents').select('*').eq('case_id', caseId).is('deleted_at', null).order('created_at', { ascending: false }));
  const urls = await signedUrls(rows.map((r) => r.storage_path));
  return rows.map((r) => toDocument(r, urls.get(r.storage_path)));
}

const extensionOf = (fileName: string, mimeType: string) => {
  const fromName = /\.([a-z0-9]{1,8})$/i.exec(fileName)?.[1];
  return (fromName ?? mimeType.split('/')[1] ?? 'bin').toLowerCase();
};

/** Uploads the picked file, then records it. If recording fails the upload is removed again. */
export async function addDocument(
  caseId: string,
  input: { fileName: string; category: DocumentCategory; mimeType: string; sizeBytes: number; uri?: string },
): Promise<CaseDocument> {
  if (input.sizeBytes > MAX_FILE_BYTES) throw new ApiError(422, 'FILE_TOO_LARGE', 'File is larger than 20 MB');
  if (!input.uri) throw new ApiError(422, 'VALIDATION_ERROR', 'Pick a file to upload');
  const uid = await currentUserId();
  if (!uid) throw new ApiError(401, 'UNAUTHENTICATED', 'Your session has expired. Please sign in again.');

  const body = await fetch(input.uri).then((r) => r.arrayBuffer());
  if (body.byteLength > MAX_FILE_BYTES) throw new ApiError(422, 'FILE_TOO_LARGE', 'File is larger than 20 MB');

  const path = `${uid}/${caseId}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}.${extensionOf(input.fileName, input.mimeType)}`;
  const up = await supabase.storage.from(BUCKET).upload(path, body, { contentType: input.mimeType, upsert: false });
  if (up.error) throw new ApiError(500, 'UPLOAD_FAILED', "Couldn't upload the file. Please try again.");

  try {
    const row = await unwrap(
      supabase
        .from('documents')
        .insert({ case_id: caseId, file_name: input.fileName.trim(), category: input.category, mime_type: input.mimeType, size_bytes: body.byteLength, storage_path: path })
        .select('*')
        .single(),
      'Document',
    );
    const urls = await signedUrls([path]);
    return toDocument(row, urls.get(path));
  } catch (e) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw e;
  }
}

export async function renameDocument(id: string, fileName: string): Promise<CaseDocument> {
  const name = fileName.trim();
  const row = name
    ? await unwrap(supabase.from('documents').update({ file_name: name }).eq('id', id).select('*').maybeSingle(), 'Document')
    : await unwrap(supabase.from('documents').select('*').eq('id', id).maybeSingle(), 'Document');
  if (!row) throw notFound('Document');
  return toDocument(row);
}

/** Soft delete, so Undo can restore the row and its file. */
export async function deleteDocument(id: string) {
  await unwrap(supabase.from('documents').update({ deleted_at: new Date().toISOString() }).eq('id', id), 'Document');
  return { id };
}

export async function restoreDocument(doc: CaseDocument): Promise<CaseDocument> {
  const row = await unwrap(supabase.from('documents').update({ deleted_at: null }).eq('id', doc.id).select('*').maybeSingle(), 'Document');
  if (!row) throw notFound('Document');
  return toDocument(row, doc.uri);
}

/**
 * The native share sheet needs a file on the device, not a URL: downloads the document into the
 * cache first. On web the signed URL itself is returned.
 */
export async function localDocumentCopy(doc: CaseDocument): Promise<string> {
  if (!doc.uri) throw new ApiError(404, 'NOT_FOUND', 'This file is not available.');
  if (Platform.OS === 'web' || !/^https?:/.test(doc.uri)) return doc.uri;
  const dir = new Directory(Paths.cache, 'documents');
  dir.create({ idempotent: true, intermediates: true });
  const safeName = doc.fileName.replace(/[\\/:*?"<>|]/g, '_');
  const file = await File.downloadFileAsync(doc.uri, new File(dir, `${doc.id}-${safeName}`), { idempotent: true });
  return file.uri;
}

// ---- Fees (FR-FEE) ----
export type FeeSummary = { agreed: number; received: number; balance: number; payments: Payment[] };

export async function getFee(caseId: string): Promise<FeeSummary> {
  const [fee, payments] = await Promise.all([
    unwrap(supabase.from('fees').select('agreed_amount').eq('case_id', caseId).maybeSingle()),
    unwrap(supabase.from('payments').select('*').eq('case_id', caseId).order('paid_on', { ascending: false })),
  ]);
  const agreed = Number(fee?.agreed_amount ?? 0);
  const list = payments.map(toPayment);
  const received = list.reduce((s, p) => s + p.amount, 0);
  return { agreed, received, balance: Math.max(agreed - received, 0), payments: list };
}

export async function setAgreedFee(caseId: string, amount: number) {
  await unwrap(supabase.from('fees').upsert({ case_id: caseId, agreed_amount: amount }, { onConflict: 'advocate_id,case_id' }), 'Fee');
  return { caseId, amount };
}

export async function addPayment(caseId: string, input: { amount: number; paidOn: ISODate; mode: PaymentMode; note?: string }): Promise<Payment> {
  if (!(input.amount > 0)) throw new ApiError(422, 'VALIDATION_ERROR', 'Enter a valid amount', { amount: 'Invalid' });
  const row = await unwrap(
    supabase
      .from('payments')
      .insert({ case_id: caseId, amount: input.amount, paid_on: input.paidOn, mode: input.mode, note: input.note?.trim() || null })
      .select('*')
      .single(),
    'Payment',
  );
  return toPayment(row);
}

export async function deletePayment(id: string) {
  await unwrap(supabase.from('payments').delete().eq('id', id), 'Payment');
  return { id };
}

// ---- Tasks (FR-TASK) ----
export async function listTasks(opts: { caseId?: string } = {}): Promise<Task[]> {
  let q = supabase.from('tasks').select('*');
  if (opts.caseId) q = q.eq('case_id', opts.caseId);
  const tasks = (await unwrap(q)).map(toTask);
  // Open first, then by due date (undated last).
  return tasks.sort((a, b) => Number(!!a.completedAt) - Number(!!b.completedAt) || (a.dueDate ?? '9').localeCompare(b.dueDate ?? '9'));
}

export async function addTask(input: { caseId: string | null; title: string; dueDate?: ISODate }): Promise<Task> {
  const title = input.title.trim();
  if (!title) throw new ApiError(422, 'VALIDATION_ERROR', 'Enter a task', { title: 'Required' });
  const row = await unwrap(supabase.from('tasks').insert({ case_id: input.caseId, title, due_date: input.dueDate ?? null }).select('*').single(), 'Task');
  return toTask(row);
}

export async function toggleTask(id: string): Promise<Task> {
  const current = await unwrap(supabase.from('tasks').select('completed_at').eq('id', id).maybeSingle(), 'Task');
  if (!current) throw notFound('Task');
  const row = await unwrap(
    supabase
      .from('tasks')
      .update({ completed_at: current.completed_at ? null : new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single(),
    'Task',
  );
  return toTask(row);
}

export async function deleteTask(id: string) {
  await unwrap(supabase.from('tasks').delete().eq('id', id), 'Task');
  return { id };
}

export async function restoreTask(task: Task): Promise<Task> {
  const row = await unwrap(
    supabase
      .from('tasks')
      .insert({ id: task.id, case_id: task.caseId, title: task.title, due_date: task.dueDate ?? null, completed_at: task.completedAt ?? null })
      .select('*')
      .single(),
    'Task',
  );
  return toTask(row);
}

// ---- Notifications (FR-NOTIF-05) ----
export async function listNotifications() {
  const rows: Row<'notifications'>[] = await unwrap(supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100));
  return rows.map(toNotification);
}

export async function markNotificationsRead(ids?: string[]) {
  let q = supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
  if (ids) q = q.in('id', ids);
  await unwrap(q);
  return { ok: true };
}
