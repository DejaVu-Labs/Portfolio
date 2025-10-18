// Инициализация сцены Three.js
let scene, camera, renderer, psp, screen, buttons = {};
let currentProjectIndex = 0;
let isProjectViewMode = false;
let currentImageIndex = 0;

// Данные проектов
const projects = [
    {
        name: "Проект 1",
        images: [
            "https://via.placeholder.com/800x600/667eea/ffffff?text=Проект+1+-+Изображение+1",
            "https://via.placeholder.com/800x600/764ba2/ffffff?text=Проект+1+-+Изображение+2",
            "https://via.placeholder.com/800x600/f093fb/ffffff?text=Проект+1+-+Изображение+3"
        ],
        thumbnail: "https://via.placeholder.com/480x272/667eea/ffffff?text=Проект+1",
        description: "Описание проекта 1 будет добавлено позже..."
    },
    {
        name: "Проект 2",
        images: [
            "https://via.placeholder.com/800x600/4facfe/ffffff?text=Проект+2+-+Изображение+1",
            "https://via.placeholder.com/800x600/00f2fe/ffffff?text=Проект+2+-+Изображение+2"
        ],
        thumbnail: "https://via.placeholder.com/480x272/4facfe/ffffff?text=Проект+2",
        description: "Описание проекта 2 будет добавлено позже..."
    },
    {
        name: "Проект 3",
        images: [
            "https://via.placeholder.com/800x600/43e97b/ffffff?text=Проект+3+-+Изображение+1",
            "https://via.placeholder.com/800x600/38f9d7/ffffff?text=Проект+3+-+Изображение+2",
            "https://via.placeholder.com/800x600/fa709a/ffffff?text=Проект+3+-+Изображение+3"
        ],
        thumbnail: "https://via.placeholder.com/480x272/43e97b/ffffff?text=Проект+3",
        description: "Описание проекта 3 будет добавлено позже..."
    },
    {
        name: "Проект 4",
        images: [
            "https://via.placeholder.com/800x600/fa709a/ffffff?text=Проект+4+-+Изображение+1"
        ],
        thumbnail: "https://via.placeholder.com/480x272/fa709a/ffffff?text=Проект+4",
        description: "Описание проекта 4 будет добавлено позже..."
    },
    {
        name: "Проект 5",
        images: [
            "https://via.placeholder.com/800x600/fee140/333333?text=Проект+5+-+Изображение+1",
            "https://via.placeholder.com/800x600/f5576c/ffffff?text=Проект+5+-+Изображение+2"
        ],
        thumbnail: "https://via.placeholder.com/480x272/fee140/333333?text=Проект+5",
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
    camera.position.set(0, 0, 15);

    // Рендерер
    const canvas = document.getElementById('webgl-canvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
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
    controls.minDistance = 10;
    controls.maxDistance = 25;

    // Обработчики событий
    window.addEventListener('resize', onWindowResize);
    canvas.addEventListener('click', onCanvasClick);

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
    const screenMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.set(0, 0.5, 0.45);
    psp.add(screen);

    // Текстура на экран (галерея)
    updateScreenTexture();

    // Рамка экрана
    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        metalness: 0.6,
        roughness: 0.3
    });

    // Левая панель с D-pad
    const leftPanelGeometry = new THREE.BoxGeometry(1.5, 1.5, 0.3);
    const leftPanel = new THREE.Mesh(leftPanelGeometry, frameMaterial);
    leftPanel.position.set(-2.8, -0.8, 0.5);
    psp.add(leftPanel);

    // Правая панель с кнопками
    const rightPanelGeometry = new THREE.BoxGeometry(1.5, 1.5, 0.3);
    const rightPanel = new THREE.Mesh(rightPanelGeometry, frameMaterial);
    rightPanel.position.set(2.8, -0.8, 0.5);
    psp.add(rightPanel);

    // Создание кнопок
    createButtons();

    // Увеличение размера PSP в 3 раза
    psp.scale.set(3, 3, 3);

    scene.add(psp);
}

// Создание кнопок управления
function createButtons() {
    const buttonMaterial = new THREE.MeshStandardMaterial({
        metalness: 0.5,
        roughness: 0.3
    });

    // Круг (O) - справа
    const circleGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.15, 32);
    const circleMaterial = buttonMaterial.clone();
    circleMaterial.color.setHex(0xf5576c);
    buttons.circle = new THREE.Mesh(circleGeometry, circleMaterial);
    buttons.circle.rotation.x = Math.PI / 2;
    buttons.circle.position.set(3.2, -0.8, 0.65);
    buttons.circle.userData = { type: 'circle', action: 'next' };
    psp.add(buttons.circle);

    // Квадрат (□) - слева
    const squareGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.15);
    const squareMaterial = buttonMaterial.clone();
    squareMaterial.color.setHex(0x00f2fe);
    buttons.square = new THREE.Mesh(squareGeometry, squareMaterial);
    buttons.square.position.set(2.4, -0.8, 0.65);
    buttons.square.userData = { type: 'square', action: 'prev' };
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
    buttons.triangle.position.set(2.8, -0.3, 0.65);
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
    buttons.cross.position.set(2.8, -1.3, 0.65);
    buttons.cross.userData = { type: 'cross', action: 'back' };
    psp.add(buttons.cross);

    // D-pad (для навигации) - слева
    const dpadMaterial = buttonMaterial.clone();
    dpadMaterial.color.setHex(0x444444);
    
    // Верх
    const dpadUp = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.4, 0.1),
        dpadMaterial
    );
    dpadUp.position.set(-2.8, -0.3, 0.65);
    psp.add(dpadUp);

    // Низ
    const dpadDown = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.4, 0.1),
        dpadMaterial
    );
    dpadDown.position.set(-2.8, -1.3, 0.65);
    psp.add(dpadDown);

    // Лево
    const dpadLeft = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.3, 0.1),
        dpadMaterial
    );
    dpadLeft.position.set(-3.3, -0.8, 0.65);
    psp.add(dpadLeft);

    // Право
    const dpadRight = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.3, 0.1),
        dpadMaterial
    );
    dpadRight.position.set(-2.3, -0.8, 0.65);
    psp.add(dpadRight);
}

// Обновление текстуры экрана
function updateScreenTexture() {
    const loader = new THREE.TextureLoader();
    const currentProject = projects[currentProjectIndex];
    
    let imageUrl;
    if (isProjectViewMode) {
        // Показываем текущее изображение проекта
        imageUrl = currentProject.images[currentImageIndex];
    } else {
        // Показываем превью галереи
        imageUrl = currentProject.thumbnail;
    }
    
    loader.load(imageUrl, (texture) => {
        screen.material = new THREE.MeshBasicMaterial({ map: texture });
    });
}

// Обработчик кликов
function onCanvasClick(event) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Проверка пересечений с кнопками
    const buttonObjects = [
        buttons.circle,
        buttons.square,
        buttons.triangle,
        buttons.cross
    ];

    const intersects = raycaster.intersectObjects(buttonObjects, true);

    if (intersects.length > 0) {
        const button = intersects[0].object;
        let userData = button.userData;
        
        // Если это группа (крестик), получаем userData из родителя
        if (!userData.action && button.parent.userData.action) {
            userData = button.parent.userData;
        }

        handleButtonClick(userData.action);
        
        // Анимация нажатия
        animateButtonPress(button);
    }
}

// Обработка нажатий кнопок
function handleButtonClick(action) {
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
    isProjectViewMode = true;
    currentImageIndex = 0;
    updateScreenTexture();
}

function closeProjectView() {
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
