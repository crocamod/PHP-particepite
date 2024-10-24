let currentUser = null;
let subjects = [];

// Короткое сообщение в углу экрана
function showNotification(text) {
    const note = document.createElement('div');
    note.className = 'note';
    note.textContent = text;
    document.getElementById('notes').appendChild(note);
    setTimeout(() => note.remove(), 3000);
}

// Все запросы к серверу идут через эту функцию
async function callApi(action, body) {
    const options = {
        method: body ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
    };
    if (body) {
        options.body = JSON.stringify(body);
    }
    const response = await fetch(`api.php?action=${action}`, options);
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error);
    }
    return data;
}

// Средний балл. Если оценок нет, возвращаем null
function averageOf(grades) {
    if (grades.length === 0) {
        return null;
    }
    let sum = 0;
    for (const grade of grades) {
        sum += Number(grade.value);
    }
    return (sum / grades.length).toFixed(2);
}

function overallAverage() {
    let allGrades = [];
    for (const subject of subjects) {
        allGrades = allGrades.concat(subject.grades);
    }
    return averageOf(allGrades) ?? 'нет оценок';
}

function credentials() {
    return {
        login: document.getElementById('login').value,
        password: document.getElementById('password').value,
    };
}

function updateUserDisplay() {
    document.getElementById('loginBox').hidden = currentUser !== null;
    document.getElementById('diaryBox').hidden = currentUser === null;
    if (currentUser) {
        document.getElementById('userName').textContent = `Вы вошли как ${currentUser.login}`;
    }
    document.getElementById('overall').textContent = overallAverage();
}

function updateSubjectsDisplay() {
    const box = document.getElementById('subjects');
    box.textContent = '';

    if (subjects.length === 0) {
        box.textContent = 'Пока нет предметов. Добавьте первый.';
        return;
    }

    for (const subject of subjects) {
        const block = document.createElement('div');
        block.className = 'subject';

        const title = document.createElement('h3');
        title.textContent = `${subject.name}: средний балл ${averageOf(subject.grades) ?? 'нет оценок'}`;
        block.appendChild(title);

        for (const grade of subject.grades) {
            const gradeButton = document.createElement('button');
            gradeButton.className = 'grade';
            gradeButton.textContent = grade.value;
            gradeButton.title = 'Нажмите, чтобы удалить оценку';
            gradeButton.addEventListener('click', () => removeGrade(grade.id));
            block.appendChild(gradeButton);
        }

        const select = document.createElement('select');
        for (const value of [2, 3, 4, 5]) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        }

        const addButton = document.createElement('button');
        addButton.textContent = 'Поставить оценку';
        addButton.addEventListener('click', () => addGrade(subject.id, select.value));

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Удалить предмет';
        deleteButton.addEventListener('click', () => removeSubject(subject.id));

        block.append(select, addButton, deleteButton);
        box.appendChild(block);
    }
}

async function loadSubjects() {
    const data = await callApi('subjects');
    subjects = data.subjects;
    updateUserDisplay();
    updateSubjectsDisplay();
}

async function loadProfile() {
    const data = await callApi('me');
    currentUser = data.user;
    if (!currentUser) {
        subjects = [];
        updateUserDisplay();
        updateSubjectsDisplay();
        return;
    }
    await loadSubjects();
}

async function register() {
    try {
        await callApi('register', credentials());
        await loadProfile();
    } catch (error) {
        showNotification(error.message);
    }
}

async function login() {
    try {
        await callApi('login', credentials());
        document.getElementById('password').value = '';
        await loadProfile();
    } catch (error) {
        showNotification(error.message);
    }
}

async function logout() {
    await callApi('logout', {});
    await loadProfile();
}

async function addSubject() {
    if (!currentUser) return;

    const input = document.getElementById('subjectName');
    try {
        await callApi('add_subject', { name: input.value.trim() });
        input.value = '';
        await loadSubjects();
    } catch (error) {
        showNotification(error.message);
    }
}

async function removeSubject(subjectId) {
    if (!currentUser) return;
    if (!confirm('Удалить предмет вместе со всеми оценками?')) return;

    try {
        await callApi('delete_subject', { id: subjectId });
        await loadSubjects();
    } catch (error) {
        showNotification(error.message);
    }
}

async function addGrade(subjectId, value) {
    if (!currentUser) return;

    try {
        await callApi('add_grade', { subject_id: subjectId, value: Number(value) });
        showNotification(`Оценка ${value} добавлена`);
        await loadSubjects();
    } catch (error) {
        showNotification(error.message);
    }
}

async function removeGrade(gradeId) {
    if (!currentUser) return;

    try {
        await callApi('delete_grade', { id: gradeId });
        await loadSubjects();
    } catch (error) {
        showNotification(error.message);
    }
}

document.getElementById('registerButton').addEventListener('click', register);
document.getElementById('loginButton').addEventListener('click', login);
document.getElementById('logoutButton').addEventListener('click', logout);
document.getElementById('addSubjectButton').addEventListener('click', addSubject);

loadProfile().catch((error) => showNotification(error.message));
