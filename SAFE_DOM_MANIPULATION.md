# Safe DOM Manipulation Guide

## Overview
This guide demonstrates safe DOM manipulation techniques that prevent script injection vulnerabilities and keep your code clean and maintainable.


**Why `textContent` over `innerHTML`:**
- `innerHTML`: Parses HTML → XSS vulnerability
- `textContent`: Plain text only → Safe from injection
- `textContent`: Faster performance


## Helper Functions (`helpers.js`)

### `$bind()` - Safe Element Selection
Finds an element within a container using a `data-bind` attribute.

```javascript
const $bind = (container, key) => 
    container.querySelector(`[data-bind="${key}"]`);
```

**Usage:**
```html
<div class="card">
    <h5 data-bind="title"></h5>
    <p data-bind="description"></p>
</div>
```

```javascript
const card = document.querySelector('.card');
const title = $bind(card, 'title');  // Returns h5 element
const desc = $bind(card, 'description');  // Returns p element
```

**Benefits:**
- Decouples HTML structure from JavaScript
- Easier to refactor HTML without breaking selectors
- Clearer intent in code

---

## Templates Pattern

### Purpose
Keep HTML templates separate from data, ensuring clean separation of concerns and preventing inline script injection.

```javascript
function taskCardTemplate() {
    const div = document.createElement('div');
    div.classList.add('feladatDiv', 'col-12', 'col-sm-6', 'col-md-4');
    div.innerHTML = `
        <div class="card">
            <div class="card-body">
                <h5 class="card-title" data-bind="nev"></h5>
                <p class="card-text" data-bind="description"></p>
                <button data-bind="editBtn">
                edit: <i class="bi bi-pencil-square"></i>&nbsp;
                Szerkesztés
                </button>
            </div>
        </div>`;
    return div;
}
```

**Key Features:**
- ✅ Pure HTML structure without data
- ✅ Reusable for multiple data objects
- ✅ Easy to maintain and update
- ✅ Clear data binding points via `data-bind` attributes

---

## Complete Example: Task Card

### Template Definition
```javascript
function taskCardTemplate() {
    const div = document.createElement('div');
    div.classList.add('feladatDiv', 'col-12', 'col-sm-6', 'col-md-4', 'col-lg-3', 'col-xl-2', 'p-2');
    div.innerHTML = `
        <div class="card h-100" data-bind="card">
            <div class="card-body d-flex flex-column">
                <h5 class="card-title" data-bind="nev"></h5>
                
                <div class="d-none" data-bind="feladoRow">
                    <h6 class="mb-0">Feladó:</h6>
                    <div class="btn rounded-circle" 
                         style="width:24px;height:24px;" 
                         data-bind="feladoCircle"></div>
                    <span data-bind="feladoName"></span>
                </div>
                
                <p class="card-text"><strong>Tantárgy:</strong> <span data-bind="tantargy"></span></p>
                <p class="card-text"><strong>Téma:</strong> <span data-bind="tema"></span></p>
                <p class="card-text"><strong>Évfolyam:</strong> <span data-bind="evfolyam"></span></p>
                <p class="card-text"><strong>Nehézség:</strong> <span data-bind="nehezseg"></span></p>
                <p class="card-text"><strong>Leírás:</strong> <span data-bind="leiras"></span></p>
                
                <p class="card-text" data-bind="alfDb"></p>
                
                <button class="d-none btn btn-sm btn-light" data-bind="postBtn">
                    Közzétevés
                </button>
            </div>
        </div>`;
    return div;
}
```

### Usage in Code
```javascript
function renderTask(taskData, author, authorColor, courseName) {
    // 1. Get clean template
    const container = taskCardTemplate();
    container.id = `task_${taskData.id}`;

    // 2. Get card element and store data
    const card = $bind(container, "card");
    card.dataset.adat = encodeURIComponent(JSON.stringify(taskData));
    card.dataset.felado = author ?? "";
    card.style.borderColor = borderColor(taskData.Nehezseg);

    // 3. Add interactivity
    
    card..onclick = () => openTaskEditor(card.dataset);

    // 4. Populate text data (SAFE - prevents injection)
    $bind(container, 'tantargy').textContent = adat.Tantargy;
    $bind(container, 'tema')    .textContent = adat.Tema;
    $bind(container, 'evfolyam').textContent = `${adat.Evfolyam}.`;
    $bind(container, 'nehezseg').textContent = `${adat.Nehezseg}/10`;
    $bind(container, 'leiras')  .textContent = adat.Leiras;


    // 5. Populate conditional elements
    const subtaskCount = Number(taskData.alfDb) || 0;
    setText(container, "alfDb", 
        subtaskCount > 0 ? `${subtaskCount} alfeladat` : "Nincs alfeladat");

    // 6. Show author info if available
    showElement(container, "feladoRow", Boolean(author));
    if (author) {
        setText(container, "feladoName", author);
        setBgColor(container, 'feladoCircle', authorColor);
        
        const initials = document.createElement('span');
        initials.className = `text-${isBackgroundDark(authorColor) ? "light" : "dark"}-important`;
        initials.textContent = author[0]?.toUpperCase() ?? '';
        $bind(container, 'feladoCircle').appendChild(initials);
    }

    // 7. Show course info if available
    showElement(container, "kurzusRow", !!courseName);
    if (courseName) setText(container, "kurzusName", courseName);

    // 8. Handle publish button
    const publishBtn = $bind(container, 'postBtn');
    const shouldShow = ActiveLocation === "Feladataim";
    publishBtn.classList.toggle('d-none', !shouldShow);
    
    if (shouldShow) {
        preventParentClick(publishBtn);
        publishBtn.onclick = () => publishTask(taskData.id);
    }

    // 9. Add to DOM
    document.getElementById("BigDih").appendChild(container);
}
```

---

## Security Benefits

### ✅ Prevents XSS (Cross-Site Scripting)
Using `textContent` instead of `innerHTML`:
```javascript
// ❌ UNSAFE
element.innerHTML = userInput;  // If userInput = "<img src=x onerror='alert(\"XSS\")'>", it executes!

// ✅ SAFE
element.textContent = userInput;  // Treats as plain text, no execution
```

### ✅ Prevents Event Hijacking
Using `preventDefault()` for proper event control:
```javascript
// ❌ UNSAFE - Parent events interfere
<div onclick="cardClick()">
    <button onclick="editClick()">Edit</button>  <!-- Also triggers cardClick! -->
</div>

// ✅ SAFE - Proper event isolation
preventParentClick(editBtn);
editBtn.onclick = editClick;
```

---

## Best Practice

### **Keep Templates Pure**
```javascript
// Good - No data in template
function template() {
    return `<div data-bind="name"></div>`;
}

// Bad - Data mixed with template
function template(data) {
    return `<div>${data.name}</div>`;  // Can cause injection
}
```
