'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, push, set, remove, update } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { StickyNote, Plus, Trash2, Pencil, Check, X } from 'lucide-react';

// SR এর নিজস্ব নোট — sr_ledger/{uid}/notes পাথে সেভ হয়,
// তাই অন্য SR বা এডমিনের নোট এখানে কখনো দেখা যাবে না।
export default function SRNotepad() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) {
      setNotes([]);
      setLoading(false);
      return;
    }

    const notesRef = ref(database, `sr_ledger/${uid}/notes`);
    const unsubscribe = onValue(notesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data)
          .map(([id, value]) => ({ id, ...value }))
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        setNotes(list);
      } else {
        setNotes([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [uid]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim() || !uid) return;

    setSaving(true);
    try {
      const noteRef = push(ref(database, `sr_ledger/${uid}/notes`));
      await set(noteRef, {
        text: newNote.trim(),
        date: new Date().toISOString(),
      });
      setNewNote('');
    } catch (err) {
      alert('নোট সংরক্ষণ করা যায়নি');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (note) => {
    setEditingId(note.id);
    setEditText(note.text);
  };

  const saveEdit = async (id) => {
    if (!editText.trim() || !uid) return;
    try {
      await update(ref(database, `sr_ledger/${uid}/notes/${id}`), {
        text: editText.trim(),
      });
      setEditingId(null);
    } catch (err) {
      alert('আপডেট করা যায়নি');
    }
  };

  const handleDelete = async (id) => {
    if (!uid) return;
    try {
      await remove(ref(database, `sr_ledger/${uid}/notes/${id}`));
      setConfirmDeleteId(null);
    } catch (err) {
      alert('মুছে ফেলা যায়নি');
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      {/* নতুন নোট যোগ */}
      <form
        onSubmit={handleAddNote}
        className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                   border border-border dark:border-dark-border p-4"
      >
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="যা মনে রাখতে চান লিখে রাখুন..."
          rows={3}
          className="w-full rounded-xl border border-border dark:border-dark-border
                     bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                     px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary
                     placeholder:text-text-muted resize-none"
        />
        <button
          type="submit"
          disabled={saving || !newNote.trim()}
          className="mt-2 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white
                     bg-gradient-to-r from-primary to-primary-light disabled:opacity-50"
        >
          <Plus size={16} />
          {saving ? 'সংরক্ষণ হচ্ছে...' : 'নোট যোগ করুন'}
        </button>
      </form>

      {/* নোট তালিকা */}
      {loading ? (
        <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>
      ) : notes.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-2 py-12 rounded-2xl
                     border border-dashed border-border dark:border-dark-border"
        >
          <StickyNote size={28} className="text-text-muted" />
          <p className="text-sm text-text-muted dark:text-dark-text-secondary">
            এখনো কোনো নোট লেখা হয়নি
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="bg-background-card dark:bg-dark-card rounded-xl
                         border border-border dark:border-dark-border p-3"
            >
              {editingId === note.id ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-border dark:border-dark-border
                               bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                               px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => saveEdit(note.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium
                                 text-white bg-gradient-to-r from-primary to-primary-light"
                    >
                      <Check size={14} />
                      সংরক্ষণ
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium
                                 border border-border dark:border-dark-border text-text-secondary dark:text-dark-text-secondary"
                    >
                      <X size={14} />
                      বাতিল
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-text-primary dark:text-dark-text-primary whitespace-pre-wrap flex-1">
                      {note.text}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(note)}
                        aria-label="এডিট করুন"
                        className="p-1.5 rounded-lg text-text-muted hover:bg-background dark:hover:bg-dark-background"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(note.id)}
                        aria-label="ডিলিট করুন"
                        className="p-1.5 rounded-lg text-danger hover:bg-danger/10"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-text-muted dark:text-dark-text-secondary mt-1.5">
                    {new Date(note.date).toLocaleString('bn-BD')}
                  </p>

                  {confirmDeleteId === note.id && (
                    <div className="mt-2 p-2.5 rounded-lg bg-danger/10 flex flex-col gap-2">
                      <p className="text-xs text-danger">এই নোট ডিলিট করবেন?</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleDelete(note.id)}
                          className="flex-1 rounded-lg py-1 text-xs font-medium text-white bg-danger"
                        >
                          হ্যাঁ, ডিলিট
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="flex-1 rounded-lg py-1 text-xs font-medium border border-border dark:border-dark-border
                                     text-text-secondary dark:text-dark-text-secondary"
                        >
                          বাতিল
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}