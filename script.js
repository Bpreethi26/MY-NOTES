// 1) Paste your Supabase Project URL and Publishable key below.
const SUPABASE_URL = "https://uocxhudvgglscayrktna.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_BF-5kbWXXI--un7GhhZFIg_TolVN_-y";

// Connect to Supabase
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

// HTML elements
const authSection = document.getElementById("authSection");
const authForm = document.getElementById("authForm");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const signUpBtn = document.getElementById("signUpBtn");
const authMessage = document.getElementById("authMessage");
const signOutBtn = document.getElementById("signOutBtn");
const userEmail = document.getElementById("userEmail");
const notesApp = document.getElementById("notesApp");
const noteTitle = document.getElementById("noteTitle");
const noteContent = document.getElementById("noteContent");
const addNoteBtn = document.getElementById("addNoteBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const formHeading = document.getElementById("formHeading");
const notesList = document.getElementById("notesList");
const notesStatus = document.getElementById("notesStatus");
const searchInput = document.getElementById("searchInput");
const themeToggle = document.getElementById("themeToggle");

// New UI elements
const togglePassword = document.getElementById("togglePassword");
const editorCard = document.getElementById("editorCard");
const editBadge = document.getElementById("editBadge");
const charCount = document.getElementById("charCount");
const countBadge = document.getElementById("countBadge");
const statTotal = document.getElementById("statTotal");
const statWords = document.getElementById("statWords");
const statToday = document.getElementById("statToday");
const sortBtn = document.getElementById("sortBtn");
const viewBtn = document.getElementById("viewBtn");
const confirmModal = document.getElementById("confirmModal");
const modalCancel = document.getElementById("modalCancel");
const modalConfirm = document.getElementById("modalConfirm");
const toastStack = document.getElementById("toastStack");

let currentUser = null;
let notes = [];
let editingId = null;
let sortNewestFirst = (localStorage.getItem("notesSort") || "newest") === "newest";
let gridView = (localStorage.getItem("notesView") || "grid") === "grid";

const ACCENTS = [
  "linear-gradient(90deg,#9333ea,#c026d3)",
  "linear-gradient(90deg,#7c3aed,#6366f1)",
  "linear-gradient(90deg,#c084fc,#e879f9)",
  "linear-gradient(90deg,#6d28d9,#a855f7)",
  "linear-gradient(90deg,#a855f7,#818cf8)"
];

function showMessage(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("error-message", isError);
}

function validateConfiguration() {
  return !SUPABASE_URL.includes("PASTE_") &&
         !SUPABASE_PUBLISHABLE_KEY.includes("PASTE_");
}

// ---------- UI helpers ----------
function toast(message, type = "success") {
  const el = document.createElement("div");
  el.className = "toast" + (type === "error" ? " error" : "");
  el.textContent = (type === "error" ? "⚠️ " : "✅ ") + message;
  toastStack.appendChild(el);
  setTimeout(() => {
    el.classList.add("out");
    el.addEventListener("animationend", () => el.remove());
  }, 3000);
}

function confirmDialog() {
  return new Promise(resolve => {
    confirmModal.hidden = false;
    modalCancel.focus();
    const done = (result) => {
      confirmModal.hidden = true;
      modalCancel.removeEventListener("click", onCancel);
      modalConfirm.removeEventListener("click", onConfirm);
      confirmModal.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKey);
      resolve(result);
    };
    const onCancel = () => done(false);
    const onConfirm = () => done(true);
    const onBackdrop = (e) => { if (e.target === confirmModal) done(false); };
    const onKey = (e) => { if (e.key === "Escape") done(false); };
    modalCancel.addEventListener("click", onCancel);
    modalConfirm.addEventListener("click", onConfirm);
    confirmModal.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKey);
  });
}

