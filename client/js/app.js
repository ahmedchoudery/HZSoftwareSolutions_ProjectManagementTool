const socket = io();
let currentUser = null;
let currentProject = null;
let token = localStorage.getItem('token');

async function apiCall(url, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json',
        'x-auth-token': token
    };
    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    const res = await fetch(url, config);
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || 'Error');
    return data;
}

socket.on('task_update', (data) => {
    if (currentProject && data.task && data.task.project === currentProject._id) {

        loadTasks(currentProject._id);

        if (data.type === 'COMMENT' && editingTask && editingTask._id === data.task._id) {
            renderComments(data.task.comments);
        }

        if (data.type === 'DELETE' && editingTask && editingTask._id === data.taskId) {
            window.taskModal.style.display = 'none';
            editingTask = null;
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {

    window.taskModal = document.getElementById('taskModal');
    window.projectModal = document.getElementById('projectModal');
    window.memberModal = document.getElementById('memberModal');

    const showRegisterBtn = document.getElementById('showRegister');
    if (showRegisterBtn) showRegisterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'block';
    });

    const showLoginBtn = document.getElementById('showLogin');
    if (showLoginBtn) showLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
    });

    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        setLoading(btn, true, 'Logging in...');

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.msg);
            token = data.token;
            localStorage.setItem('token', token);
            currentUser = data.user;
            showApp();
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(btn, false);
        }
    });

    const registerForm = document.getElementById('registerForm');
    if (registerForm) registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        setLoading(btn, true, 'Registering...');

        const username = document.getElementById('regUsername').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.msg);
            token = data.token;
            localStorage.setItem('token', token);
            currentUser = data.user;
            showApp();
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(btn, false);
        }
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    const newProjectBtn = document.getElementById('newProjectBtn');
    if (newProjectBtn) newProjectBtn.onclick = () => window.projectModal.style.display = 'block';

    const projectForm = document.getElementById('projectForm');
    if (projectForm) projectForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        setLoading(btn, true, 'Creating...');

        const title = document.getElementById('newProjTitle').value;
        const description = document.getElementById('newProjDesc').value;
        try {
            await apiCall('/api/projects', 'POST', { title, description });
            window.projectModal.style.display = 'none';
            e.target.reset(); // Clear form
            loadProjects();
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(btn, false);
        }
    });

    const addMemberBtn = document.getElementById('addMemberBtn');
    if (addMemberBtn) addMemberBtn.onclick = () => window.memberModal.style.display = 'block';

    const memberForm = document.getElementById('memberForm');
    if (memberForm) memberForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        setLoading(btn, true, 'Adding...');

        const email = document.getElementById('newMemberEmail').value;
        try {
            const updatedProject = await apiCall(`/api/projects/${currentProject._id}/members`, 'POST', { email });
            currentProject = updatedProject;
            const members = currentProject.members.map(m => m.username).join(', ');
            document.getElementById('projectMembers').textContent = members;
            window.memberModal.style.display = 'none';
            e.target.reset();
            alert('Member added!');
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(btn, false);
        }
    });

    const taskForm = document.getElementById('taskForm');
    if (taskForm) taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        setLoading(btn, true, 'Saving...');

        const title = document.getElementById('taskTitle').value;
        const description = document.getElementById('taskDesc').value;
        const assignedTo = document.getElementById('taskAssignee').value;
        try {
            if (editingTask) {
                await apiCall(`/api/tasks/${editingTask._id}`, 'PUT', { title, description, assignedTo });
            } else {
                await apiCall(`/api/projects/${currentProject._id}/tasks`, 'POST', {
                    title, description, status: newTaskStatus, assignedTo
                });
            }
            window.taskModal.style.display = "none";
            e.target.reset();
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(btn, false);
        }
    });

    const commentForm = document.getElementById('commentForm');
    if (commentForm) commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        setLoading(btn, true, 'Posting...');

        if (!editingTask) return;
        const text = document.getElementById('commentText').value;
        try {
            await apiCall(`/api/tasks/${editingTask._id}/comments`, 'POST', { text });
            document.getElementById('commentText').value = '';
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(btn, false);
        }
    });

    document.querySelectorAll('.close').forEach(span => {
        span.onclick = function () {
            window.taskModal.style.display = "none";
            window.projectModal.style.display = "none";
            window.memberModal.style.display = "none";
        }
    });

    if (token) {
        verifyToken();
    } else {
        showAuth();
    }
});

