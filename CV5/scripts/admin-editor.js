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
        // В режиме редактирования не делаем draggable, так как используется для замены изображения
        // Перетаскивание слайдов обрабатывается отдельно через setupDragAndDrop
        item.dataset.projectId = project.id;
        item.dataset.projectIndex = index;
        
        const img = document.createElement('img');
        img.src = project.previewImage || 'images/photos/ComfyUI_00070_.png';
        img.alt = project.name || `Project ${index + 1}`;
        img.onerror = function() {
            this.src = 'images/photos/ComfyUI_00070_.png';
        };
        
        // В админке не показываем кнопку "Подробнее"
        item.appendChild(img);
        
        if (isEditMode) {
            // В режиме редактирования - замена превью изображения
            item.style.cursor = 'pointer';
            item.title = 'Кликните для замены превью изображения';
            
            // Обработчик клика на картинку для замены (с приоритетом)
            img.style.cursor = 'pointer';
            img.title = 'Кликните для замены изображения';
            img.style.pointerEvents = 'auto';
            
            // Используем mousedown для более надежного срабатывания
            img.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
            
            img.addEventListener('click', (e) => {
                // Дополнительная проверка на случай, если mouseup не сработал
                // Но только если это не было перетаскивание
                if (!hasMoved && !e.defaultPrevented) {
                    e.stopPropagation();
                    e.preventDefault();
                    replaceProjectPreview(project.id, img);
                }
            }, true); // capture phase для приоритета
            
            // Также обрабатываем клик на весь элемент
            item.addEventListener('click', (e) => {
                // Если клик был на элементе (не на картинке напрямую)
                if (e.target === item) {
                    e.stopPropagation();
                    replaceProjectPreview(project.id, img);
                }
            });
        } else {
            // В обычном режиме - открытие модалки
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
        // Настраиваем прием проектов из футера в карусель
        setTimeout(() => {
            setupCarouselDropZone();
            // Обновляем подсветку после настройки
            setTimeout(() => {
                updateCarouselHighlight();
            }, 100);
        }, 300);
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
                // Настраиваем прием проектов из футера в карусель
                setTimeout(() => {
                    setupCarouselDropZone();
                }, 300);
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
                        if (this && this.wrapperEl && this.el) {
                            startCustomAutoScroll(this);
                        }
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
    
    if (!swiper || !swiper.wrapperEl || !swiper.el) {
        console.warn('Swiper не инициализирован для автопрокрутки');
        return;
    }
    
    const scrollSpeed = 0.5;
    const wrapper = swiper.wrapperEl;
    const container = swiper.el;
    
    if (!wrapper || !container) {
        console.warn('Элементы Swiper не найдены');
        return;
    }
    
    let currentX = savedCarouselPosition !== null ? savedCarouselPosition : getTransformX(wrapper);
    if (currentX === 0) currentX = carouselCurrentX;
    carouselCurrentX = currentX;
    if (savedCarouselPosition !== null) savedCarouselPosition = null;
    
    if (wrapper && wrapper.style) {
        wrapper.style.transform = `translateX(${currentX}px)`;
        wrapper.style.transition = 'none';
    }
    
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
        
        // Возобновляем автопрокрутку только если не в режиме редактирования
        if (carouselSwiper && !isEditMode && carouselSwiper.wrapperEl && carouselSwiper.el) {
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
            // Делаем перетаскиваемым весь слайд, но клик на картинку будет для замены
            // Перетаскивание работает при нажатии на область слайда (кроме клика на картинку)
            slide.draggable = true;
            slide.addEventListener('dragstart', handleDragStart);
            slide.addEventListener('dragover', handleDragOver);
            slide.addEventListener('drop', handleDrop);
            slide.addEventListener('dragend', handleDragEnd);
        }
    });
}

let draggedElement = null;
let draggedSlide = null;