function timeAgo(dateString) {
  if (!dateString) return "";
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return new Date(dateString).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function highlightInto(element, text, query) {
  element.textContent = "";
  if (!query) { element.textContent = text; return; }
  const lower = text.toLowerCase();
  let pos = 0;
  let idx = lower.indexOf(query, pos);
  while (idx !== -1) {
    if (idx > pos) element.appendChild(document.createTextNode(text.slice(pos, idx)));
    const mark = document.createElement("mark");
    mark.textContent = text.slice(idx, idx + query.length);
    element.appendChild(mark);
    pos = idx + query.length;
    idx = lower.indexOf(query, pos);
  }
  if (pos < text.length) element.appendChild(document.createTextNode(text.slice(pos)));
}

function updateStats() {
  const total = notes.length;
  const words = notes.reduce((sum, n) => {
    const text = `${n.title || ""} ${n.content || ""}`.trim();
    return sum + (text ? text.split(/\s+/).length : 0);
  }, 0);
  const today = new Date().toDateString();
  const addedToday = notes.filter(n => n.created_at && new Date(n.created_at).toDateString() === today).length;
  animateNumber(statTotal, total);
  animateNumber(statWords, words);
  animateNumber(statToday, addedToday);
  countBadge.textContent = total;
}

function animateNumber(el, target) {
  const start = parseInt(el.textContent, 10) || 0;
  if (start === target) { el.textContent = target; return; }
  const duration = 500;
  const startTime = performance.now();
  function step(now) {
    const t = Math.min((now - startTime) / duration, 1);
    el.textContent = Math.round(start + (target - start) * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function showSkeletons() {
  notesList.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const s = document.createElement("div");
    s.className = "skeleton";
    notesList.appendChild(s);
  }
}

function autoGrow() {
  noteContent.style.height = "auto";
  noteContent.style.height = Math.max(140, noteContent.scrollHeight) + "px";
}

function updateCharCount() {
  charCount.textContent = noteContent.value.length;
}

// Ripple effect on primary buttons
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-primary");
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const span = document.createElement("span");
  span.className = "ripple";
  span.style.width = span.style.height = size + "px";
  span.style.left = e.clientX - rect.left - size / 2 + "px";
  span.style.top = e.clientY - rect.top - size / 2 + "px";
  btn.appendChild(span);
  span.addEventListener("animationend", () => span.remove());
});

// Show / hide password
togglePassword.addEventListener("click", () => {
  const show = authPassword.type === "password";
  authPassword.type = show ? "text" : "password";
  togglePassword.textContent = show ? "🙈" : "👁";
  togglePassword.setAttribute("aria-label", show ? "Hide password" : "Show password");
});

// ---------- Auth ----------
// Sign up
signUpBtn.addEventListener("click", async () => {
  if (!authForm.reportValidity()) return;
  showMessage(authMessage, "Creating your account...");
  const { data, error } = await supabaseClient.auth.signUp({
    email: authEmail.value.trim(),
    password: authPassword.value
  });

  if (error) {
    showMessage(authMessage, error.message, true);
    return;
  }

  if (data.session) {
    showMessage(authMessage, "Account created. You are signed in.");
  } else {
    showMessage(authMessage, "Account created! Check your email and confirm your address, then sign in.");
  }
});

// Sign in
authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage(authMessage, "Signing in...");
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: authEmail.value.trim(),
    password: authPassword.value
  });

  if (error) showMessage(authMessage, error.message, true);
});

// Sign out
signOutBtn.addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signOut();
  if (error) showMessage(authMessage, error.message, true);
  else toast("Signed out. See you soon!");
});

// Auth state controls the app visibility
supabaseClient.auth.onAuthStateChange((_event, session) => {
  currentUser = session?.user ?? null;
  if (currentUser) {
    authSection.hidden = true;
    notesApp.hidden = false;
    signOutBtn.hidden = false;
    userEmail.hidden = false;
    userEmail.textContent = currentUser.email || "Signed in";
    // Defer database work until after the auth callback completes.
    setTimeout(() => loadNotes(), 0);
  } else {
    authSection.hidden = false;
    notesApp.hidden = true;
    signOutBtn.hidden = true;
    userEmail.hidden = true;
    notes = [];
    notesList.innerHTML = "";
    updateStats();
    resetEditor();
  }
});