function verifyToken() {
    apiCall('/api/auth/user')
        .then(user => {
            currentUser = user;
            showApp();
        })
        .catch(err => {
            console.log(err);
            logout();
        });
}

function logout() {
    localStorage.removeItem('token');
    token = null;
    currentUser = null;
    showAuth();
}

function selectProject(project) {
    try {
        console.log('Selecting project:', project); // Debug
        currentProject = project;


        document.querySelectorAll('.project-item').forEach(el => el.classList.remove('active'));

        const board = document.getElementById('projectBoard');
        const noProject = document.getElementById('noProjectSelected');
        const titleEl = document.getElementById('projectTitle');
        const membersEl = document.getElementById('projectMembers');

        if (!board || !noProject || !titleEl || !membersEl) {
            throw new Error("Critical UI elements missing");
        }

        noProject.style.display = 'none';
        board.style.display = 'block';
        titleEl.textContent = project.title;

        const headerDiv = document.querySelector('.project-header');
        const existingDelBtn = document.getElementById('deleteProjectBtn');
        if (existingDelBtn) existingDelBtn.remove();

        const isOwner = (project.owner._id && project.owner._id.toString() === currentUser.id) ||
            (project.owner === currentUser.id) ||
            (currentUser._id && project.owner._id && project.owner._id.toString() === currentUser._id.toString());

        if (isOwner) {
            const delBtn = document.createElement('button');
            delBtn.id = 'deleteProjectBtn';
            delBtn.textContent = 'Delete Project';
            delBtn.className = 'btn-danger';
            delBtn.style.marginLeft = '10px';
            delBtn.onclick = () => window.deleteProject(project._id); // Use window ref

            headerDiv.appendChild(delBtn);
        }

        if (project.members && Array.isArray(project.members)) {
            const memberNames = project.members.map(m => {
                if (typeof m === 'object' && m !== null && m.username) return m.username;
                return 'Unknown';
            });
            membersEl.textContent = memberNames.join(', ');
        } else {
            membersEl.textContent = 'No members';
        }


        if (socket) socket.emit('joinProject', project._id);

        loadTasks(project._id);
    } catch (err) {
        console.error("Select Project Error:", err);
        alert("Error opening project: " + err.message);
    }
}

window.deleteProject = async function (id) {
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return;

    try {
        await apiCall(`/api/projects/${id}`, 'DELETE');
        currentProject = null;
        document.getElementById('projectBoard').style.display = 'none';
        document.getElementById('noProjectSelected').style.display = 'flex';
        loadProjects(); // Reload list
    } catch (err) {
        alert(err.message);
    }
}

window.deleteTask = async function (id) {
    if (!confirm('Delete this task?')) return;
    try {
        await apiCall(`/api/tasks/${id}`, 'DELETE');
    } catch (err) {
        alert(err.message);
    }
}

function showAuth() {
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
}

function showApp() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    document.getElementById('currentUser').textContent = currentUser.username;
    loadProjects();
}

function setLoading(btn, isLoading, text = 'Loading...') {
    if (isLoading) {
        btn.disabled = true;
        btn.dataset.originalText = btn.innerText;
        btn.innerText = text;
    } else {
        btn.disabled = false;
        btn.innerText = btn.dataset.originalText || 'Submit';
    }
}

if (token) {
    verifyToken();
} else {
    showAuth();
}

async function loadProjects() {
    try {
        const projects = await apiCall('/api/projects');
        const list = document.getElementById('projectList');
        list.innerHTML = '';

        if (projects.length === 0) {
            list.innerHTML = '<li style="padding: 10px; color: #888; text-align: center;">No projects yet. Click + to create one.</li>';
            return;
        }

        projects.forEach(p => {
            const li = document.createElement('li');
            li.className = 'project-item';
            li.innerHTML = `
                <span>${p.title}</span>
                ${p.owner._id === currentUser.id ? '<span style="font-size:0.8em; color:#666;">(Owner)</span>' : ''}
            `;
            li.onclick = () => selectProject(p);
            list.appendChild(li);
        });
    } catch (err) {
        console.error(err);
        document.getElementById('projectList').innerHTML = '<li style="color:red;">Error loading projects</li>';
    }
}

async function loadTasks(projectId) {
    try {
        const tasks = await apiCall(`/api/projects/${projectId}/tasks`);
        renderTasks(tasks);
    } catch (err) {
        console.error(err);
        alert("Failed to load tasks");
    }
}

