// Инициализация сцены Three.js
let scene, camera, renderer, psp, screen, buttons = {};
let currentProjectIndex = 0;
let isProjectViewMode = false;
let currentImageIndex = 0;

// Функция создания placeholder изображения
function createPlaceholderImage(width, height, color, text) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Градиентный фон
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, adjustColorBrightness(color, -20));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Текст
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold ' + Math.floor(height / 12) + 'px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);
    
    return canvas.toDataURL();
}

// Вспомогательная функция для изменения яркости цвета
function adjustColorBrightness(color, amount) {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
    const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

// Данные проектов (увеличено разрешение для четкости)
const projects = [
    {
        name: "Проект 1",
        images: [
            createPlaceholderImage(2048, 1536, '#667eea', 'Проект 1 - Изображение 1'),
            createPlaceholderImage(2048, 1536, '#764ba2', 'Проект 1 - Изображение 2'),
            createPlaceholderImage(2048, 1536, '#f093fb', 'Проект 1 - Изображение 3')
        ],
        thumbnail: createPlaceholderImage(1920, 1088, '#667eea', 'Проект 1'),
        description: "Описание проекта 1 будет добавлено позже..."
    },
    {
        name: "Проект 2",
        images: [
            createPlaceholderImage(2048, 1536, '#4facfe', 'Проект 2 - Изображение 1'),
            createPlaceholderImage(2048, 1536, '#00f2fe', 'Проект 2 - Изображение 2')
        ],
        thumbnail: createPlaceholderImage(1920, 1088, '#4facfe', 'Проект 2'),
        description: "Описание проекта 2 будет добавлено позже..."
    },
    {
        name: "Проект 3",
        images: [
            createPlaceholderImage(2048, 1536, '#43e97b', 'Проект 3 - Изображение 1'),
            createPlaceholderImage(2048, 1536, '#38f9d7', 'Проект 3 - Изображение 2'),
            createPlaceholderImage(2048, 1536, '#fa709a', 'Проект 3 - Изображение 3')
        ],
        thumbnail: createPlaceholderImage(1920, 1088, '#43e97b', 'Проект 3'),
        description: "Описание проекта 3 будет добавлено позже..."
    },
    {
        name: "Проект 4",
        images: [
            createPlaceholderImage(2048, 1536, '#fa709a', 'Проект 4 - Изображение 1')
        ],
        thumbnail: createPlaceholderImage(1920, 1088, '#fa709a', 'Проект 4'),
        description: "Описание проекта 4 будет добавлено позже..."
    },
    {
        name: "Проект 5",
        images: [
            createPlaceholderImage(2048, 1536, '#fee140', 'Проект 5 - Изображение 1'),
            createPlaceholderImage(2048, 1536, '#f5576c', 'Проект 5 - Изображение 2')
        ],
        thumbnail: createPlaceholderImage(1920, 1088, '#fee140', 'Проект 5'),
        description: "Описание проекта 5 будет добавлено позже..."
    }
];

// Инициализация
function init() {
    // Создание сцены
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    // Камера
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 0, 40);

    // Рендерер
    const canvas = document.getElementById('webgl-canvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Для четкости на retina дисплеях
    renderer.shadowMap.enabled = true;

    // Освещение
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x00d4ff, 1, 100);
    pointLight1.position.set(10, 10, 10);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff00ff, 0.8, 100);
    pointLight2.position.set(-10, -10, 10);
    scene.add(pointLight2);

    const spotLight = new THREE.SpotLight(0xffffff, 1);
    spotLight.position.set(0, 20, 20);
    spotLight.castShadow = true;
    scene.add(spotLight);

    // Создание PSP
    createPSP();

    // Контроллеры орбиты
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 25;
    controls.maxDistance = 70;

    // Обработчики событий
    window.addEventListener('resize', onWindowResize);
    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('touchstart', onTouchStart);

    // Обработчик закрытия подсказки
    const closeHintBtn = document.getElementById('close-hint');
    const controlsHint = document.getElementById('controls-hint');
    closeHintBtn.addEventListener('click', () => {
        controlsHint.classList.add('hidden');
    });

    // Анимация
    animate();
}

// Создание 3D модели PSP
function createPSP() {
    psp = new THREE.Group();

    // Основной корпус PSP
    const bodyGeometry = new THREE.BoxGeometry(8, 4, 0.8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        metalness: 0.8,
        roughness: 0.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    psp.add(body);

    // Экран PSP
    const screenGeometry = new THREE.BoxGeometry(4.8, 2.72, 0.1);
    const screenMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x333333,
        side: THREE.DoubleSide
    });
    screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.set(0, 0.5, 0.45);
    psp.add(screen);

    console.log('Экран PSP создан, загружаем текстуру...');

    // Текстура на экран (галерея)
    updateScreenTexture();

    // Рамка экрана
    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        metalness: 0.6,
        roughness: 0.3
    });

    // Левая панель с D-pad
    const leftPanelGeometry = new THREE.BoxGeometry(1.8, 1.8, 0.3);
    const leftPanel = new THREE.Mesh(leftPanelGeometry, frameMaterial);
    leftPanel.position.set(-3.5, -0.8, 0.5);
    psp.add(leftPanel);

    // Правая панель с кнопками
    const rightPanelGeometry = new THREE.BoxGeometry(1.8, 1.8, 0.3);
    const rightPanel = new THREE.Mesh(rightPanelGeometry, frameMaterial);
    rightPanel.position.set(3.5, -0.8, 0.5);
    psp.add(rightPanel);

    // Создание кнопок
    createButtons();

    // Увеличение размера PSP в 7 раз
    psp.scale.set(7, 7, 7);

    scene.add(psp);
}

