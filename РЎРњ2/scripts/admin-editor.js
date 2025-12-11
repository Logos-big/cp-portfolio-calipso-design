// ============================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ============================================
let projectsData = [];
let originalProjectsData = [];
let isEditMode = false;
let hasChanges = false;
let carouselSwiper = null;
let carouselCurrentX = 0;
let savedCarouselPosition = null;
let isCarouselPaused = false;
let customScrollAnimation = null;

// ============================================
// ЗАГРУЗКА ДАННЫХ
// ============================================
async function loadProjectsData() {
    try {
        // Сначала пытаемся загрузить из localStorage (если есть сохраненные изменения)
        const savedData = localStorage.getItem('projectsData');
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                if (parsedData.projects && parsedData.projects.length > 0) {
                    projectsData = parsedData.projects;
                    originalProjectsData = JSON.parse(JSON.stringify(projectsData));
                    loadCarouselImages();
                    loadProjectsFolders();
                    console.log('Данные загружены из localStorage');
                    return;
                }
            } catch (e) {
                console.log('Ошибка парсинга данных из localStorage, загружаем из файла');
            }
        }
        
        // Загружаем из файла
        const response = await fetch('data/projects.json');
        const data = await response.json();
        projectsData = data.projects || [];
        // Сохраняем копию для отмены изменений
        originalProjectsData = JSON.parse(JSON.stringify(projectsData));
        loadCarouselImages();
        loadProjectsFolders();
    } catch (error) {
        console.error('Ошибка загрузки данных проектов:', error);
        projectsData = [];
        originalProjectsData = [];
    }
}

