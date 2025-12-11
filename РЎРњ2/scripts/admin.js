let projectsData = [];
let currentProject = null;
let draggedElement = null;
let draggedFromType = null;

// Загрузка данных проектов
async function loadProjects() {
    try {
        const response = await fetch('data/projects.json');
        const data = await response.json();
        projectsData = data.projects || [];
        renderProjectsList();
    } catch (error) {
        console.error('Ошибка загрузки проектов:', error);
        projectsData = [];
    }
}

// Отображение списка проектов
function renderProjectsList() {
    const list = document.getElementById('projects-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    projectsData.forEach(project => {
        const li = document.createElement('li');
        li.textContent = project.name;
        li.onclick = () => selectProject(project.id);
        list.appendChild(li);
    });
}

// Выбор проекта для редактирования
function selectProject(projectId) {
    currentProject = projectsData.find(p => p.id === projectId);
    if (!currentProject) return;
    
    // Обновляем активный элемент в списке
    document.querySelectorAll('#projects-list li').forEach(li => {
        li.classList.remove('active');
        if (li.textContent === currentProject.name) {
            li.classList.add('active');
        }
    });
    
    // Показываем редактор
    document.getElementById('editor-content').style.display = 'block';
    document.querySelector('.editor-placeholder').style.display = 'none';
    
    // Заполняем форму
    document.getElementById('project-name').value = currentProject.name;
    document.getElementById('project-description').value = currentProject.description || '';
    
    // Загружаем изображения
    loadProjectImages();
    updatePreviewSelect();
    renderCarouselPreview();
}

// Загрузка изображений проекта
function loadProjectImages() {
    if (!currentProject) return;
    
    loadImagesGrid('photos', currentProject.photos || []);
    loadImagesGrid('drawings', currentProject.drawings || []);
    loadImagesGrid('renders', currentProject.renders || []);
}

// Загрузка сетки изображений
function loadImagesGrid(type, images) {
    const grid = document.getElementById(`${type}-grid`);
    if (!grid) return;
    
    grid.innerHTML = '';
    
    // Добавляем обработчики для drop на саму сетку
    grid.addEventListener('dragover', (e) => {
        e.preventDefault();
        grid.classList.add('drag-over');
    });
    
    grid.addEventListener('dragleave', () => {
        grid.classList.remove('drag-over');
    });
    
    grid.addEventListener('drop', (e) => {
        e.preventDefault();
        grid.classList.remove('drag-over');
        
        const dragging = document.querySelector('.dragging');
        if (dragging && dragging.dataset.imageType !== type) {
            // Перемещаем в другую папку
            const imagePath = dragging.dataset.imagePath;
            moveImageToType(imagePath, dragging.dataset.imageType, type);
            dragging.dataset.imageType = type;
            grid.appendChild(dragging);
            updateImageOrder();
        }
    });
    
    images.forEach((imagePath, index) => {
        const item = createImageItem(imagePath, index, type);
        grid.appendChild(item);
    });
}

// Создание элемента изображения
function createImageItem(imagePath, index, type) {
    const item = document.createElement('div');
    item.className = 'image-item';
    item.draggable = true;
    item.dataset.imagePath = imagePath;
    item.dataset.imageType = type;
    item.dataset.imageIndex = index;
    
    const img = document.createElement('img');
    img.src = imagePath;
    img.onerror = function() {
        this.src = 'images/photos/ComfyUI_00070_.png';
    };
    
    const order = document.createElement('div');
    order.className = 'image-order';
    order.textContent = index + 1;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'image-delete';
    deleteBtn.textContent = '×';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteImage(imagePath, type);
    };
    
    item.appendChild(img);
    item.appendChild(order);
    item.appendChild(deleteBtn);
    
    // Drag and drop события
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('drop', handleDrop);
    item.addEventListener('dragend', handleDragEnd);
    
    return item;
}

