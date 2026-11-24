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

let currentUser = null;
let notes = [];
let editingId = null;

function showMessage(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("error-message", isError);
}

function validateConfiguration() {
  return !SUPABASE_URL.includes("PASTE_") &&
         !SUPABASE_PUBLISHABLE_KEY.includes("PASTE_");
}

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
    resetEditor();
  }
});

async function loadNotes() {
  if (!currentUser) return;
  showMessage(notesStatus, "Loading your notes...");
  const { data, error } = await supabaseClient
    .from("notes")
    .select("id, title, content, created_at, updated_at")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    showMessage(notesStatus, "Could not load notes: " + error.message, true);
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

  displayNotes(searchInput.value);
  showMessage(notesStatus, notes.length ? `${notes.length} note(s) synced to your account.` : "No notes yet. Create your first note.");
}

function displayNotes(filter = "") {
  notesList.innerHTML = "";
  const query = filter.toLowerCase().trim();
  const filteredNotes = notes.filter(note =>
    (note.title || "").toLowerCase().includes(query) ||
    (note.content || "").toLowerCase().includes(query)
  );

  if (!filteredNotes.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = query ? "No matching notes found." : "No notes yet. Create your first note.";
    notesList.appendChild(empty);
    return;
  }

  filteredNotes.forEach(note => {
    const card = document.createElement("article");
    card.className = "note";

    const title = document.createElement("h3");
    title.textContent = note.title;
    const content = document.createElement("p");
    content.textContent = note.content;

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => editNote(note));

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "delete-btn";
    deleteBtn.addEventListener("click", () => deleteNote(note.id));

    card.append(title, content, editBtn, deleteBtn);
    notesList.appendChild(card);
  });
}

addNoteBtn.addEventListener("click", async () => {
  const title = noteTitle.value.trim();
  const content = noteContent.value.trim();

  if (!title || !content) {
    alert("Please enter both title and content!");
    return;
  }
  if (!currentUser) return;

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
    return;
  }

  resetEditor();
  await loadNotes();
  showMessage(notesStatus, "Note saved and synced.");
});

function editNote(note) {
  noteTitle.value = note.title;
  noteContent.value = note.content;
  editingId = note.id;
  addNoteBtn.textContent = "Update Note";
  formHeading.textContent = "Edit Note";
  cancelEditBtn.hidden = false;
  noteTitle.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteNote(id) {
  if (!confirm("Are you sure you want to delete this note?")) return;
  showMessage(notesStatus, "Deleting note...");
  const { error } = await supabaseClient.from("notes")
    .delete().eq("id", id).eq("user_id", currentUser.id);

  if (error) {
    showMessage(notesStatus, "Could not delete note: " + error.message, true);
    return;
  }
  if (editingId === id) resetEditor();
  await loadNotes();
  showMessage(notesStatus, "Note deleted.");
}

function resetEditor() {
  noteTitle.value = "";
  noteContent.value = "";
  editingId = null;
  addNoteBtn.textContent = "Add Note";
  formHeading.textContent = "Create a New Note";
  cancelEditBtn.hidden = true;
}

cancelEditBtn.addEventListener("click", resetEditor);
searchInput.addEventListener("input", () => displayNotes(searchInput.value));

// Dark mode preference stays local to each browser/device.
function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark-mode", isDark);
  themeToggle.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
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