// ============================================
// ЗАГРУЗКА КАРУСЕЛИ
// ============================================
function loadCarouselImages() {
    const carouselTrack = document.getElementById('carousel-track');
    if (!carouselTrack) return;
    
    carouselTrack.innerHTML = '';
    
    // Сортируем проекты по порядку (можно добавить поле order)
    const sortedProjects = [...projectsData].sort((a, b) => {
        return (a.order || 0) - (b.order || 0);
    });
    
    sortedProjects.forEach((project, index) => {
        const slide = document.createElement('div');
        slide.className = 'swiper-slide';
        slide.dataset.projectId = project.id;
        
        const item = document.createElement('div');
        item.className = 'carousel-item';
        item.draggable = isEditMode;
        item.dataset.projectId = project.id;
        item.dataset.projectIndex = index;
        
        const img = document.createElement('img');
        img.src = project.previewImage || 'images/photos/ComfyUI_00070_.png';
        img.alt = project.name || `Project ${index + 1}`;
        img.onerror = function() {
            this.src = 'images/photos/ComfyUI_00070_.png';
        };
        
        const detailsButton = document.createElement('button');
        detailsButton.className = 'project-details-button';
        detailsButton.textContent = 'Подробнее';
        detailsButton.onclick = (e) => {
            e.stopPropagation();
            window.location.href = `project.html?id=${project.id}`;
        };
        
        item.appendChild(img);
        item.appendChild(detailsButton);
        
        if (!isEditMode) {
            item.addEventListener('click', () => openImageModal(project.previewImage || 'images/photos/ComfyUI_00070_.png'));
        }
        
        slide.appendChild(item);
        carouselTrack.appendChild(slide);
    });
    
    if (typeof Swiper !== 'undefined') {
        initSwiper();
        // После инициализации Swiper настраиваем drag and drop если в режиме редактирования
        if (isEditMode) {
            setTimeout(() => {
                setupDragAndDrop();
            }, 300);
        }
    } else {
        const checkSwiper = setInterval(() => {
            if (typeof Swiper !== 'undefined') {
                initSwiper();
                clearInterval(checkSwiper);
                // После инициализации Swiper настраиваем drag and drop если в режиме редактирования
                if (isEditMode) {
                    setTimeout(() => {
                        setupDragAndDrop();
                    }, 300);
                }
            }
        }, 100);
    }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ SWIPER
// ============================================
function initSwiper() {
    if (carouselSwiper) {
        carouselSwiper.destroy(true, true);
    }
    
    const swiperEl = document.querySelector('.carousel-swiper');
    if (!swiperEl) return;
    
    carouselSwiper = new Swiper('.carousel-swiper', {
        slidesPerView: 'auto',
        spaceBetween: 0,
        loop: false,
        speed: 0,
        freeMode: {
            enabled: false,
        },
        autoplay: false,
        allowTouchMove: !isEditMode,
        grabCursor: !isEditMode,
        simulateTouch: !isEditMode,
        on: {
            init: function() {
                // Дублируем слайды только если не в режиме редактирования
                if (!isEditMode) {
                    const wrapper = this.wrapperEl;
                    const slides = Array.from(wrapper.querySelectorAll('.swiper-slide'));
                    slides.forEach(slide => {
                        const clone = slide.cloneNode(true);
                        wrapper.appendChild(clone);
                    });
                }
                
                this.allowTouchMove = false;
                this.allowSlideNext = false;
                this.allowSlidePrev = false;
                
                if (!isEditMode) {
                    setTimeout(() => {
                        startCustomAutoScroll(this);
                    }, 300);
                } else {
                    // В режиме редактирования настраиваем drag and drop
                    setTimeout(() => {
                        setupDragAndDrop();
                    }, 200);
                }
            }
        }
    });
}

// ============================================
// АВТОПРОКРУТКА КАРУСЕЛИ
// ============================================
function startCustomAutoScroll(swiper) {
    if (customScrollAnimation) {
        cancelAnimationFrame(customScrollAnimation);
    }
    
    const scrollSpeed = 0.5;
    const wrapper = swiper.wrapperEl;
    const container = swiper.el;
    
    let currentX = savedCarouselPosition !== null ? savedCarouselPosition : getTransformX(wrapper);
    if (currentX === 0) currentX = carouselCurrentX;
    carouselCurrentX = currentX;
    if (savedCarouselPosition !== null) savedCarouselPosition = null;
    
    wrapper.style.transform = `translateX(${currentX}px)`;
    wrapper.style.transition = 'none';
    
    const handleMouseEnter = () => { isCarouselPaused = true; };
    const handleMouseLeave = () => { isCarouselPaused = false; };
    
    container.removeEventListener('mouseenter', handleMouseEnter);
    container.removeEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);
    
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        isCarouselPaused = true;
        
        let currentX = getTransformX(wrapper) || carouselCurrentX;
        currentX -= e.deltaY * 0.5;
        applyInfiniteScroll(wrapper, currentX);
        
        clearTimeout(container.wheelTimeout);
        container.wheelTimeout = setTimeout(() => {
            isCarouselPaused = false;
        }, 2000);
    });
    
    function animate() {
        if (isCarouselPaused || !swiper || !wrapper || isEditMode) {
            customScrollAnimation = requestAnimationFrame(animate);
            return;
        }
        let animCurrentX = carouselCurrentX;
        const slides = wrapper.querySelectorAll('.swiper-slide');
        if (slides.length === 0) {
            customScrollAnimation = requestAnimationFrame(animate);
            return;
        }
        let totalWidth = 0;
        slides.forEach(slide => { totalWidth += slide.offsetWidth; });
        if (totalWidth === 0) {
            customScrollAnimation = requestAnimationFrame(animate);
            return;
        }
        const halfWidth = totalWidth / 2;
        animCurrentX -= scrollSpeed;
        if (Math.abs(animCurrentX) >= halfWidth) {
            animCurrentX = animCurrentX + halfWidth;
        }
        carouselCurrentX = animCurrentX;
        wrapper.style.transform = `translateX(${animCurrentX}px)`;
        wrapper.style.transition = 'none';
        wrapper.style.willChange = 'transform';
        customScrollAnimation = requestAnimationFrame(animate);
    }
    customScrollAnimation = requestAnimationFrame(animate);
}

// ============================================
// УТИЛИТЫ
// ============================================
function getTransformX(element) {
    if (!element) return 0;
    let transformValue = element.style.transform;
    if (!transformValue || transformValue === 'none') {
        const computedStyle = window.getComputedStyle(element);
        transformValue = computedStyle.transform;
    }
    if (transformValue && transformValue !== 'none') {
        const match = transformValue.match(/translateX\(([^)]+)\)/);
        if (match) {
            const parsedX = parseFloat(match[1]);
            if (!isNaN(parsedX)) return parsedX;
        }
        const matrixMatch = transformValue.match(/matrix\([^,]+,\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*([^,]+),\s*[^)]+\)/);
        if (matrixMatch) {
            const parsedX = parseFloat(matrixMatch[1]);
            if (!isNaN(parsedX)) return parsedX;
        }
    }
    return 0;
}

