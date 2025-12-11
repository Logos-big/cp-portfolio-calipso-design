// Получаем ID проекта из URL
const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('id');

let projectData = null;
let projectsData = [];
let drawingsImages = [];
let photosImages = [];
let rendersImages = [];

// Загрузка данных проекта
async function loadProjectData() {
    try {
        // Сначала проверяем localStorage
        const savedData = localStorage.getItem('projectsData');
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                if (parsedData.projects) {
                    projectsData = parsedData.projects;
                }
            } catch (e) {
                console.log('Ошибка парсинга данных из localStorage');
            }
        }
        
        // Если нет в localStorage, загружаем из файла
        if (projectsData.length === 0) {
            const response = await fetch('data/projects.json');
            const data = await response.json();
            projectsData = data.projects || [];
        }
        
        projectData = projectsData.find(p => p.id === projectId);
        
        if (!projectData) {
            console.error('Проект не найден');
            return;
        }
        
        // Обновляем заголовок и описание
        document.getElementById('project-title').textContent = projectData.name;
        document.getElementById('project-description').textContent = projectData.description || '';
        
        // Загружаем изображения
        drawingsImages = projectData.drawings || [];
        photosImages = projectData.photos || [];
        rendersImages = projectData.renders || [];
        
        // Загружаем все изображения в колонны
        loadComparisonColumns();
    } catch (error) {
        console.error('Ошибка загрузки данных проекта:', error);
    }
}

// Загрузка всех изображений в колонны
function loadComparisonColumns() {
    // Загружаем чертежи
    loadColumn('drawings-column', drawingsImages);
    
    // Загружаем фото
    loadColumn('photos-column', photosImages);
    
    // Загружаем рендеры
    loadColumn('renders-column', rendersImages);
}

// Загрузка изображений в колонну
function loadColumn(columnId, images) {
    const column = document.getElementById(columnId);
    if (!column) return;
    
    column.innerHTML = '';
    
    if (images.length === 0) {
        return;
    }
    
    images.forEach((imagePath) => {
        if (!imagePath || imagePath.trim() === '') return;
        
        const imageContainer = document.createElement('div');
        imageContainer.className = 'comparison-image-container';
        
        const img = document.createElement('img');
        img.className = 'comparison-image';
        img.src = imagePath;
        img.alt = '';
        img.onerror = function() {
            this.src = 'images/photos/ComfyUI_00070_.png';
        };
        
        // Определяем категорию по ID колонки
        let category = null;
        if (columnId === 'drawings-column') {
            category = 'drawings';
        } else if (columnId === 'photos-column') {
            category = 'photos';
        } else if (columnId === 'renders-column') {
            category = 'renders';
        }
        
        img.addEventListener('click', () => openImageModal(imagePath, category));
        
        imageContainer.appendChild(img);
        column.appendChild(imageContainer);
    });
}

// Открытие модалки с изображением
function openImageModal(imagePath, category = null) {
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    
    if (modal && modalImage) {
        modalImage.src = imagePath;
        modal.dataset.currentImagePath = imagePath;
        modal.dataset.category = category || ''; // Сохраняем категорию для добавления новых изображений
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        document.body.style.overflow = 'hidden';
        
        // Добавляем кнопку загрузки, если есть категория
        if (category) {
            addUploadButtonToModal(modal, category);
        } else {
            removeUploadButtonFromModal(modal);
        }
    }
}

// Добавление кнопки загрузки в модалку
function addUploadButtonToModal(modal, category) {
    // Удаляем старую кнопку, если есть
    removeUploadButtonFromModal(modal);
    
    // Создаем кнопку загрузки
    const uploadBtn = document.createElement('button');
    uploadBtn.id = 'modal-upload-btn';
    uploadBtn.className = 'modal-upload-btn';
    uploadBtn.textContent = '+ Добавить изображение';
    uploadBtn.title = 'Добавить изображение в ' + getCategoryName(category);
    
    uploadBtn.addEventListener('click', () => {
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
            
            await addImageToProject(file, category);
            document.body.removeChild(fileInput);
        });
        
        document.body.appendChild(fileInput);
        fileInput.click();
    });
    
    modal.querySelector('.image-modal-content').appendChild(uploadBtn);
}