function renderTasks(tasks) {
    const todoList = document.getElementById('list-todo');
    const progList = document.getElementById('list-progress');
    const doneList = document.getElementById('list-done');

    todoList.innerHTML = '';
    progList.innerHTML = '';
    doneList.innerHTML = '';

    const emptyMsg = '<div class="empty-state">No tasks</div>';

    let todoCount = 0;
    let progCount = 0;
    let doneCount = 0;

    tasks.forEach(task => {
        const card = createTaskCard(task);
        if (task.status === 'To Do') { todoList.appendChild(card); todoCount++; }
        else if (task.status === 'In Progress') { progList.appendChild(card); progCount++; }
        else if (task.status === 'Done') { doneList.appendChild(card); doneCount++; }
    });

    if (todoCount === 0) todoList.innerHTML = emptyMsg;
    if (progCount === 0) progList.innerHTML = emptyMsg;
    if (doneCount === 0) doneList.innerHTML = emptyMsg;
}


function createTaskCard(task) {
    const div = document.createElement('div');
    div.className = 'task-card';
    div.draggable = true;
    div.ondragstart = (e) => drag(e, task._id);
    div.onclick = () => editTask(task);

    let statusClass = 'badge-default';
    if (task.status === 'To Do') statusClass = 'badge-todo';
    else if (task.status === 'In Progress') statusClass = 'badge-progress';
    else if (task.status === 'Done') statusClass = 'badge-done';

    div.innerHTML = `
        <div class="card-header">
            <span class="badge ${statusClass}">${task.status}</span>
        </div>
        <strong>${task.title}</strong>
        <p>${task.description || ''}</p>
        <div class="card-footer">
            <small>${task.assignedTo ? '<span class="avatar-small">' + task.assignedTo.username.charAt(0).toUpperCase() + '</span> ' + task.assignedTo.username : '<span class="unassigned">Unassigned</span>'}</small>
            <button class="btn-icon-danger" onclick="event.stopPropagation(); window.deleteTask('${task._id}')" title="Delete Task">🗑️</button>
        </div>
    `;
    return div;
}

let draggedTaskId = null;
function drag(ev, taskId) {
    draggedTaskId = taskId;
}

function allowDrop(ev) {
    ev.preventDefault();
}

async function drop(ev, status) {
    ev.preventDefault();
    if (!draggedTaskId) return;

    try {
        await apiCall(`/api/tasks/${draggedTaskId}`, 'PUT', { status });

    } catch (err) {
        alert('Failed to move task');
    }
    draggedTaskId = null;
}

let editingTask = null; 
let newTaskStatus = 'To Do';


function setLoading(btn, isLoading, text = 'Loading...') {
    if (isLoading) {
        btn.disabled = true;
        btn.dataset.originalText = btn.innerText;
        btn.innerText = text;
    } else {
        btn.disabled = false;
        btn.innerText = btn.dataset.originalText || 'Submit';
    }
}

window.openTaskModal = function (status) {
    editingTask = null;
    newTaskStatus = status;
    document.getElementById('taskModalTitle').innerText = "New Task";
    document.getElementById('taskForm').reset();
    document.getElementById('commentsSection').style.display = 'none';

    const select = document.getElementById('taskAssignee');
    select.innerHTML = '<option value="">Unassigned</option>';
    if (currentProject) {
        currentProject.members.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m._id;
            opt.text = m.username;
            select.appendChild(opt);
        });
    }

    if (window.taskModal) window.taskModal.style.display = "block";
    else console.error("Task modal not found");
}

function editTask(task) {
    editingTask = task;
    document.getElementById('taskModalTitle').innerText = "Edit Task";
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDesc').value = task.description;

    const select = document.getElementById('taskAssignee');
    select.innerHTML = '<option value="">Unassigned</option>';
    if (currentProject) {
        currentProject.members.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m._id;
            opt.text = m.username;
            if (task.assignedTo && task.assignedTo._id === m._id) opt.selected = true;
            select.appendChild(opt);
        });
    }

    document.getElementById('commentsSection').style.display = 'block';
    renderComments(task.comments);

    if (window.taskModal) window.taskModal.style.display = "block";
}

function renderComments(comments) {
    const list = document.getElementById('commentsList');
    list.innerHTML = '';
    comments.forEach(c => {
        const div = document.createElement('div');
        div.className = 'comment';
        div.innerHTML = `<span class="comment-user">${c.user.username}:</span> ${c.text}`;
        list.appendChild(div);
    });
}