function applyInfiniteScroll(wrapper, currentX) {
    const slides = wrapper.querySelectorAll('.swiper-slide');
    let totalWidth = 0;
    slides.forEach(slide => totalWidth += slide.offsetWidth);
    
    if (totalWidth > 0) {
        const halfWidth = totalWidth / 2;
        if (Math.abs(currentX) >= halfWidth) {
            currentX = currentX + halfWidth;
        } else if (currentX > 0) {
            currentX = currentX - halfWidth;
        }
        carouselCurrentX = currentX;
        wrapper.style.transform = `translateX(${currentX}px)`;
        wrapper.style.transition = 'none';
    }
    return currentX;
}

// ============================================
// РЕЖИМ РЕДАКТИРОВАНИЯ
// ============================================
function toggleEditMode() {
    isEditMode = !isEditMode;
    const main = document.querySelector('.main');
    
    if (isEditMode) {
        main.classList.add('edit-mode');
        document.getElementById('edit-mode-btn').textContent = 'Выйти из режима редактирования';
        document.getElementById('edit-mode-btn').classList.add('active');
        document.getElementById('save-btn').style.display = 'inline-block';
        document.getElementById('cancel-btn').style.display = 'none';
        
        // Останавливаем автопрокрутку
        if (customScrollAnimation) {
            cancelAnimationFrame(customScrollAnimation);
        }
        
        // Делаем элементы перетаскиваемыми после загрузки карусели
        setTimeout(() => {
            setupDragAndDrop();
        }, 100);
    } else {
        main.classList.remove('edit-mode');
        document.getElementById('edit-mode-btn').textContent = 'Режим редактирования';
        document.getElementById('edit-mode-btn').classList.remove('active');
        document.getElementById('save-btn').style.display = 'none';
        document.getElementById('cancel-btn').style.display = 'none';
        
        // Возобновляем автопрокрутку
        if (carouselSwiper) {
            startCustomAutoScroll(carouselSwiper);
        }
    }
    
    loadCarouselImages();
}

// ============================================
// DRAG AND DROP
// ============================================
function setupDragAndDrop() {
    // Удаляем старые обработчики
    const oldItems = document.querySelectorAll('.carousel-item');
    oldItems.forEach(item => {
        item.removeEventListener('dragstart', handleDragStart);
        item.removeEventListener('dragover', handleDragOver);
        item.removeEventListener('drop', handleDrop);
        item.removeEventListener('dragend', handleDragEnd);
    });
    
    // Добавляем обработчики на слайды (swiper-slide), а не на items
    const slides = document.querySelectorAll('.swiper-slide');
    slides.forEach(slide => {
        const item = slide.querySelector('.carousel-item');
        if (item) {
            item.draggable = true;
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragover', handleDragOver);
            item.addEventListener('drop', handleDrop);
            item.addEventListener('dragend', handleDragEnd);
        }
    });
}

let draggedElement = null;
let draggedSlide = null;

function handleDragStart(e) {
    draggedElement = this;
    draggedSlide = this.closest('.swiper-slide');
    if (draggedSlide) {
        draggedSlide.classList.add('dragging');
    }
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    console.log('Начато перетаскивание:', draggedSlide?.dataset.projectId);
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (this === draggedElement || !draggedSlide) return;
    
    const currentSlide = this.closest('.swiper-slide');
    if (!currentSlide || currentSlide === draggedSlide) return;
    
    const wrapper = currentSlide.parentElement;
    if (!wrapper) return;
    
    const afterElement = getDragAfterSlide(wrapper, e.clientX);
    
    if (afterElement == null) {
        wrapper.appendChild(draggedSlide);
    } else {
        wrapper.insertBefore(draggedSlide, afterElement);
    }
}