function handleDragStart(e) {
    // Разрешаем перетаскивание слайдов всегда
    // Клик на картинку обрабатывается отдельно через обработчик click
    draggedElement = this;
    draggedSlide = this;
    if (draggedSlide) {
        draggedSlide.classList.add('dragging');
    }
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

// Настройка зоны приема проектов из футера в карусель
function setupCarouselDropZone() {
    const carouselTrack = document.getElementById('carousel-track');
    if (!carouselTrack) {
        console.error('carousel-track не найден для setupCarouselDropZone');
        return;
    }
    
    console.log('Настройка зоны приема проектов в карусель');
    
    // Используем существующий элемент
    const track = carouselTrack;
    
    // Обработчик dragover - разрешаем сброс
    track.addEventListener('dragover', (e) => {
        const dragSource = e.dataTransfer.getData('drag-source');
        // Разрешаем drop только если перетаскивается из футера
        if (dragSource === 'folder' || e.dataTransfer.types.includes('application/project')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            // Показываем визуальную индикацию места вставки
            const afterElement = getDragAfterSlide(track, e.clientX);
            const slides = Array.from(track.querySelectorAll('.swiper-slide'));
            
            // Убираем все индикаторы
            slides.forEach(slide => slide.classList.remove('drag-over'));
            
            if (afterElement) {
                afterElement.classList.add('drag-over');
            } else if (slides.length > 0) {
                slides[slides.length - 1].classList.add('drag-over');
            } else {
                // Если слайдов нет, показываем индикатор на самом треке
                track.style.border = '2px dashed #4CAF50';
            }
        }
    });
    
    // Обработчик drop - добавляем проект в карусель
    track.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Drop в карусель');
        
        // Убираем индикаторы
        track.querySelectorAll('.swiper-slide').forEach(slide => {
            slide.classList.remove('drag-over');
        });
        track.style.border = '';
        
        try {
            const dragSource = e.dataTransfer.getData('drag-source');
            const projectId = e.dataTransfer.getData('text/plain');
            const projectJson = e.dataTransfer.getData('application/project');
            
            console.log('Данные drop:', { dragSource, projectId, projectJson: projectJson ? 'есть' : 'нет' });
            
            // Проверяем, что это перетаскивание из футера
            if (dragSource !== 'folder' && !projectJson) {
                console.log('Это не перетаскивание из футера, игнорируем');
                return;
            }
            
            let project;
            if (projectJson) {
                try {
                    project = JSON.parse(projectJson);
                    console.log('Проект получен из JSON:', project.id, project.name);
                } catch (parseError) {
                    console.error('Ошибка парсинга JSON проекта:', parseError);
                    return;
                }
            } else if (projectId) {
                project = projectsData.find(p => p.id === projectId);
                console.log('Проект найден по ID:', project ? project.name : 'не найден');
            }
            
            if (!project) {
                console.error('Проект не найден');
                return;
            }
            
            // Проверяем, есть ли проект уже в карусели
            const existingSlide = track.querySelector(`.swiper-slide[data-project-id="${project.id}"]`);
            
            // Определяем позицию для вставки
            const afterElement = getDragAfterSlide(track, e.clientX);
            let insertPosition = 0;
            
            if (afterElement) {
                const allSlides = Array.from(track.querySelectorAll('.swiper-slide'));
                insertPosition = allSlides.indexOf(afterElement);
            } else {
                const allSlides = Array.from(track.querySelectorAll('.swiper-slide'));
                insertPosition = allSlides.length;
            }
            
            if (existingSlide) {
                console.log('Проект уже есть в карусели, перемещаем на позицию:', insertPosition);
                // Если проект уже есть, перемещаем его в новую позицию
                if (afterElement && afterElement !== existingSlide) {
                    track.insertBefore(existingSlide, afterElement);
                } else if (!afterElement) {
                    track.appendChild(existingSlide);
                }
            } else {
                console.log('Проекта нет в карусели, добавляем:', project.name, 'на позицию:', insertPosition);
                
                // Убеждаемся, что проект есть в projectsData
                let projectInData = projectsData.find(p => p.id === project.id);
                if (!projectInData) {
                    console.log('Проект не найден в projectsData, добавляем');
                    // Добавляем проект в projectsData
                    projectsData.push(project);
                    projectInData = project;
                }
                
                // Устанавливаем order для проекта
                const allSlides = Array.from(track.querySelectorAll('.swiper-slide'));
                const maxOrder = projectsData.length > 0 
                    ? Math.max(...projectsData.map(p => p.order || 0))
                    : -1;
                
                // Если order не установлен, устанавливаем его
                if (projectInData.order === undefined || projectInData.order === null) {
                    projectInData.order = maxOrder + 1;
                    console.log('Установлен order для проекта:', projectInData.order);
                }
                
                // Если проекта нет, добавляем его
                const slide = document.createElement('div');
                slide.className = 'swiper-slide';
                slide.dataset.projectId = project.id;
                
                const item = document.createElement('div');
                item.className = 'carousel-item';
                item.draggable = isEditMode;
                item.dataset.projectId = project.id;
                
                const img = document.createElement('img');
                img.src = project.previewImage || 'images/photos/ComfyUI_00070_.png';
                img.alt = project.name || 'Project';
                img.onerror = function() {
                    this.src = 'images/photos/ComfyUI_00070_.png';
                };
                
                // Обработчик клика для открытия модалки с кнопкой перехода на страницу проекта
                item.addEventListener('click', () => {
                    openProjectModal(project);
                });
                
                item.appendChild(img);
                slide.appendChild(item);
                
                // Вставляем в нужную позицию
                if (afterElement) {
                    track.insertBefore(slide, afterElement);
                } else {
                    track.appendChild(slide);
                }
                
                console.log('Проект добавлен в DOM карусели');
            }
            
            // Обновляем порядок проектов в данных
            // Обновляем порядок проектов в данных
            updateCarouselOrder();
            
            // Сохраняем изменения в localStorage
            try {
                const dataToSave = { projects: projectsData };
                localStorage.setItem('projectsData', JSON.stringify(dataToSave));
                console.log('Изменения сохранены в localStorage');
            } catch (e) {
                console.error('Ошибка сохранения в localStorage:', e);
            }
            
            // Помечаем как измененный
            hasChanges = true;
            showChangesIndicator();
            
            // Перезагружаем карусель полностью для обновления
            setTimeout(() => {
                loadCarouselImages();
                // Обновляем подсветку проектов в футере после загрузки карусели
                setTimeout(() => {
                    updateCarouselHighlight();
                }, 200);
            }, 100);
            
        } catch (error) {
            console.error('Ошибка при добавлении проекта в карусель:', error);
            alert('Ошибка при добавлении проекта: ' + error.message);
        }
    });
    
    // Обработчик dragleave - убираем индикаторы
    track.addEventListener('dragleave', (e) => {
        if (!track.contains(e.relatedTarget)) {
            track.querySelectorAll('.swiper-slide').forEach(slide => {
                slide.classList.remove('drag-over');
            });
            track.style.border = '';
        }
    });
    
    console.log('Зона приема проектов настроена');
}

