// Get HTML Elements

const noteTitle = document.getElementById("noteTitle");
const noteContent = document.getElementById("noteContent");
const addNoteBtn = document.getElementById("addNoteBtn");
const notesList = document.getElementById("notesList");
const searchInput = document.getElementById("searchInput");
const themeToggle = document.getElementById("themeToggle");

// Load Saved Notes

let notes = JSON.parse(localStorage.getItem("notes")) || [];

let editingIndex = null;


// Display Notes

function displayNotes(filter = "") {

    notesList.innerHTML = "";

    notes.forEach((note, index) => {

        if (
            !note.title.toLowerCase().includes(filter.toLowerCase()) &&
            !note.content.toLowerCase().includes(filter.toLowerCase())
        ) {
            return;
        }

        const card = document.createElement("div");
        card.className = "note";

        const title = document.createElement("h3");
        title.textContent = note.title;

        const content = document.createElement("p");
        content.textContent = note.content;

        // Edit Button

        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";

        editBtn.addEventListener("click", function() {
            editNote(index);
        });

        // Delete Button

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "delete-btn";

        deleteBtn.addEventListener("click", function() {
            deleteNote(index);
        });

        card.appendChild(title);
        card.appendChild(content);
        card.appendChild(editBtn);
        card.appendChild(deleteBtn);

        notesList.appendChild(card);

    });

}


// Add or Update Notes

addNoteBtn.addEventListener("click", function() {

    const title = noteTitle.value.trim();
    const content = noteContent.value.trim();

    if (title === "" || content === "") {

        alert("Please enter both title and content!");

        return;
    }

    if (editingIndex === null) {

        notes.push({
            title: title,
            content: content
        });

    } else {

        notes[editingIndex] = {
            title: title,
            content: content
        };

        editingIndex = null;

        addNoteBtn.textContent = "Add Note";
    }

    saveNotes();

    noteTitle.value = "";
    noteContent.value = "";

});


// Edit Notes

function editNote(index) {

    noteTitle.value = notes[index].title;
    noteContent.value = notes[index].content;

    editingIndex = index;

    addNoteBtn.textContent = "Update Note";

    noteTitle.focus();

}


// Delete Notes

function deleteNote(index) {

    notes.splice(index, 1);

    if (editingIndex === index) {

        editingIndex = null;

        noteTitle.value = "";
        noteContent.value = "";

        addNoteBtn.textContent = "Add Note";

    } else if (editingIndex !== null && editingIndex > index) {

        editingIndex--;

    }

    saveNotes();

}


// Save Notes in Local Storage

function saveNotes() {

    localStorage.setItem(
        "notes",
        JSON.stringify(notes)
    );

    displayNotes(searchInput.value);

}


// Search Notes

searchInput.addEventListener("input", function() {

    displayNotes(searchInput.value);

});


// Dark Mode

function applyTheme(theme) {

    const isDark = theme === "dark";

    document.body.classList.toggle("dark-mode", isDark);

    themeToggle.textContent = isDark
        ? "☀️ Light Mode"
        : "🌙 Dark Mode";

}


// Load Saved Theme

const savedTheme = localStorage.getItem("theme") || "light";

applyTheme(savedTheme);


// Toggle Theme

themeToggle.addEventListener("click", function() {

    const isDark = document.body.classList.contains("dark-mode");

    const newTheme = isDark ? "light" : "dark";

    localStorage.setItem("theme", newTheme);

    applyTheme(newTheme);

});


// Display Existing Notes

displayNotes();