function getDragAfterSlide(container, x) {
    const draggableSlides = [...container.querySelectorAll('.swiper-slide:not(.dragging)')];
    
    return draggableSlides.reduce((closest, slide) => {
        const box = slide.getBoundingClientRect();
        const offset = x - box.left - box.width / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: slide };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function handleDrop(e) {
    e.preventDefault();
    updateCarouselOrder();
}

function handleDragEnd(e) {
    if (draggedSlide) {
        draggedSlide.classList.remove('dragging');
    }
    this.classList.remove('dragging');
    draggedElement = null;
    draggedSlide = null;
    updateCarouselOrder();
}

function updateCarouselOrder() {
    const carouselTrack = document.getElementById('carousel-track');
    if (!carouselTrack) {
        console.error('carousel-track не найден');
        return;
    }
    
    // Получаем все слайды
    const allSlides = Array.from(carouselTrack.querySelectorAll('.swiper-slide'));
    
    // Фильтруем только оригинальные слайды по уникальным projectId
    const uniqueProjectIds = new Set();
    const originalSlides = [];
    
    for (const slide of allSlides) {
        const projectId = slide.dataset.projectId;
        if (projectId && !uniqueProjectIds.has(projectId)) {
            uniqueProjectIds.add(projectId);
            originalSlides.push(slide);
        }
    }
    
    // Берем только нужное количество (на случай если есть дубликаты)
    const totalProjects = projectsData.length;
    const slidesToUse = originalSlides.slice(0, totalProjects);
    
    console.log('=== Обновление порядка проектов ===');
    console.log('Всего слайдов:', allSlides.length);
    console.log('Уникальных проектов:', slidesToUse.length);
    console.log('Всего проектов в данных:', totalProjects);
    
    // Обновляем порядок проектов
    let orderUpdated = false;
    slidesToUse.forEach((slide, index) => {
        const projectId = slide.dataset.projectId;
        if (!projectId) {
            console.warn('Слайд без projectId на позиции', index);
            return;
        }
        
        const project = projectsData.find(p => p.id === projectId);
        if (project) {
            const oldOrder = project.order !== undefined ? project.order : index;
            project.order = index;
            if (oldOrder !== index) {
                orderUpdated = true;
                console.log(`✓ Проект "${project.name}" (${projectId}) - порядок: ${oldOrder} → ${index}`);
            }
        } else {
            console.warn('Проект не найден для ID:', projectId);
        }
    });
    
    if (orderUpdated || true) { // Всегда сохраняем для надежности
        console.log('Новый порядок проектов:', projectsData.map(p => ({ id: p.id, name: p.name, order: p.order })));
        
        hasChanges = true;
        showChangesIndicator();
        
        // Автоматически сохраняем изменения в localStorage
        try {
            const dataToSave = { projects: projectsData };
            localStorage.setItem('projectsData', JSON.stringify(dataToSave));
            
            // Проверяем сохранение
            const saved = localStorage.getItem('projectsData');
            if (saved) {
                const savedParsed = JSON.parse(saved);
                console.log('✓ Порядок автоматически сохранен в localStorage');
                console.log('Сохраненный порядок:', savedParsed.projects.map(p => ({ id: p.id, name: p.name, order: p.order })));
            } else {
                console.error('✗ Не удалось сохранить в localStorage');
            }
        } catch (e) {
            console.error('Ошибка автоматического сохранения:', e);
        }
    } else {
        console.log('Порядок не изменился');
    }
}

// ============================================
// СОХРАНЕНИЕ ИЗМЕНЕНИЙ
// ============================================
async function saveChanges() {
    const savingEl = document.getElementById('saving-indicator') || createSavingIndicator();
    savingEl.classList.add('show');
    
    try {
        // Сохраняем в localStorage - это основное хранилище
        const dataToSave = { projects: projectsData };
        localStorage.setItem('projectsData', JSON.stringify(dataToSave));
        
        // Проверяем, что данные сохранились
        const savedCheck = localStorage.getItem('projectsData');
        if (!savedCheck) {
            throw new Error('Не удалось сохранить данные в localStorage');
        }
        
        console.log('Данные сохранены в localStorage:', dataToSave);
        
        // Пытаемся сохранить через сервер (если есть поддержка, но не критично)
        try {
            const response = await fetch('data/projects.json', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataToSave, null, 2)
            });
            
            if (response.ok) {
                // Успешно сохранено на сервере
                savingEl.textContent = 'Сохранено на сервере!';
            } else {
                // Сервер не поддерживает запись - это нормально, используем только localStorage
                savingEl.textContent = 'Сохранено в браузере!';
            }
        } catch (serverError) {
            // Сервер не поддерживает запись - это нормально, используем только localStorage
            savingEl.textContent = 'Сохранено в браузере!';
            console.log('Сервер не поддерживает запись, данные сохранены только в localStorage');
        }
        
        // Обновляем оригинальную копию
        originalProjectsData = JSON.parse(JSON.stringify(projectsData));
        hasChanges = false;
        hideChangesIndicator();
        
        // Показываем сообщение об успешном сохранении
        setTimeout(() => {
            savingEl.textContent = 'Изменения сохранены!';
            
            // Проверяем, что данные действительно сохранились
            const verifyData = localStorage.getItem('projectsData');
            if (verifyData) {
                try {
                    const verifyParsed = JSON.parse(verifyData);
                    console.log('✓ Проверка сохранения: сохранено', verifyParsed.projects?.length || 0, 'проектов');
                    console.log('✓ Данные в localStorage:', verifyParsed);
                } catch (e) {
                    console.error('Ошибка проверки сохраненных данных:', e);
                }
            } else {
                console.error('✗ Данные не найдены в localStorage после сохранения!');
            }
            
            setTimeout(() => {
                savingEl.classList.remove('show');
                alert('Изменения сохранены в браузере!\n\nВАЖНО: Обновите главную страницу (index.html), чтобы увидеть изменения.\n\nИли откройте главную страницу в новой вкладке.');
                // Перезагружаем страницу для применения изменений
                window.location.reload();
            }, 1500);
        }, 500);
        
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        alert('Ошибка сохранения: ' + error.message);
        savingEl.classList.remove('show');
    }
}