// Функция для открытия модалки проекта с кнопкой перехода
function openProjectModal(project) {
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    if (!modal || !modalImage) return;
    
    modalImage.src = project.previewImage || 'images/photos/ComfyUI_00070_.png';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Проверяем, есть ли кнопка "Подробнее о проекте"
    let detailsButton = document.getElementById('modal-details-button');
    
    // Если это проект (есть ID), показываем кнопку "Подробнее о проекте"
    if (project && project.id) {
        if (!detailsButton) {
            detailsButton = document.createElement('button');
            detailsButton.id = 'modal-details-button';
            detailsButton.className = 'modal-details-button';
            detailsButton.textContent = 'Подробнее о проекте';
            modal.appendChild(detailsButton);
        }
        // Обновляем обработчик для текущего проекта
        detailsButton.onclick = () => {
            window.location.href = `project.html?id=${project.id}`;
        };
        detailsButton.style.display = 'block';
    } else {
        // Если это не проект, скрываем кнопку
        if (detailsButton) {
            detailsButton.style.display = 'none';
        }
    }
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
    
    // Получаем список проектов, которые уже в карусели
    const carouselTrack = document.getElementById('carousel-track');
    const projectsInCarousel = new Set();
    if (carouselTrack) {
        carouselTrack.querySelectorAll('.swiper-slide[data-project-id]').forEach(slide => {
            const projectId = slide.dataset.projectId;
            if (projectId) {
                projectsInCarousel.add(projectId);
            }
        });
    }
    
    projectsData.forEach(project => {
        const folder = document.createElement('div');
        folder.className = 'project-folder';
        folder.dataset.projectId = project.id;
        
        // Подсветка миниатюр будет добавлена через updateCarouselHighlight()
        
        const header = document.createElement('div');
        header.className = 'folder-header';
        
        const nameContainer = document.createElement('div');
        nameContainer.className = 'folder-name-container';
        
        const name = document.createElement('div');
        name.className = 'folder-name';
        name.textContent = project.name;
        name.dataset.projectId = project.id;
        name.style.cursor = 'pointer';
        name.title = 'Кликните для редактирования';
        name.onclick = (e) => {
            e.stopPropagation();
            enableProjectNameEdit(project.id, name, nameContainer);
        };
        
        nameContainer.appendChild(name);
        
        header.appendChild(nameContainer);
        
        // Кнопка удаления проекта (будет размещена правее миниатюры)
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'folder-delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Удалить проект';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm(`Вы уверены, что хотите удалить проект "${project.name}"? Это действие нельзя отменить.`)) {
                deleteProject(project.id);
            }
        };
        
        // Описание проекта
        const descriptionContainer = document.createElement('div');
        descriptionContainer.className = 'folder-description-container';
        
        const description = document.createElement('div');
        description.className = 'folder-description';
        description.textContent = project.description || 'Нет описания';
        description.dataset.projectId = project.id;
        description.style.cursor = 'pointer';
        description.title = 'Кликните для редактирования';
        description.onclick = (e) => {
            e.stopPropagation();
            enableProjectDescriptionEdit(project.id, description, descriptionContainer);
        };
        
        descriptionContainer.appendChild(description);
        
        // Контейнер для заголовка и описания (слева)
        const textContent = document.createElement('div');
        textContent.className = 'folder-text-content';
        textContent.appendChild(header);
        textContent.appendChild(descriptionContainer);
        
        // Миниатюра для перетаскивания (справа)
        const dragThumbnail = document.createElement('div');
        dragThumbnail.className = 'folder-drag-thumbnail';
        dragThumbnail.draggable = true;
        dragThumbnail.dataset.projectId = project.id;
        dragThumbnail.dataset.dragSource = 'folder';
        dragThumbnail.title = 'Кликните для замены изображения или перетащите в карусель';
        
        const thumbnailImg = document.createElement('img');
        thumbnailImg.src = project.previewImage || 'images/photos/ComfyUI_00070_.png';
        thumbnailImg.alt = project.name;
        thumbnailImg.style.cursor = 'pointer';
        thumbnailImg.title = 'Кликните для замены изображения';
        thumbnailImg.onerror = function() {
            this.src = 'images/photos/ComfyUI_00070_.png';
        };
        
        dragThumbnail.appendChild(thumbnailImg);
        
        // Обработчик клика на миниатюру для замены изображения
        let isClick = false;
        thumbnailImg.addEventListener('mousedown', (e) => {
            isClick = true;
            setTimeout(() => { isClick = false; }, 300);
        });
        
        thumbnailImg.addEventListener('click', (e) => {
            if (isClick) {
                e.stopPropagation();
                e.preventDefault();
                replaceProjectPreview(project.id, thumbnailImg);
            }
        }, true);
        
        // Обработчики drag and drop для перетаскивания из футера в карусель
        dragThumbnail.addEventListener('dragstart', (e) => {
            // Если это был клик (не перетаскивание), отменяем drag
            if (isClick && e.target === thumbnailImg) {
                e.preventDefault();
                return false;
            }
            
            console.log('Начато перетаскивание проекта из футера:', project.id, project.name);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', project.id);
            e.dataTransfer.setData('application/project', JSON.stringify(project));
            e.dataTransfer.setData('drag-source', 'folder');
            dragThumbnail.style.opacity = '0.5';
            dragThumbnail.classList.add('dragging');
            
            // Создаем визуальный элемент для перетаскивания
            const dragImage = thumbnailImg.cloneNode(true);
            dragImage.style.width = '150px';
            dragImage.style.height = '150px';
            dragImage.style.objectFit = 'cover';
            document.body.appendChild(dragImage);
            dragImage.style.position = 'absolute';
            dragImage.style.top = '-1000px';
            e.dataTransfer.setDragImage(dragImage, 75, 75);
            setTimeout(() => document.body.removeChild(dragImage), 0);
        });
        
        dragThumbnail.addEventListener('dragend', (e) => {
            dragThumbnail.style.opacity = '1';
            dragThumbnail.classList.remove('dragging');
        });
        
        // Контейнер для ячеек (drawings, photos, renders)
        const cellsContainer = document.createElement('div');
        cellsContainer.className = 'folder-cells';
        
        // Ячейка для чертежей
        const drawingsCell = createImageCell('Чертежи', project.drawings || [], project.id, 'drawings');
        cellsContainer.appendChild(drawingsCell);
        
        // Ячейка для фото
        const photosCell = createImageCell('Фото', project.photos || [], project.id, 'photos');
        cellsContainer.appendChild(photosCell);
        
        // Ячейка для рендеров
        const rendersCell = createImageCell('Рендеры', project.renders || [], project.id, 'renders');
        cellsContainer.appendChild(rendersCell);
        
        // Контейнер для миниатюры и кнопки удаления (справа)
        const rightContent = document.createElement('div');
        rightContent.className = 'folder-right-content';
        rightContent.appendChild(dragThumbnail);
        rightContent.appendChild(deleteBtn);
        
        // Основной контейнер с текстом и правым блоком
        const mainContent = document.createElement('div');
        mainContent.className = 'folder-main-content';
        mainContent.appendChild(textContent);
        mainContent.appendChild(rightContent);
        
        folder.appendChild(mainContent);
        folder.appendChild(cellsContainer);
        foldersContainer.appendChild(folder);
    });
    
    // Обновляем подсветку после загрузки карусели
    updateCarouselHighlight();
}

// Обновление подсветки проектов в футере, которые есть в карусели
function updateCarouselHighlight() {
    const carouselTrack = document.getElementById('carousel-track');
    if (!carouselTrack) return;
    
    const projectsInCarousel = new Set();
    carouselTrack.querySelectorAll('.swiper-slide[data-project-id]').forEach(slide => {
        const projectId = slide.dataset.projectId;
        if (projectId) {
            projectsInCarousel.add(projectId);
        }
    });
    
    // Обновляем подсветку миниатюр в футере (убираем класс с блоков проектов, добавляем к миниатюрам)
    document.querySelectorAll('.project-folder').forEach(folder => {
        folder.classList.remove('in-carousel');
    });
    
    document.querySelectorAll('.folder-drag-thumbnail').forEach(thumbnail => {
        const projectId = thumbnail.dataset.projectId;
        if (projectsInCarousel.has(projectId)) {
            thumbnail.classList.add('in-carousel');
        } else {
            thumbnail.classList.remove('in-carousel');
        }
    });
}