// Создание кнопок управления
function createButtons() {
    const buttonMaterial = new THREE.MeshStandardMaterial({
        metalness: 0.5,
        roughness: 0.3
    });

    // Круг (O) - справа (листать изображения вперед в проекте)
    const circleGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.15, 32);
    const circleMaterial = buttonMaterial.clone();
    circleMaterial.color.setHex(0xf5576c);
    buttons.circle = new THREE.Mesh(circleGeometry, circleMaterial);
    buttons.circle.rotation.x = Math.PI / 2;
    buttons.circle.position.set(3.9, -0.8, 0.65);
    buttons.circle.userData = { type: 'circle', action: 'nextImage' };
    psp.add(buttons.circle);

    // Квадрат (□) - слева (листать изображения назад в проекте)
    const squareGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.15);
    const squareMaterial = buttonMaterial.clone();
    squareMaterial.color.setHex(0x00f2fe);
    buttons.square = new THREE.Mesh(squareGeometry, squareMaterial);
    buttons.square.position.set(3.1, -0.8, 0.65);
    buttons.square.userData = { type: 'square', action: 'prevImage' };
    psp.add(buttons.square);

    // Треугольник (△) - сверху
    const triangleShape = new THREE.Shape();
    triangleShape.moveTo(0, 0.3);
    triangleShape.lineTo(-0.25, -0.15);
    triangleShape.lineTo(0.25, -0.15);
    triangleShape.lineTo(0, 0.3);
    const triangleGeometry = new THREE.ExtrudeGeometry(triangleShape, {
        depth: 0.15,
        bevelEnabled: false
    });
    const triangleMaterial = buttonMaterial.clone();
    triangleMaterial.color.setHex(0x38f9d7);
    buttons.triangle = new THREE.Mesh(triangleGeometry, triangleMaterial);
    // Смещаем треугольник назад на половину depth для центрирования
    buttons.triangle.position.set(3.5, -0.3, 0.575);
    buttons.triangle.userData = { type: 'triangle', action: 'open' };
    psp.add(buttons.triangle);

    // Крестик (X) - снизу
    const crossGeometry = new THREE.BoxGeometry(0.4, 0.1, 0.15);
    const crossMaterial = buttonMaterial.clone();
    crossMaterial.color.setHex(0xfee140);
    
    const cross1 = new THREE.Mesh(crossGeometry, crossMaterial);
    cross1.rotation.z = Math.PI / 4;
    const cross2 = new THREE.Mesh(crossGeometry, crossMaterial);
    cross2.rotation.z = -Math.PI / 4;
    
    buttons.cross = new THREE.Group();
    buttons.cross.add(cross1);
    buttons.cross.add(cross2);
    buttons.cross.position.set(3.5, -1.3, 0.65);
    buttons.cross.userData = { type: 'cross', action: 'back' };
    psp.add(buttons.cross);

    // D-pad (для навигации) - слева
    const dpadMaterial = buttonMaterial.clone();
    dpadMaterial.color.setHex(0x444444);
    
    // Верх
    buttons.dpadUp = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.4, 0.15),
        dpadMaterial
    );
    buttons.dpadUp.position.set(-3.5, -0.3, 0.65);
    buttons.dpadUp.userData = { type: 'dpadUp', action: 'none' };
    psp.add(buttons.dpadUp);

    // Низ
    buttons.dpadDown = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.4, 0.15),
        dpadMaterial
    );
    buttons.dpadDown.position.set(-3.5, -1.3, 0.65);
    buttons.dpadDown.userData = { type: 'dpadDown', action: 'none' };
    psp.add(buttons.dpadDown);

    // Лево
    buttons.dpadLeft = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.3, 0.15),
        dpadMaterial
    );
    buttons.dpadLeft.position.set(-4.0, -0.8, 0.65);
    buttons.dpadLeft.userData = { type: 'dpadLeft', action: 'prev' };
    psp.add(buttons.dpadLeft);

    // Право
    buttons.dpadRight = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.3, 0.15),
        dpadMaterial
    );
    buttons.dpadRight.position.set(-3.0, -0.8, 0.65);
    buttons.dpadRight.userData = { type: 'dpadRight', action: 'next' };
    psp.add(buttons.dpadRight);
}