function cancelChanges() {
    if (confirm('Отменить все изменения?')) {
        projectsData = JSON.parse(JSON.stringify(originalProjectsData));
        hasChanges = false;
        hideChangesIndicator();
        isEditMode = false;
        toggleEditMode();
        loadCarouselImages();
    }
}

function createSavingIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'saving-indicator';
    indicator.className = 'saving';
    indicator.textContent = 'Сохранение...';
    document.body.appendChild(indicator);
    return indicator;
}

function showChangesIndicator() {
    let indicator = document.getElementById('changes-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'changes-indicator';
        indicator.className = 'changes-indicator';
        indicator.textContent = 'Есть несохраненные изменения';
        document.body.appendChild(indicator);
    }
    indicator.classList.add('show');
}

function hideChangesIndicator() {
    const indicator = document.getElementById('changes-indicator');
    if (indicator) {
        indicator.classList.remove('show');
    }
}

// ============================================
// ЗАГРУЗКА ПАПОК ПРОЕКТОВ В ФУТЕРЕ
// ============================================
function loadProjectsFolders() {
    const foldersContainer = document.getElementById('projects-folders');
    if (!foldersContainer) return;
    
    foldersContainer.innerHTML = '';
    
    projectsData.forEach(project => {
        const folder = document.createElement('div');
        folder.className = 'project-folder';
        folder.onclick = () => {
            window.location.href = `project.html?id=${project.id}`;
        };
        
        const header = document.createElement('div');
        header.className = 'folder-header';
        
        const name = document.createElement('div');
        name.className = 'folder-name';
        name.textContent = project.name;
        
        const count = document.createElement('div');
        count.className = 'folder-count';
        const totalImages = (project.photos?.length || 0) + 
                          (project.drawings?.length || 0) + 
                          (project.renders?.length || 0);
        count.textContent = `${totalImages} изображений`;
        
        header.appendChild(name);
        header.appendChild(count);
        
        const thumbnails = document.createElement('div');
        thumbnails.className = 'folder-thumbnails';
        
        // Показываем первые 9 изображений
        const allImages = [
            ...(project.photos || []).slice(0, 3),
            ...(project.drawings || []).slice(0, 3),
            ...(project.renders || []).slice(0, 3)
        ].slice(0, 9);
        
        for (let i = 0; i < 9; i++) {
            const thumbnail = document.createElement('img');
            thumbnail.className = 'folder-thumbnail';
            if (allImages[i]) {
                thumbnail.src = allImages[i];
                thumbnail.onerror = function() {
                    this.classList.add('empty');
                    this.textContent = '';
                };
            } else {
                thumbnail.classList.add('empty');
                thumbnail.textContent = '';
            }
            thumbnails.appendChild(thumbnail);
        }
        
        folder.appendChild(header);
        folder.appendChild(thumbnails);
        foldersContainer.appendChild(folder);
    });
}