// Создание ячейки для изображений
function createImageCell(title, images, projectId, type) {
    const cell = document.createElement('div');
    cell.className = 'folder-cell';
    cell.dataset.projectId = projectId;
    cell.dataset.type = type;
    
    const cellHeader = document.createElement('div');
    cellHeader.className = 'cell-header';
    
    const headerTitle = document.createElement('span');
    headerTitle.className = 'cell-header-title';
    headerTitle.textContent = title;
    
    // Кнопка добавления изображения в заголовке
    const addBtn = document.createElement('button');
    addBtn.className = 'cell-add-btn-header';
    addBtn.innerHTML = '+';
    addBtn.title = 'Добавить изображение';
    addBtn.onclick = (e) => {
        e.stopPropagation();
        addImageToProject(projectId, type);
    };
    
    cellHeader.appendChild(headerTitle);
    cellHeader.appendChild(addBtn);
    
    const cellContent = document.createElement('div');
    cellContent.className = 'cell-content';
    
    // Показываем существующие изображения
    images.forEach((imagePath, index) => {
        if (!imagePath || imagePath.trim() === '') return; // Пропускаем пустые пути
        
        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'cell-image-wrapper';
        
        const img = document.createElement('img');
        img.src = imagePath;
        img.className = 'cell-image';
        img.alt = `${title} ${index + 1}`;
        img.onerror = function() {
            console.error('Ошибка загрузки изображения:', imagePath);
            this.style.display = 'none';
        };
        img.onload = function() {
            console.log('Изображение загружено успешно:', imagePath);
        };
        
        // Кнопка просмотра изображения
        const viewBtn = document.createElement('button');
        viewBtn.className = 'cell-image-view';
        viewBtn.innerHTML = '👁';
        viewBtn.title = 'Просмотреть изображение';
        viewBtn.onclick = (e) => {
            e.stopPropagation();
            openImageModal(imagePath);
        };
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'cell-image-remove';
        removeBtn.innerHTML = '🗑';
        removeBtn.title = 'Удалить изображение';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            removeImageFromProject(projectId, type, index);
        };
        
        imgWrapper.appendChild(img);
        imgWrapper.appendChild(viewBtn);
        imgWrapper.appendChild(removeBtn);
        cellContent.appendChild(imgWrapper);
    });
    
    cell.appendChild(cellHeader);
    cell.appendChild(cellContent);
    
    return cell;
}

// ============================================
// РАЗВЕРТЫВАНИЕ ИЗМЕНЕНИЙ
// ============================================

// Функция для экранирования HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Функция для скачивания файла
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Функция для генерации HTML страницы проекта
function generateProjectHTML(project) {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(project.name)} - Calipso Design</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
    <link rel="stylesheet" href="styles/main.css">
    <link rel="stylesheet" href="styles/project.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"></script>
</head>
<body>
    <div class="project-page">
        <!-- Хедер проекта -->
        <header class="project-header" id="project-header">
            <h1 class="project-title" id="project-title">${escapeHtml(project.name)}</h1>
            <div class="header-buttons">
                <button class="back-button" onclick="window.location.href='index.html'">← Назад</button>
            </div>
        </header>

        <!-- Блок описания -->
        <section class="project-description-section">
            <div class="description-content" id="project-description">
                ${escapeHtml(project.description || '')}
            </div>
        </section>

        <!-- Блок с синхронной каруселью сравнения -->
        <section class="comparison-section">
            <div class="comparison-carousels">
                <!-- Карусель чертежей -->
                <div class="comparison-carousel-wrapper">
                    <h3 class="carousel-label">Чертежи</h3>
                    <div class="swiper comparison-swiper" id="drawings-swiper">
                        <div class="swiper-wrapper" id="drawings-wrapper">
                            <!-- Загружается через JS -->
                        </div>
                    </div>
                </div>

                <!-- Карусель фото -->
                <div class="comparison-carousel-wrapper">
                    <h3 class="carousel-label">Фото</h3>
                    <div class="swiper comparison-swiper" id="photos-swiper">
                        <div class="swiper-wrapper" id="photos-wrapper">
                            <!-- Загружается через JS -->
                        </div>
                    </div>
                </div>

                <!-- Карусель рендеров -->
                <div class="comparison-carousel-wrapper">
                    <h3 class="carousel-label">Рендеры</h3>
                    <div class="swiper comparison-swiper" id="renders-swiper">
                        <div class="swiper-wrapper" id="renders-wrapper">
                            <!-- Загружается через JS -->
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>

    <!-- Модалка для увеличения изображений -->
    <div class="modal" id="image-modal">
        <div class="modal-content image-modal-content">
            <div class="modal-close-lottie" id="modal-close-lottie"></div>
            <img class="modal-image" id="modal-image" src="" alt="">
        </div>
    </div>

    <script>
        // Данные проекта
        const projectData = ${JSON.stringify(project)};
        
        // Загрузка данных и инициализация каруселей
        let drawingsSwiper = null;
        let photosSwiper = null;
        let rendersSwiper = null;

        function loadCarousel(swiperId, wrapperId, images, order) {
            const wrapper = document.getElementById(wrapperId);
            if (!wrapper) return;
            
            wrapper.innerHTML = '';
            
            const sortedImages = order ? order.map(i => images[i]).filter(Boolean) : images;
            
            sortedImages.forEach((imagePath) => {
                if (!imagePath || imagePath.trim() === '') return;
                
                const slide = document.createElement('div');
                slide.className = 'swiper-slide';
                
                const img = document.createElement('img');
                img.src = imagePath;
                img.alt = '';
                img.onclick = () => openImageModal(imagePath);
                
                slide.appendChild(img);
                wrapper.appendChild(slide);
            });
        }

        function initSynchronizedCarousels() {
            const drawings = projectData.drawings || [];
            const photos = projectData.photos || [];
            const renders = projectData.renders || [];
            
            const carouselOrder = projectData.carouselOrder || {};
            
            loadCarousel('drawings-swiper', 'drawings-wrapper', drawings, carouselOrder.drawings);
            loadCarousel('photos-swiper', 'photos-wrapper', photos, carouselOrder.photos);
            loadCarousel('renders-swiper', 'renders-wrapper', renders, carouselOrder.renders);
            
            drawingsSwiper = new Swiper('#drawings-swiper', {
                slidesPerView: 'auto',
                spaceBetween: 20,
                freeMode: true,
                watchSlidesProgress: true,
            });
            
            photosSwiper = new Swiper('#photos-swiper', {
                slidesPerView: 'auto',
                spaceBetween: 20,
                freeMode: true,
                watchSlidesProgress: true,
            });
            
            rendersSwiper = new Swiper('#renders-swiper', {
                slidesPerView: 'auto',
                spaceBetween: 20,
                freeMode: true,
                watchSlidesProgress: true,
            });
            
            // Синхронизация
            [drawingsSwiper, photosSwiper, rendersSwiper].forEach(swiper => {
                if (swiper) {
                    swiper.on('slideChange', () => {
                        syncCarousels();
                    });
                }
            });
        }

        function syncCarousels() {
            if (!photosSwiper || !drawingsSwiper || !rendersSwiper) return;
            
            const activeIndex = photosSwiper.activeIndex;
            drawingsSwiper.slideTo(activeIndex);
            rendersSwiper.slideTo(activeIndex);
        }

        function openImageModal(imagePath) {
            const modal = document.getElementById('image-modal');
            const modalImage = document.getElementById('modal-image');
            if (modal && modalImage) {
                modalImage.src = imagePath;
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }
        }

        function closeImageModal() {
            const modal = document.getElementById('image-modal');
            if (modal) {
                modal.style.display = 'none';
                document.body.style.overflow = '';
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            initSynchronizedCarousels();
            
            const modal = document.getElementById('image-modal');
            const modalClose = document.getElementById('modal-close-lottie');
            
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        closeImageModal();
                    }
                });
            }
            
            if (modalClose) {
                modalClose.addEventListener('click', closeImageModal);
            }
        });
    </script>
