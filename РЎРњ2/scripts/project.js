// Получаем ID проекта из URL
const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('id');

let drawingsSwiper = null;
let photosSwiper = null;
let rendersSwiper = null;
let projectData = null;
let projectsData = [];

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
        document.getElementById('project-description').textContent = projectData.description;
        
        // Загружаем карусели
        loadComparisonCarousels();
    } catch (error) {
        console.error('Ошибка загрузки данных проекта:', error);
    }
}

// Загрузка синхронных каруселей
function loadComparisonCarousels() {
    // Загружаем чертежи
    loadCarousel('drawings', projectData.drawings || [], drawingsSwiper, 'drawings-swiper', 'drawings-wrapper');
    
    // Загружаем фото
    loadCarousel('photos', projectData.photos || [], photosSwiper, 'photos-swiper', 'photos-wrapper');
    
    // Загружаем рендеры
    loadCarousel('renders', projectData.renders || [], rendersSwiper, 'renders-swiper', 'renders-wrapper');
    
    // Инициализируем Swiper для каждой карусели
    initSynchronizedCarousels();
}

// Загрузка изображений в карусель
function loadCarousel(type, images, swiperInstance, swiperId, wrapperId) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;
    
    wrapper.innerHTML = '';
    
    images.forEach((imagePath, index) => {
        const slide = document.createElement('div');
        slide.className = 'swiper-slide';
        
        const img = document.createElement('img');
        img.src = imagePath;
        img.alt = `${type} ${index + 1}`;
        img.onerror = function() {
            this.src = 'images/photos/ComfyUI_00070_.png'; // Заглушка
        };
        
        img.addEventListener('click', () => openImageModal(imagePath));
        
        slide.appendChild(img);
        wrapper.appendChild(slide);
    });
}

// Инициализация синхронных каруселей
function initSynchronizedCarousels() {
    // Инициализируем первую карусель (чертежи)
    drawingsSwiper = new Swiper('#drawings-swiper', {
        slidesPerView: 1,
        spaceBetween: 10,
        loop: false,
        speed: 300,
        on: {
            slideChange: function() {
                syncCarousels(this.activeIndex, 'drawings');
            }
        }
    });
    
    // Инициализируем вторую карусель (фото)
    photosSwiper = new Swiper('#photos-swiper', {
        slidesPerView: 1,
        spaceBetween: 10,
        loop: false,
        speed: 300,
        on: {
            slideChange: function() {
                syncCarousels(this.activeIndex, 'photos');
            }
        }
    });
    
    // Инициализируем третью карусель (рендеры)
    rendersSwiper = new Swiper('#renders-swiper', {
        slidesPerView: 1,
        spaceBetween: 10,
        loop: false,
        speed: 300,
        on: {
            slideChange: function() {
                syncCarousels(this.activeIndex, 'renders');
            }
        }
    });
}

// Синхронизация каруселей
function syncCarousels(activeIndex, sourceType) {
    // Синхронизируем все карусели с активным индексом
    if (sourceType !== 'drawings' && drawingsSwiper) {
        drawingsSwiper.slideTo(activeIndex, 300, false);
    }
    if (sourceType !== 'photos' && photosSwiper) {
        photosSwiper.slideTo(activeIndex, 300, false);
    }
    if (sourceType !== 'renders' && rendersSwiper) {
        rendersSwiper.slideTo(activeIndex, 300, false);
    }
}

// Открытие модалки с изображением
function openImageModal(imagePath) {
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    
    if (modal && modalImage) {
        modalImage.src = imagePath;
        modal.dataset.currentImagePath = imagePath;
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        document.body.style.overflow = 'hidden';
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