// ============================================
// СОЗДАНИЕ НОВОГО ПРОЕКТА
// ============================================
let selectedPreviewFile = null;

function handlePreviewFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('Пожалуйста, выберите изображение');
        e.target.value = '';
        return;
    }
    
    selectedPreviewFile = file;
    
    // Показываем превью
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewContainer = document.getElementById('preview-image-container');
        const previewImage = document.getElementById('preview-image-preview');
        if (previewContainer && previewImage) {
            previewImage.src = e.target.result;
            previewContainer.style.display = 'block';
        }
        
        // Автоматически заполняем путь (для демонстрации)
        const previewPathInput = document.getElementById('new-project-preview');
        if (previewPathInput) {
            previewPathInput.value = `images/photos/${file.name}`;
        }
    };
    reader.readAsDataURL(file);
}

function removePreviewImage() {
    selectedPreviewFile = null;
    const previewContainer = document.getElementById('preview-image-container');
    const previewFileInput = document.getElementById('new-project-preview-file');
    const previewPathInput = document.getElementById('new-project-preview');
    
    if (previewContainer) {
        previewContainer.style.display = 'none';
    }
    if (previewFileInput) {
        previewFileInput.value = '';
    }
    if (previewPathInput) {
        previewPathInput.value = '';
    }
}