// Удаление кнопки загрузки из модалки
function removeUploadButtonFromModal(modal) {
    const uploadBtn = modal.querySelector('#modal-upload-btn');
    if (uploadBtn) {
        uploadBtn.remove();
    }
}

// Получение названия категории
function getCategoryName(category) {
    const names = {
        'drawings': 'Чертежи',
        'photos': 'Фото',
        'renders': 'Рендеры'
    };
    return names[category] || category;
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
async function addImageToProject(file, category) {
    if (!projectData || !category) {
        alert('Ошибка: проект или категория не найдены');
        return;
    }
    
    try {
        // Показываем индикатор загрузки
        const indicator = document.createElement('div');
        indicator.style.cssText = 'position: fixed; top: 20px; right: 20px; background: rgba(0,0,0,0.8); color: white; padding: 15px 20px; border-radius: 4px; z-index: 10000;';
        indicator.textContent = 'Обработка изображения...';
        document.body.appendChild(indicator);
        
        // Сжимаем изображение
        const compressedImagePath = await compressImage(file, 800, 800, 0.7);
        
        // Добавляем в соответствующий массив проекта
        if (!projectData[category]) {
            projectData[category] = [];
        }
        projectData[category].push(compressedImagePath);
        
        // Обновляем глобальные массивы
        if (category === 'drawings') {
            drawingsImages = projectData.drawings;
        } else if (category === 'photos') {
            photosImages = projectData.photos;
        } else if (category === 'renders') {
            rendersImages = projectData.renders;
        }
        
        // Обновляем данные в projectsData
        const projectIndex = projectsData.findIndex(p => p.id === projectId);
        if (projectIndex !== -1) {
            projectsData[projectIndex] = projectData;
        }
        
        // Автоматически сохраняем в localStorage
        try {
            const dataToSave = { projects: projectsData };
            localStorage.setItem('projectsData', JSON.stringify(dataToSave));
            console.log('Изображение автоматически сохранено в папку проекта:', category);
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            alert('Ошибка сохранения: ' + error.message);
            return;
        }
        
        // Обновляем отображение колонки
        const columnId = category === 'drawings' ? 'drawings-column' : 
                        category === 'photos' ? 'photos-column' : 'renders-column';
        loadColumn(columnId, projectData[category]);
        
        indicator.textContent = 'Изображение добавлено и сохранено в папку!';
        setTimeout(() => {
            indicator.remove();
        }, 2000);
        
    } catch (error) {
        console.error('Ошибка обработки изображения:', error);
        alert('Ошибка при обработке файла: ' + error.message);
    }
}

// Закрытие модалки
function closeImageModal() {
    const modal = document.getElementById('image-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        document.body.style.overflow = '';
        // Удаляем кнопку загрузки при закрытии
        removeUploadButtonFromModal(modal);
    }
}

// Обработчик закрытия модалки
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('image-modal');
    const modalCloseLottie = document.getElementById('modal-close-lottie');
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeImageModal();
            }
        });
    }
    
    if (modalCloseLottie) {
        modalCloseLottie.addEventListener('click', closeImageModal);
    }
    
    // Загружаем Lottie анимацию для закрытия
    if (typeof lottie !== 'undefined' && modalCloseLottie) {
        fetch('lottie/cat.json')
            .then(response => response.json())
            .then(animationData => {
                lottie.loadAnimation({
                    container: modalCloseLottie,
                    renderer: 'svg',
                    loop: true,
                    autoplay: true,
                    animationData: animationData
                });
            })
            .catch(() => {});
    }
    
    
    // Загружаем данные проекта
    if (projectId) {
        loadProjectData();
    } else {
        console.error('ID проекта не указан в URL');
    }
});