// Обновление текстуры экрана
function updateScreenTexture() {
    const currentProject = projects[currentProjectIndex];
    
    let imageUrl;
    if (isProjectViewMode) {
        // Показываем текущее изображение проекта
        imageUrl = currentProject.images[currentImageIndex];
        console.log('Режим просмотра проекта, изображение:', currentImageIndex + 1);
    } else {
        // Показываем превью галереи
        imageUrl = currentProject.thumbnail;
        console.log('Режим галереи, проект:', currentProject.name);
    }
    
    // Загружаем текстуру с улучшенными настройками
    const loader = new THREE.TextureLoader();
    loader.load(
        imageUrl,
        (texture) => {
            console.log('✓ Текстура загружена успешно');
            // Настройки для более четкого отображения
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy(); // Максимальная анизотропная фильтрация
            texture.needsUpdate = true;
            
            screen.material = new THREE.MeshBasicMaterial({ 
                map: texture,
                side: THREE.DoubleSide
            });
            screen.material.needsUpdate = true;
        },
        undefined,
        (error) => {
            console.error('✗ Ошибка загрузки текстуры:', error);
        }
    );
}

// Универсальная функция получения координат
function getEventCoordinates(event) {
    let clientX, clientY;
    
    if (event.type.startsWith('touch')) {
        // Для touch-событий
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else {
        // Для обычных кликов
        clientX = event.clientX;
        clientY = event.clientY;
    }
    
    return { clientX, clientY };
}

// Обработчик touch-событий
function onTouchStart(event) {
    event.preventDefault(); // Предотвращаем стандартное поведение
    handleInteraction(event);
}

// Обработчик кликов
function onCanvasClick(event) {
    handleInteraction(event);
}

// Универсальная функция обработки взаимодействия
function handleInteraction(event) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    const { clientX, clientY } = getEventCoordinates(event);

    mouse.x = (clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Проверка пересечений с кнопками
    const buttonObjects = [
        buttons.circle,
        buttons.square,
        buttons.triangle,
        buttons.cross,
        buttons.dpadUp,
        buttons.dpadDown,
        buttons.dpadLeft,
        buttons.dpadRight
    ];

    const intersects = raycaster.intersectObjects(buttonObjects, true);

    if (intersects.length > 0) {
        const button = intersects[0].object;
        let userData = button.userData;
        let buttonToAnimate = button;
        
        // Если это группа (крестик), получаем userData из родителя
        if (!userData.action && button.parent.userData.action) {
            userData = button.parent.userData;
            buttonToAnimate = button.parent; // Анимируем всю группу
        }

        console.log('Нажата кнопка:', userData.action, 'тип события:', event.type);
        handleButtonClick(userData.action);
        
        // Анимация нажатия
        animateButtonPress(buttonToAnimate);
    }
}

// Обработка нажатий кнопок
function handleButtonClick(action) {
    console.log('handleButtonClick вызван с action:', action, 'isProjectViewMode:', isProjectViewMode);
    if (isProjectViewMode) {
        // Действия в режиме просмотра проекта
        if (action === 'back') {
            closeProjectView();
        } else if (action === 'next') {
            nextImage();
        } else if (action === 'prev') {
            prevImage();
        }
    } else {
        // Действия в режиме галереи
        if (action === 'next') {
            nextProject();
        } else if (action === 'prev') {
            prevProject();
        } else if (action === 'open') {
            openProjectView();
        }
    }
}

// Навигация по проектам
function nextProject() {
    currentProjectIndex = (currentProjectIndex + 1) % projects.length;
    updateScreenTexture();
}

function prevProject() {
    currentProjectIndex = (currentProjectIndex - 1 + projects.length) % projects.length;
    updateScreenTexture();
}

// Режим просмотра проекта
function openProjectView() {
    console.log('Открываем просмотр проекта:', currentProjectIndex);
    isProjectViewMode = true;
    currentImageIndex = 0;
    updateScreenTexture();
}

function closeProjectView() {
    console.log('Закрываем просмотр проекта');
    isProjectViewMode = false;
    currentImageIndex = 0;
    updateScreenTexture();
}

function nextImage() {
    const project = projects[currentProjectIndex];
    currentImageIndex = (currentImageIndex + 1) % project.images.length;
    updateScreenTexture();
}

function prevImage() {
    const project = projects[currentProjectIndex];
    currentImageIndex = (currentImageIndex - 1 + project.images.length) % project.images.length;
    updateScreenTexture();
}

// Анимация нажатия кнопки
function animateButtonPress(button) {
    const originalZ = button.position.z;
    const targetZ = originalZ - 0.1;
    
    // Нажатие
    const pressAnimation = () => {
        button.position.z = targetZ;
        setTimeout(() => {
            button.position.z = originalZ;
        }, 100);
    };
    
    pressAnimation();
}

// Обработчик изменения размера окна
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Анимационный цикл
function animate() {
    requestAnimationFrame(animate);
    
    renderer.render(scene, camera);
}

// Запуск при загрузке страницы
window.addEventListener('DOMContentLoaded', init);