// ---------- Notes ----------
async function loadNotes() {
  if (!currentUser) return;
  showMessage(notesStatus, "Loading your notes...");
  showSkeletons();
  const { data, error } = await supabaseClient
    .from("notes")
    .select("id, title, content, created_at, updated_at")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    notesList.innerHTML = "";
    showMessage(notesStatus, "Could not load notes: " + error.message, true);
    toast("Could not load notes", "error");
    return;
  }

  notes = data || [];

  // One-time import of notes saved in this browser by the previous version.
  const migrationKey = `my-notes-imported-${currentUser.id}`;
  const oldNotes = JSON.parse(localStorage.getItem("notes") || "[]");
  if (notes.length === 0 && oldNotes.length > 0 && !localStorage.getItem(migrationKey)) {
    const rows = oldNotes
      .filter(note => note && typeof note.title === "string" && typeof note.content === "string")
      .map(note => ({ user_id: currentUser.id, title: note.title, content: note.content }));

    if (rows.length) {
      const { error: importError } = await supabaseClient.from("notes").insert(rows);
      if (importError) {
        showMessage(notesStatus, "Your old browser notes could not be imported: " + importError.message, true);
      } else {
        localStorage.setItem(migrationKey, "yes");
        const { data: refreshed, error: refreshError } = await supabaseClient
          .from("notes").select("id, title, content, created_at, updated_at")
          .eq("user_id", currentUser.id).order("created_at", { ascending: false });
        if (!refreshError) notes = refreshed || [];
      }
    }
  } else {
    localStorage.setItem(migrationKey, "yes");
  }

  updateStats();
  displayNotes(searchInput.value);
  showMessage(notesStatus, notes.length ? `${notes.length} note(s) synced to your account.` : "");
}

function displayNotes(filter = "") {
  notesList.innerHTML = "";
  notesList.classList.toggle("list-view", !gridView);
  const query = filter.toLowerCase().trim();

  const filteredNotes = notes.filter(note =>
    (note.title || "").toLowerCase().includes(query) ||
    (note.content || "").toLowerCase().includes(query)
  ).sort((a, b) => {
    const diff = new Date(a.created_at) - new Date(b.created_at);
    return sortNewestFirst ? -diff : diff;
  });

  if (!filteredNotes.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const emoji = document.createElement("span");
    emoji.className = "empty-emoji";
    emoji.textContent = query ? "🔎" : "📝";
    const text = document.createElement("p");
    text.textContent = query ? "No matching notes found." : "No notes yet. Create your first note above!";
    empty.append(emoji, text);
    notesList.appendChild(empty);
    return;
  }

  filteredNotes.forEach((note, i) => {
    const card = document.createElement("article");
    card.className = "note";
    card.style.setProperty("--i", Math.min(i, 10));
    card.style.setProperty("--accent", ACCENTS[i % ACCENTS.length]);
    if (note.id === editingId) card.classList.add("is-editing");

    const title = document.createElement("h3");
    highlightInto(title, note.title || "", query);

    const content = document.createElement("p");
    content.className = "note-body";
    content.title = "Click to expand / collapse";
    highlightInto(content, note.content || "", query);
    content.addEventListener("click", () => card.classList.toggle("expanded"));

    const meta = document.createElement("div");
    meta.className = "note-meta";
    const edited = note.updated_at && note.created_at && note.updated_at !== note.created_at &&
      Math.abs(new Date(note.updated_at) - new Date(note.created_at)) > 2000;
    meta.textContent = edited ? `Edited ${timeAgo(note.updated_at)}` : `Created ${timeAgo(note.created_at)}`;

    const actions = document.createElement("div");
    actions.className = "note-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "icon-btn";
    editBtn.textContent = "✏️ Edit";
    editBtn.addEventListener("click", () => editNote(note));

    const copyBtn = document.createElement("button");
    copyBtn.className = "icon-btn";
    copyBtn.textContent = "📋 Copy";
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(`${note.title}\n\n${note.content}`);
        toast("Note copied to clipboard");
      } catch {
        toast("Could not copy note", "error");
      }
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️";
    deleteBtn.className = "icon-btn delete-btn";
    deleteBtn.setAttribute("aria-label", "Delete note");
    deleteBtn.addEventListener("click", () => deleteNote(note.id, card));

    actions.append(editBtn, copyBtn, deleteBtn);
    card.append(title, content, meta, actions);
    notesList.appendChild(card);
  });
}