function openNewProjectModal() {
    const modal = document.getElementById('new-project-modal');
    if (modal) {
        // Очищаем поля формы
        document.getElementById('new-project-name').value = '';
        document.getElementById('new-project-id').value = '';
        document.getElementById('new-project-description').value = '';
        document.getElementById('new-project-preview').value = '';
        document.getElementById('new-project-preview-file').value = '';
        selectedPreviewFile = null;
        
        // Скрываем превью
        const previewContainer = document.getElementById('preview-image-container');
        if (previewContainer) {
            previewContainer.style.display = 'none';
        }
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeNewProjectModal() {
    const modal = document.getElementById('new-project-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function createNewProject() {
    const name = document.getElementById('new-project-name').value.trim();
    const id = document.getElementById('new-project-id').value.trim();
    const description = document.getElementById('new-project-description').value.trim();
    let preview = document.getElementById('new-project-preview').value.trim();
    
    // Если выбран файл, используем его путь
    if (selectedPreviewFile) {
        // Создаем путь относительно корня сайта
        // В реальном проекте здесь должна быть загрузка файла на сервер
        const fileName = selectedPreviewFile.name;
        // Предполагаем, что файл будет сохранен в images/photos/
        preview = `images/photos/${fileName}`;
        
        // В реальном проекте здесь нужно:
        // 1. Загрузить файл на сервер
        // 2. Получить путь к загруженному файлу
        // 3. Использовать этот путь
        // Показываем предупреждение только если путь не был указан вручную
        if (!document.getElementById('new-project-preview').value.trim()) {
            // alert('В текущей версии файл не загружается на сервер. Используйте путь вручную или настройте сервер для загрузки файлов.');
        }
    }
    
    // Валидация
    if (!name) {
        alert('Введите название проекта');
        return;
    }
    
    if (!id) {
        alert('Введите ID проекта');
        return;
    }
    
    // Проверка формата ID (только латиница, цифры, дефисы, подчеркивания)
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
        alert('ID проекта может содержать только латинские буквы, цифры, дефисы и подчеркивания');
        return;
    }
    
    // Проверка уникальности ID
    if (projectsData.some(p => p.id === id)) {
        alert('Проект с таким ID уже существует');
        return;
    }
    
    // Создаем новый проект
    const newProject = {
        id: id,
        name: name,
        description: description,
        folder: id,
        order: projectsData.length,
        previewImage: preview || 'images/photos/ComfyUI_00070_.png',
        photos: [],
        drawings: [],
        renders: [],
        carouselOrder: {
            photos: [],
            drawings: [],
            renders: []
        }
    };
    
    // Добавляем в массив
    projectsData.push(newProject);
    originalProjectsData = JSON.parse(JSON.stringify(projectsData));
    
    // Обновляем отображение
    loadCarouselImages();
    loadProjectsFolders();
    
    // Закрываем модалку
    closeNewProjectModal();
    
    // Показываем сообщение
    if (selectedPreviewFile) {
        alert('Проект создан! ВАЖНО: Файл изображения выбран, но не загружен на сервер. Скопируйте файл в папку images/photos/ вручную или настройте сервер для загрузки файлов.');
    } else {
        alert('Проект создан! Теперь вы можете добавить изображения в папки проекта.');
    }
    
    // Помечаем как измененный
    hasChanges = true;
    showChangesIndicator();
}

// ============================================
// МОДАЛКИ
// ============================================
function openImageModal(imagePath) {
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    if (modal && modalImage) {
        modalImage.src = imagePath;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeImageModal() {
    const modal = document.getElementById('image-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ============================================
// LOTTIE АНИМАЦИИ
// ============================================
function initLottieAnimations() {
    const lottieAnimation = document.getElementById('lottie-animation');
    if (lottieAnimation) {
        loadLottieAnimation(lottieAnimation, 'lottie/main-lottie.json');
    }
    
    const modalCloseLottie = document.getElementById('modal-close-lottie');
    if (modalCloseLottie) {
        loadLottieAnimation(modalCloseLottie, 'lottie/cat.json').then(anim => {
            if (anim) {
                modalCloseLottie.addEventListener('click', closeImageModal);
            }
        });
    }
}

function loadLottieAnimation(container, filePath) {
    if (!container) return Promise.resolve(null);
    if (window.location.protocol === 'file:') {
        return Promise.resolve(null);
    }
    return fetch(filePath)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        })
        .then(animationData => {
            if (typeof lottie === 'undefined') return null;
            return lottie.loadAnimation({
                container: container,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                animationData: animationData
            });
        })
        .catch(() => null);
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('Админка загружается...');
    
    // Проверяем наличие необходимых элементов
    const editBtn = document.getElementById('edit-mode-btn');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    
    if (!editBtn || !saveBtn || !cancelBtn) {
        console.error('Не найдены необходимые элементы управления');
        return;
    }
    
    // Загружаем данные проектов
    loadProjectsData();
    
    // Настраиваем обработчики событий
    const addProjectBtn = document.getElementById('add-project-btn');
    const createProjectBtn = document.getElementById('create-project-btn');
    const cancelCreateBtn = document.getElementById('cancel-create-btn');
    
    if (addProjectBtn) {
        addProjectBtn.addEventListener('click', openNewProjectModal);
    }
    if (createProjectBtn) {
        createProjectBtn.addEventListener('click', createNewProject);
    }
    if (cancelCreateBtn) {
        cancelCreateBtn.addEventListener('click', closeNewProjectModal);
    }
    
    // Обработчик выбора файла для превью
    const previewFileInput = document.getElementById('new-project-preview-file');
    if (previewFileInput) {
        previewFileInput.addEventListener('change', handlePreviewFileSelect);
    }
    
    // Обработчик удаления превью
    const removePreviewBtn = document.getElementById('remove-preview-btn');
    if (removePreviewBtn) {
        removePreviewBtn.addEventListener('click', removePreviewImage);
    }
    
    editBtn.addEventListener('click', toggleEditMode);
    saveBtn.addEventListener('click', saveChanges);
    cancelBtn.addEventListener('click', cancelChanges);
    
    const modal = document.getElementById('image-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeImageModal();
            }
        });
    }
    
    const newProjectModal = document.getElementById('new-project-modal');
    if (newProjectModal) {
        newProjectModal.addEventListener('click', (e) => {
            if (e.target === newProjectModal) {
                closeNewProjectModal();
            }
        });
    }
    
    const initLottieWhenReady = () => {
        if (typeof lottie !== 'undefined') {
            initLottieAnimations();
            return true;
        }
        return false;
    };
    
    if (!initLottieWhenReady()) {
        const checkLottie = setInterval(() => {
            if (initLottieWhenReady()) {
                clearInterval(checkLottie);
            }
        }, 100);
        setTimeout(() => clearInterval(checkLottie), 5000);
    }
    
    console.log('Админка инициализирована');
});