// Обработка начала перетаскивания
function handleDragStart(e) {
    draggedElement = this;
    draggedFromType = this.dataset.imageType;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

// Обработка перетаскивания над элементом
function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Если перетаскиваем над другой сеткой (другой тип), разрешаем drop
    const targetGrid = this.closest('.images-grid');
    if (targetGrid && draggedElement) {
        const dragging = document.querySelector('.dragging');
        if (dragging && targetGrid !== dragging.parentElement) {
            // Перетаскиваем в другую сетку
            const afterElement = getDragAfterElement(targetGrid, e.clientX);
            if (afterElement == null) {
                targetGrid.appendChild(dragging);
            } else {
                targetGrid.insertBefore(dragging, afterElement);
            }
            return;
        }
    }
    
    // Перетаскивание внутри той же сетки
    const afterElement = getDragAfterElement(this.parentElement, e.clientX);
    const dragging = document.querySelector('.dragging');
    
    if (afterElement == null) {
        this.parentElement.appendChild(dragging);
    } else {
        this.parentElement.insertBefore(dragging, afterElement);
    }
}

// Получение элемента после курсора
function getDragAfterElement(container, x) {
    const draggableElements = [...container.querySelectorAll('.image-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = x - box.left - box.width / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Обработка отпускания
function handleDrop(e) {
    e.preventDefault();
    
    const dragging = document.querySelector('.dragging');
    if (!dragging) return;
    
    const targetGrid = this.closest('.images-grid');
    if (targetGrid && dragging) {
        // Определяем новый тип на основе ID сетки
        const newType = targetGrid.id.replace('-grid', '');
        dragging.dataset.imageType = newType;
        
        // Если перетащили в другую папку, обновляем данные
        if (draggedFromType !== newType) {
            moveImageToType(dragging.dataset.imagePath, draggedFromType, newType);
        }
    }
    
    updateImageOrder();
}

// Обработка окончания перетаскивания
function handleDragEnd(e) {
    this.classList.remove('dragging');
    updateImageOrder();
}

// Перемещение изображения между типами
function moveImageToType(imagePath, fromType, toType) {
    if (!currentProject) return;
    
    // Удаляем из старого типа
    if (currentProject[fromType]) {
        currentProject[fromType] = currentProject[fromType].filter(path => path !== imagePath);
    }
    
    // Добавляем в новый тип
    if (!currentProject[toType]) {
        currentProject[toType] = [];
    }
    // Изображение уже добавлено в DOM, просто обновляем порядок
}

// Обновление порядка изображений
function updateImageOrder() {
    if (!currentProject) return;
    
    ['photos', 'drawings', 'renders'].forEach(type => {
        const grid = document.getElementById(`${type}-grid`);
        if (!grid) return;
        
        const items = Array.from(grid.querySelectorAll('.image-item'));
        const newOrder = items.map((item, index) => {
            item.dataset.imageIndex = index;
            const orderEl = item.querySelector('.image-order');
            if (orderEl) orderEl.textContent = index + 1;
            
            // Обновляем тип если изменился
            if (item.dataset.imageType !== type) {
                item.dataset.imageType = type;
            }
            
            return item.dataset.imagePath;
        });
        
        currentProject[type] = newOrder;
    });
    
    renderCarouselPreview();
}

// Удаление изображения
function deleteImage(imagePath, type) {
    if (!currentProject) return;
    
    if (confirm('Удалить это изображение?')) {
        currentProject[type] = currentProject[type].filter(path => path !== imagePath);
        loadProjectImages();
        updatePreviewSelect();
        renderCarouselPreview();
    }
}

// Обновление селекта превью
function updatePreviewSelect() {
    if (!currentProject) return;
    
    const select = document.getElementById('project-preview');
    if (!select) return;
    
    select.innerHTML = '<option value="">Выберите изображение</option>';
    
    const allImages = [
        ...(currentProject.photos || []),
        ...(currentProject.drawings || []),
        ...(currentProject.renders || [])
    ];
    
    allImages.forEach(imagePath => {
        const option = document.createElement('option');
        option.value = imagePath;
        option.textContent = imagePath.split('/').pop();
        if (currentProject.previewImage === imagePath) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

// Рендеринг превью карусели
function renderCarouselPreview() {
    if (!currentProject) return;
    
    const container = document.getElementById('preview-carousels');
    if (!container) return;
    
    container.innerHTML = '';
    
    ['drawings', 'photos', 'renders'].forEach(type => {
        const carouselDiv = document.createElement('div');
        carouselDiv.className = 'preview-carousel';
        
        const title = document.createElement('h4');
        title.textContent = type === 'drawings' ? 'Чертежи' : type === 'photos' ? 'Фото' : 'Рендеры';
        
        const imagesDiv = document.createElement('div');
        imagesDiv.className = 'preview-carousel-images';
        
        const images = currentProject[type] || [];
        images.forEach(imagePath => {
            const img = document.createElement('img');
            img.src = imagePath;
            img.onerror = function() {
                this.src = 'images/photos/ComfyUI_00070_.png';
            };
            imagesDiv.appendChild(img);
        });
        
        carouselDiv.appendChild(title);
        carouselDiv.appendChild(imagesDiv);
        container.appendChild(carouselDiv);
    });
}

// Сохранение изменений проекта
async function saveProject() {
    if (!currentProject) return;
    
    // Обновляем данные из формы
    currentProject.name = document.getElementById('project-name').value;
    currentProject.description = document.getElementById('project-description').value;
    currentProject.previewImage = document.getElementById('project-preview').value;
    
    // Обновляем в массиве
    const index = projectsData.findIndex(p => p.id === currentProject.id);
    if (index !== -1) {
        projectsData[index] = currentProject;
    }
    
    // Сохраняем в файл (в реальном проекте нужен сервер)
    try {
        const response = await fetch('data/projects.json', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ projects: projectsData }, null, 2)
        });
        
        if (response.ok) {
            alert('Проект сохранен!');
            renderProjectsList();
        } else {
            alert('Ошибка сохранения. В реальном проекте нужен сервер для сохранения файлов.');
        }
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        alert('Ошибка сохранения. В реальном проекте нужен сервер для сохранения файлов.');
    }
}

// Создание нового проекта
function createNewProject() {
    const name = document.getElementById('new-project-name').value.trim();
    const folder = document.getElementById('new-project-folder').value.trim();
    
    if (!name || !folder) {
        alert('Заполните все поля');
        return;
    }
    
    // Проверяем уникальность
    if (projectsData.some(p => p.id === folder || p.folder === folder)) {
        alert('Проект с таким ID или папкой уже существует');
        return;
    }
    
    // Создаем новый проект
    const newProject = {
        id: folder,
        name: name,
        description: '',
        folder: folder,
        previewImage: '',
        photos: [],
        drawings: [],
        renders: [],
        carouselOrder: {
            photos: [],
            drawings: [],
            renders: []
        }
    };
    
    projectsData.push(newProject);
    
    // Создаем папки (в реальном проекте нужен сервер)
    // Здесь просто добавляем в данные
    
    closeNewProjectModal();
    renderProjectsList();
    selectProject(newProject.id);
    
    alert('Проект создан! Для загрузки изображений используйте файловый менеджер или сервер.');
}

// Открытие модалки создания проекта
function openNewProjectModal() {
    document.getElementById('new-project-modal').classList.add('active');
    document.getElementById('new-project-name').value = '';
    document.getElementById('new-project-folder').value = '';
}

// Закрытие модалки создания проекта
function closeNewProjectModal() {
    document.getElementById('new-project-modal').classList.remove('active');
}

// Переключение вкладок
function switchTab(tabName) {
    // Убираем активный класс со всех вкладок
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Активируем выбранную вкладку
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    loadProjects();
    
    // Обработчики кнопок
    document.getElementById('btn-add-project').addEventListener('click', openNewProjectModal);
    document.getElementById('btn-create-project').addEventListener('click', createNewProject);
    document.getElementById('btn-save-project').addEventListener('click', saveProject);
    
    // Обработчики вкладок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });
    
    // Закрытие модалки по клику вне её
    document.getElementById('new-project-modal').addEventListener('click', (e) => {
        if (e.target.id === 'new-project-modal') {
            closeNewProjectModal();
        }
    });
});