addNoteBtn.addEventListener("click", async () => {
  const title = noteTitle.value.trim();
  const content = noteContent.value.trim();

  if (!title || !content) {
    toast("Please enter both title and content", "error");
    (title ? noteContent : noteTitle).focus();
    return;
  }
  if (!currentUser) return;

  const wasEditing = !!editingId;
  addNoteBtn.disabled = true;
  showMessage(notesStatus, "Saving note...");

  let error;
  if (editingId) {
    ({ error } = await supabaseClient.from("notes")
      .update({ title, content, updated_at: new Date().toISOString() })
      .eq("id", editingId)
      .eq("user_id", currentUser.id));
  } else {
    ({ error } = await supabaseClient.from("notes")
      .insert({ user_id: currentUser.id, title, content }));
  }

  addNoteBtn.disabled = false;
  if (error) {
    showMessage(notesStatus, "Could not save note: " + error.message, true);
    toast("Could not save note", "error");
    return;
  }

  resetEditor();
  editorCard.classList.remove("flash");
  void editorCard.offsetWidth;
  editorCard.classList.add("flash");
  await loadNotes();
  showMessage(notesStatus, "Note saved and synced.");
  toast(wasEditing ? "Note updated" : "Note added");
});

function editNote(note) {
  noteTitle.value = note.title;
  noteContent.value = note.content;
  editingId = note.id;
  addNoteBtn.textContent = "Update Note";
  formHeading.textContent = "Edit Note";
  cancelEditBtn.hidden = false;
  editBadge.hidden = false;
  editorCard.classList.add("editing");
  updateCharCount();
  autoGrow();
  displayNotes(searchInput.value);
  noteTitle.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteNote(id, card) {
  const ok = await confirmDialog();
  if (!ok) return;
  showMessage(notesStatus, "Deleting note...");
  const { error } = await supabaseClient.from("notes")
    .delete().eq("id", id).eq("user_id", currentUser.id);

  if (error) {
    showMessage(notesStatus, "Could not delete note: " + error.message, true);
    toast("Could not delete note", "error");
    return;
  }
  if (editingId === id) resetEditor();
  if (card) {
    card.classList.add("removing");
    await new Promise(r => setTimeout(r, 330));
  }
  await loadNotes();
  showMessage(notesStatus, "Note deleted.");
  toast("Note deleted");
}

function resetEditor() {
  noteTitle.value = "";
  noteContent.value = "";
  editingId = null;
  addNoteBtn.textContent = "Add Note";
  formHeading.textContent = "Create a New Note";
  cancelEditBtn.hidden = true;
  editBadge.hidden = true;
  editorCard.classList.remove("editing");
  updateCharCount();
  autoGrow();
}

cancelEditBtn.addEventListener("click", () => {
  resetEditor();
  displayNotes(searchInput.value);
});
searchInput.addEventListener("input", () => displayNotes(searchInput.value));

// Editor niceties
noteContent.addEventListener("input", () => { updateCharCount(); autoGrow(); });
[noteTitle, noteContent].forEach(el => {
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      addNoteBtn.click();
    }
    if (e.key === "Escape" && editingId) cancelEditBtn.click();
  });
});

// Sort + view toggles (remembered per browser)
function applyToolbarLabels() {
  sortBtn.textContent = sortNewestFirst ? "↓ Newest" : "↑ Oldest";
  viewBtn.textContent = gridView ? "▦ Grid" : "☰ List";
}
sortBtn.addEventListener("click", () => {
  sortNewestFirst = !sortNewestFirst;
  localStorage.setItem("notesSort", sortNewestFirst ? "newest" : "oldest");
  applyToolbarLabels();
  displayNotes(searchInput.value);
});
viewBtn.addEventListener("click", () => {
  gridView = !gridView;
  localStorage.setItem("notesView", gridView ? "grid" : "list");
  applyToolbarLabels();
  displayNotes(searchInput.value);
});
applyToolbarLabels();

// Dark mode preference stays local to each browser/device.
function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark-mode", isDark);
  themeToggle.textContent = isDark ? "☀️" : "🌙";
  themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
}
applyTheme(localStorage.getItem("theme") || "light");
themeToggle.addEventListener("click", () => {
  const nextTheme = document.body.classList.contains("dark-mode") ? "light" : "dark";
  localStorage.setItem("theme", nextTheme);
  applyTheme(nextTheme);
});

if (!validateConfiguration()) {
  showMessage(authMessage, "Setup needed: add your Supabase Project URL and Publishable key in script.js.", true);
}