</body>
</html>`;
}

// Функция развертывания изменений
async function deployChanges() {
    try {
        // Показываем индикатор сохранения
        const savingIndicator = document.getElementById('saving-indicator');
        if (savingIndicator) {
            savingIndicator.textContent = 'Подготовка файлов для развертывания...';
            savingIndicator.classList.add('show');
        }
        
        // Сортируем проекты по order
        const sortedProjects = [...projectsData].sort((a, b) => (a.order || 0) - (b.order || 0));
        
        // Обновляем projectsData с отсортированными проектами
        projectsData = sortedProjects;
        
        // Сохраняем в localStorage
        localStorage.setItem('projectsData', JSON.stringify({ projects: projectsData }));
        
        // Генерируем и скачиваем projects.json
        const projectsJson = JSON.stringify({ projects: projectsData }, null, 2);
        downloadFile(projectsJson, 'projects.json', 'application/json');
        
        // Небольшая задержка перед скачиванием HTML файлов
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Генерируем и скачиваем HTML файлы для каждого проекта
        for (let i = 0; i < projectsData.length; i++) {
            const project = projectsData[i];
            const htmlContent = generateProjectHTML(project);
            const filename = `project-${project.id}.html`;
            downloadFile(htmlContent, filename, 'text/html');
            
            // Небольшая задержка между скачиваниями
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        // Загружаем старые проекты для определения удаленных
        let oldProjects = [];
        try {
            const response = await fetch('data/projects.json');
            const oldData = await response.json();
            oldProjects = oldData.projects || [];
        } catch (e) {
            console.log('Не удалось загрузить старые проекты для сравнения');
        }
        
        // Определяем удаленные проекты
        const currentProjectIds = new Set(projectsData.map(p => p.id));
        const deletedProjects = oldProjects.filter(p => !currentProjectIds.has(p.id));
        
        // Скрываем индикатор
        if (savingIndicator) {
            savingIndicator.classList.remove('show');
        }
        
        // Показываем информацию о развертывании
        let message = 'Файлы готовы для развертывания!\\n\\n';
        message += 'Скачанные файлы:\\n';
        message += '1. projects.json - замените файл data/projects.json\\n';
        message += `2. HTML файлы проектов (${projectsData.length} файлов)\\n`;
        message += '   - Переместите их в корневую папку проекта\\n';
        message += '   - Переименуйте project-{id}.html в project.html или создайте символические ссылки\\n\\n';
        
        if (deletedProjects.length > 0) {
            message += 'УДАЛЕННЫЕ ПРОЕКТЫ (нужно удалить вручную):\\n';
            deletedProjects.forEach(project => {
                message += `- project-${project.id}.html\\n`;
                if (project.folder) {
                    message += `- Папка: ${project.folder}\\n`;
                }
            });
            message += '\\n';
        }
        
        message += 'После замены файлов обновите страницу сайта.';
        
        alert(message);
        
        console.log('Развертывание завершено успешно');
    } catch (error) {
        console.error('Ошибка при развертывании:', error);
        alert('Ошибка при развертывании: ' + error.message);
        
        const savingIndicator = document.getElementById('saving-indicator');
        if (savingIndicator) {
            savingIndicator.classList.remove('show');
        }
    }
}

// Удаление проекта
function deleteProject(projectId) {
    // Удаляем проект из данных
    projectsData = projectsData.filter(p => p.id !== projectId);
    
    // Сохраняем изменения
    localStorage.setItem('projectsData', JSON.stringify({ projects: projectsData }));
    
    // Обновляем интерфейс
    loadProjectsFolders();
    loadCarouselImages();
    // Обновляем подсветку после загрузки
    setTimeout(() => {
        updateCarouselHighlight();
    }, 500);
    
    // Показываем индикатор сохранения
    const indicator = createSavingIndicator();
    setTimeout(() => {
        indicator.remove();
    }, 2000);
}

// Сжатие изображения
function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Вычисляем новые размеры с сохранением пропорций
                if (width > height) {
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Конвертируем в base64 с качеством
                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedDataUrl);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Добавление изображения в проект
function addImageToProject(projectId, type) {
    console.log('Добавление изображения в проект:', projectId, type);
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
            console.log('Файл не выбран');
            return;
        }
        
        // Проверяем размер файла (больше 5 МБ - предупреждаем)
        if (file.size > 5 * 1024 * 1024) {
            if (!confirm('Файл очень большой (' + Math.round(file.size / 1024 / 1024) + ' МБ). Он будет сжат. Продолжить?')) {
                return;
            }
        }
        
        console.log('Выбран файл:', file.name, file.type, Math.round(file.size / 1024), 'КБ');
        
        try {
            // Показываем индикатор загрузки
            const indicator = createSavingIndicator();
            indicator.textContent = 'Сжатие изображения...';
            indicator.classList.add('show');
            
            // Сжимаем изображение
            const compressedImagePath = await compressImage(file, 800, 800, 0.7);
            
            console.log('Изображение сжато. Размер data URL:', Math.round(compressedImagePath.length / 1024), 'КБ');
            
            // Находим проект
            const project = projectsData.find(p => p.id === projectId);
            if (!project) {
                console.error('Проект не найден:', projectId);
                indicator.remove();
                alert('Проект не найден!');
                return;
            }
            
            // Добавляем изображение в соответствующий массив
            if (!project[type]) {
                project[type] = [];
            }
            project[type].push(compressedImagePath);
            
            console.log('Изображение добавлено. Всего изображений типа', type, ':', project[type].length);
            
            // Автоматически сохраняем изменения в localStorage
            try {
                const dataToSave = { projects: projectsData };
                const dataString = JSON.stringify(dataToSave);
                const dataSize = new Blob([dataString]).size;
                console.log('Размер данных для сохранения:', Math.round(dataSize / 1024), 'КБ');
                
                // Проверяем размер (localStorage обычно ограничен 5-10 МБ)
                if (dataSize > 4 * 1024 * 1024) {
                    indicator.remove();
                    alert('Данные слишком большие (' + Math.round(dataSize / 1024 / 1024) + ' МБ). Удалите некоторые изображения или используйте меньшие файлы.');
                    project[type].pop(); // Удаляем последнее добавленное изображение
                    return;
                }
                
                localStorage.setItem('projectsData', dataString);
                console.log('Изображение автоматически сохранено в папку проекта');
                
                indicator.textContent = 'Изображение добавлено и сохранено!';
                setTimeout(() => {
                    indicator.remove();
                }, 2000);
            } catch (error) {
                console.error('Ошибка сохранения в localStorage:', error);
                indicator.remove();
                if (error.name === 'QuotaExceededError') {
                    alert('Недостаточно места в хранилище. Удалите некоторые изображения или используйте меньшие файлы.');
                } else {
                    alert('Ошибка сохранения: ' + error.message);
                }
                project[type].pop(); // Удаляем последнее добавленное изображение
                return;
            }
            
            // Обновляем интерфейс
            loadProjectsFolders();
            loadCarouselImages();
            // Обновляем подсветку после загрузки
            setTimeout(() => {
                updateCarouselHighlight();
            }, 500);
        } catch (error) {
            console.error('Ошибка обработки изображения:', error);
            alert('Ошибка при обработке файла: ' + error.message);
        }
    };
    input.click();
}

// Удаление изображения из проекта
function removeImageFromProject(projectId, type, index) {
    const project = projectsData.find(p => p.id === projectId);
    if (!project || !project[type]) return;
    
    project[type].splice(index, 1);
    
    // Сохраняем изменения
    localStorage.setItem('projectsData', JSON.stringify({ projects: projectsData }));
    
    // Обновляем интерфейс
    loadProjectsFolders();
    loadCarouselImages();
    // Обновляем подсветку после загрузки
    setTimeout(() => {
        updateCarouselHighlight();
    }, 500);
}

// Включение режима редактирования имени проекта
function enableProjectNameEdit(projectId, nameElement, nameContainer) {
    const project = projectsData.find(p => p.id === projectId);
    if (!project) return;
    
    const currentName = project.name;
    
    // Создаем input для редактирования
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'folder-name-input';
    input.value = currentName;
    input.style.width = '100%';
    input.style.padding = '2px 4px';
    input.style.fontSize = '0.9rem';
    input.style.fontWeight = '600';
    input.style.border = '1px solid rgba(0, 0, 0, 0.3)';
    input.style.borderRadius = '4px';
    
    // Кнопка сохранения
    const saveBtn = document.createElement('button');
    saveBtn.className = 'folder-name-save-btn';
    saveBtn.innerHTML = '✓';
    saveBtn.title = 'Сохранить';
    saveBtn.onclick = (e) => {
        e.stopPropagation();
        saveProjectName(projectId, input.value.trim(), nameContainer, nameElement);
    };
    
    // Кнопка отмены
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'folder-name-cancel-btn';
    cancelBtn.innerHTML = '×';
    cancelBtn.title = 'Отмена';
    cancelBtn.onclick = (e) => {
        e.stopPropagation();
        cancelProjectNameEdit(nameContainer, nameElement);
    };
    
    // Заменяем содержимое контейнера
    nameContainer.innerHTML = '';
    nameContainer.appendChild(input);
    nameContainer.appendChild(saveBtn);
    nameContainer.appendChild(cancelBtn);
    
    // Фокус на input
    input.focus();
    input.select();
    
    // Сохраняем при нажатии Enter
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveProjectName(projectId, input.value.trim(), nameContainer, nameElement);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelProjectNameEdit(nameContainer, nameElement);
        }
    });
}

// Сохранение имени проекта
function saveProjectName(projectId, newName, nameContainer, nameElement) {
    if (!newName || newName.trim() === '') {
        alert('Название проекта не может быть пустым');
        return;
    }
    
    const project = projectsData.find(p => p.id === projectId);
    if (!project) return;
    
    project.name = newName;
    
    // Сохраняем изменения
    localStorage.setItem('projectsData', JSON.stringify({ projects: projectsData }));
    
    // Восстанавливаем обычный вид
    nameElement.textContent = newName;
    nameElement.style.cursor = 'pointer';
    nameElement.title = 'Кликните для редактирования';
    nameElement.onclick = (e) => {
        e.stopPropagation();
        enableProjectNameEdit(projectId, nameElement, nameContainer);
    };
    nameContainer.innerHTML = '';
    nameContainer.appendChild(nameElement);
    
    // Обновляем интерфейс
    loadCarouselImages();
}

// Отмена редактирования имени проекта
function cancelProjectNameEdit(nameContainer, nameElement) {
    const projectId = nameElement.dataset.projectId;
    const project = projectsData.find(p => p.id === projectId);
    if (!project) return;
    
    // Восстанавливаем обычный вид
    nameElement.textContent = project.name;
    nameElement.style.cursor = 'pointer';
    nameElement.title = 'Кликните для редактирования';
    nameElement.onclick = (e) => {
        e.stopPropagation();
        enableProjectNameEdit(projectId, nameElement, nameContainer);
    };
    nameContainer.innerHTML = '';
    nameContainer.appendChild(nameElement);
}

// Включение режима редактирования описания проекта
function enableProjectDescriptionEdit(projectId, descriptionElement, descriptionContainer) {
    const project = projectsData.find(p => p.id === projectId);
    if (!project) return;
    
    const currentDescription = project.description || '';
    
    // Создаем textarea для редактирования
    const textarea = document.createElement('textarea');
    textarea.className = 'folder-description-input';
    textarea.value = currentDescription;
    textarea.rows = 3;
    textarea.style.width = '100%';
    textarea.style.padding = '4px';
    textarea.style.fontSize = '0.8rem';
    textarea.style.border = '1px solid rgba(0, 0, 0, 0.3)';
    textarea.style.borderRadius = '4px';
    textarea.style.fontFamily = 'inherit';
    textarea.style.resize = 'vertical';
    
    // Кнопка сохранения
    const saveBtn = document.createElement('button');
    saveBtn.className = 'folder-desc-save-btn';
    saveBtn.innerHTML = '✓';
    saveBtn.title = 'Сохранить';
    saveBtn.onclick = (e) => {
        e.stopPropagation();
        saveProjectDescription(projectId, textarea.value.trim(), descriptionContainer, descriptionElement);
    };
    
    // Кнопка отмены
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'folder-desc-cancel-btn';
    cancelBtn.innerHTML = '×';
    cancelBtn.title = 'Отмена';
    cancelBtn.onclick = (e) => {
        e.stopPropagation();
        cancelProjectDescriptionEdit(descriptionContainer, descriptionElement);
    };
    
    // Контейнер для кнопок
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'folder-desc-buttons';
    buttonsContainer.appendChild(saveBtn);
    buttonsContainer.appendChild(cancelBtn);
    
    // Заменяем содержимое контейнера
    descriptionContainer.innerHTML = '';
    descriptionContainer.appendChild(textarea);
    descriptionContainer.appendChild(buttonsContainer);
    
    // Фокус на textarea
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

// Сохранение описания проекта
function saveProjectDescription(projectId, newDescription, descriptionContainer, descriptionElement) {
    const project = projectsData.find(p => p.id === projectId);
    if (!project) return;
    
    project.description = newDescription;
    
    // Сохраняем изменения
    localStorage.setItem('projectsData', JSON.stringify({ projects: projectsData }));
    
    // Восстанавливаем обычный вид
    descriptionElement.textContent = newDescription || 'Нет описания';
    descriptionElement.style.cursor = 'pointer';
    descriptionElement.title = 'Кликните для редактирования';
    descriptionElement.onclick = (e) => {
        e.stopPropagation();
        enableProjectDescriptionEdit(projectId, descriptionElement, descriptionContainer);
    };
    descriptionContainer.innerHTML = '';
    descriptionContainer.appendChild(descriptionElement);
    
    // Обновляем интерфейс
    loadCarouselImages();
}

// Отмена редактирования описания проекта
function cancelProjectDescriptionEdit(descriptionContainer, descriptionElement) {
    const projectId = descriptionElement.dataset.projectId;
    const project = projectsData.find(p => p.id === projectId);
    if (!project) return;
    
    // Восстанавливаем обычный вид
    descriptionElement.textContent = project.description || 'Нет описания';
    descriptionElement.style.cursor = 'pointer';
    descriptionElement.title = 'Кликните для редактирования';
    descriptionElement.onclick = (e) => {
        e.stopPropagation();
        enableProjectDescriptionEdit(projectId, descriptionElement, descriptionContainer);
    };
    descriptionContainer.innerHTML = '';
    descriptionContainer.appendChild(descriptionElement);
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

async function createNewProject() {
    const name = document.getElementById('new-project-name').value.trim();
    const id = document.getElementById('new-project-id').value.trim();
    const description = document.getElementById('new-project-description').value.trim();
    let preview = document.getElementById('new-project-preview').value.trim();
    
    // Если выбран файл, сжимаем его и сохраняем как base64
    if (selectedPreviewFile) {
        try {
            // Показываем индикатор загрузки
            const indicator = document.createElement('div');
            indicator.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px 30px; border-radius: 8px; z-index: 10000;';
            indicator.textContent = 'Обработка изображения...';
            document.body.appendChild(indicator);
            
            // Сжимаем изображение
            const compressedImagePath = await compressImage(selectedPreviewFile, 800, 800, 0.7);
            preview = compressedImagePath;
            
            indicator.textContent = 'Изображение обработано!';
            setTimeout(() => {
                indicator.remove();
            }, 1000);
        } catch (error) {
            console.error('Ошибка обработки изображения:', error);
            alert('Ошибка при обработке изображения: ' + error.message);
            return;
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
    
    // Автоматически сохраняем в localStorage
    try {
        const dataToSave = { projects: projectsData };
        localStorage.setItem('projectsData', JSON.stringify(dataToSave));
        console.log('Проект автоматически сохранен в localStorage');
    } catch (error) {
        console.error('Ошибка автоматического сохранения:', error);
        alert('Ошибка сохранения: ' + error.message);
        return;
    }
    
    // Обновляем отображение
    loadCarouselImages();
    loadProjectsFolders();
    // Обновляем подсветку после загрузки
    setTimeout(() => {
        updateCarouselHighlight();
    }, 500);
    
    // Закрываем модалку
    closeNewProjectModal();
    
    // Показываем сообщение об успешном создании
    const indicator = createSavingIndicator();
    indicator.textContent = 'Проект создан и сохранен! Папки для изображений готовы.';
    indicator.classList.add('show');
    setTimeout(() => {
        indicator.remove();
    }, 3000);
    
    // Помечаем как измененный (хотя уже сохранено)
    hasChanges = false;
    hideChangesIndicator();
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

// Замена превью изображения проекта
function replaceProjectPreview(projectId, imgElement) {
    const project = projectsData.find(p => p.id === projectId);
    if (!project) {
        alert('Проект не найден!');
        return;
    }
    
    // Создаем скрытый input для выбора файла
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            alert('Пожалуйста, выберите изображение');
            return;
        }
        
        try {
            // Показываем индикатор загрузки
            const indicator = createSavingIndicator();
            indicator.classList.add('show');
            indicator.textContent = 'Обработка изображения...';
            
            // Сжимаем изображение
            const compressedImagePath = await compressImage(file, 800, 800, 0.7);
            
            console.log('Изображение сжато. Размер data URL:', Math.round(compressedImagePath.length / 1024), 'КБ');
            
            // Обновляем превью изображение проекта
            project.previewImage = compressedImagePath;
            
            // Обновляем изображение в карусели (все слайды с этим проектом)
            const carouselImages = document.querySelectorAll(`.carousel-item[data-project-id="${projectId}"] img, .swiper-slide[data-project-id="${projectId}"] img`);
            carouselImages.forEach(carouselImg => {
                carouselImg.src = compressedImagePath;
            });
            
            // Если передан конкретный элемент, обновляем его тоже
            if (imgElement) {
                imgElement.src = compressedImagePath;
            }
            
            // Обновляем миниатюру в футере
            const dragThumbnail = document.querySelector(`.folder-drag-thumbnail[data-project-id="${projectId}"] img`);
            if (dragThumbnail) {
                dragThumbnail.src = compressedImagePath;
            }
            
            // Сохраняем изменения
            try {
                const dataToSave = { projects: projectsData };
                localStorage.setItem('projectsData', JSON.stringify(dataToSave));
                console.log('Превью изображение обновлено и сохранено');
            } catch (error) {
                console.error('Ошибка сохранения:', error);
                alert('Ошибка сохранения: ' + error.message);
            }
            
            // Помечаем как измененный
            hasChanges = true;
            showChangesIndicator();
            
            indicator.textContent = 'Превью изображение обновлено!';
            setTimeout(() => {
                indicator.remove();
            }, 2000);
            
        } catch (error) {
            console.error('Ошибка обработки изображения:', error);
            alert('Ошибка при обработке файла: ' + error.message);
        }
        
        // Удаляем input
        document.body.removeChild(fileInput);
    });
    
    // Добавляем input в DOM и запускаем выбор файла
    document.body.appendChild(fileInput);
    fileInput.click();
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
// ИЗМЕНЕНИЕ РАЗМЕРА ФУТЕРА
// ============================================
function setupFooterResize() {
    const footer = document.getElementById('admin-footer');
    const resizeHandle = document.getElementById('footer-resize-handle');
    const videoContainer = document.querySelector('.video-lottie-container');
    const carouselContainer = document.querySelector('.admin-carousel-container');
    
    if (!footer || !resizeHandle || !videoContainer) {
        console.error('Элементы для изменения размера не найдены');
        return;
    }
    
    console.log('Настройка изменения размера футера...');
    
    // Убеждаемся, что ручка видна
    resizeHandle.style.display = 'block';
    resizeHandle.style.position = 'absolute';
    resizeHandle.style.top = '0';
    resizeHandle.style.left = '0';
    resizeHandle.style.right = '0';
    resizeHandle.style.height = '20px';
    resizeHandle.style.zIndex = '10000';
    resizeHandle.style.cursor = 'ns-resize';
    resizeHandle.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
    resizeHandle.style.pointerEvents = 'auto';
    
    let isResizing = false;
    let startY = 0;
    let startFooterHeight = 0;
    let startVideoHeight = 0;
    
    // Функция начала изменения размера
    const startResizing = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        isResizing = true;
        startY = e.clientY;
        
        // Получаем текущие высоты
        const footerComputed = window.getComputedStyle(footer);
        startFooterHeight = parseInt(footerComputed.height, 10) || parseInt(footerComputed.minHeight, 10) || 200;
        
        const videoComputed = window.getComputedStyle(videoContainer);
        startVideoHeight = parseInt(videoComputed.height, 10) || window.innerHeight * 0.8;
        
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
        
        // Обработчик движения мыши
        const handleMouseMove = (moveEvent) => {
            if (!isResizing) return;
            
            moveEvent.preventDefault();
            const currentY = moveEvent.clientY;
            const deltaY = startY - currentY; // Положительное значение = тянем вверх (увеличиваем футер)
            
            // Новая высота футера
            const newFooterHeight = startFooterHeight + deltaY;
            
            // Ограничиваем размеры футера
            const minFooterHeight = 200;
            const maxFooterHeight = window.innerHeight * 0.8;
            
            if (newFooterHeight >= minFooterHeight && newFooterHeight <= maxFooterHeight) {
                // Устанавливаем новую высоту футера
                footer.style.setProperty('height', newFooterHeight + 'px', 'important');
                footer.style.setProperty('min-height', newFooterHeight + 'px', 'important');
                footer.style.setProperty('max-height', newFooterHeight + 'px', 'important');
                
                // Вычисляем новую высоту видео-контейнера
                // Общая высота = 100vh, нужно вычесть высоту футера и карусели
                let carouselHeight = 0;
                if (carouselContainer) {
                    const carouselComputed = window.getComputedStyle(carouselContainer);
                    carouselHeight = parseInt(carouselComputed.height, 10) || 
                                   parseInt(carouselComputed.minHeight, 10) || 0;
                }
                const newVideoHeight = window.innerHeight - newFooterHeight - carouselHeight;
                
                // Устанавливаем новую высоту видео-контейнера
                if (newVideoHeight > 0) {
                    videoContainer.style.setProperty('height', newVideoHeight + 'px', 'important');
                    videoContainer.style.setProperty('min-height', newVideoHeight + 'px', 'important');
                }
            }
        };
        
        // Обработчик окончания изменения размера
        const handleMouseUp = () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                
                // Сохраняем высоту футера в localStorage
                const finalHeight = footer.style.height;
                localStorage.setItem('adminFooterHeight', finalHeight);
                
                // Удаляем обработчики
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            }
        };
        
        // Добавляем обработчики на window
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };
    
    // Привязываем обработчик к ручке
    resizeHandle.addEventListener('mousedown', startResizing);
    
    resizeHandle.addEventListener('mouseenter', () => {
        resizeHandle.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
    });
    
    resizeHandle.addEventListener('mouseleave', () => {
        if (!isResizing) {
            resizeHandle.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
        }
    });
    
    // Функция применения сохраненной высоты
    const applySavedHeight = () => {
        const savedHeight = localStorage.getItem('adminFooterHeight');
        if (savedHeight) {
            const footerHeight = parseInt(savedHeight, 10);
            footer.style.setProperty('height', savedHeight, 'important');
            footer.style.setProperty('min-height', savedHeight, 'important');
            footer.style.setProperty('max-height', savedHeight, 'important');
            
            // Пересчитываем высоту видео-контейнера
            const carouselHeight = carouselContainer ? parseInt(window.getComputedStyle(carouselContainer).height, 10) || 0 : 0;
            const videoHeight = window.innerHeight - footerHeight - carouselHeight;
            
            if (videoHeight > 0) {
                videoContainer.style.setProperty('height', videoHeight + 'px', 'important');
                videoContainer.style.setProperty('min-height', videoHeight + 'px', 'important');
            }
        }
    };
    
    // Загружаем сохраненную высоту
    applySavedHeight();
    
    console.log('Изменение размера футера настроено');
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
    
    // Обработчик кнопки "Залить изменения на сайт"
    const deployBtn = document.getElementById('deploy-btn');
    if (deployBtn) {
        deployBtn.addEventListener('click', deployChanges);
    }
    
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
    
    // Настраиваем изменение размера футера
    setupFooterResize();
    
    console.log('Админка инициализирована');
});

