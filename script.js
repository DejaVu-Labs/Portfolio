// Инициализация сцены Three.js
let scene, camera, renderer, psp, screen, buttons = {};
let currentProjectIndex = 0;
let isProjectViewMode = false;
let currentImageIndex = 0;
let projectScreens = []; // Массив для хранения 3 экранов проектов
let isAnimating = false; // Флаг анимации
let animationStartTime = 0; // Время начала анимации
let animationDuration = 400; // Длительность анимации в миллисекундах
let clippingPlanes = []; // Плоскости обрезки для экрана

// Система рендер-таргета
let renderTarget; // WebGLRenderTarget для рендеринга проектов
let renderCamera; // Отдельная камера для рендер-таргета
let renderScene; // Отдельная сцена для рендер-таргета
let backgroundTexture; // Текстура фона
let projectMeshes = []; // Меши проектов для рендер-таргета

// Размеры проектов
const PROJECT_SIZES = {
    ACTIVE_WIDTH: 6.4,    // Ширина активного проекта
    ACTIVE_HEIGHT: 3.6,   // Высота активного проекта
    ACTIVE_SCALE: 1.0,    // Масштаб активного проекта
    INACTIVE_SCALE: 0.45  // Масштаб неактивных проектов
};

// Позиции проектов
const PROJECT_POSITIONS = {
    LEFT: -4.8,      // Левый проект
    CENTER: 0,       // Центральный проект
    RIGHT: 4.8,      // Правый проект
    BUFFER: 9.6      // Буферный проект
};

// Функция плавности (easing) для анимации
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Инициализация системы рендер-таргета
function initRenderTarget() {
    // Размер рендер-таргета (высокое разрешение для четкости)
    const renderWidth = 1920;
    const renderHeight = 1080;
    
    // Создаем рендер-таргет
    renderTarget = new THREE.WebGLRenderTarget(renderWidth, renderHeight, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType
    });
    
    // Создаем отдельную сцену для рендеринга
    renderScene = new THREE.Scene();
    
    // Создаем ортогональную камеру для рендер-таргета
    const aspect = renderWidth / renderHeight;
    const frustumSize = 8; // Увеличиваем размер области рендеринга для соответствия старой карусели
    renderCamera = new THREE.OrthographicCamera(
        -frustumSize * aspect / 2, frustumSize * aspect / 2,
        frustumSize / 2, -frustumSize / 2,
        0.1, 1000
    );
    renderCamera.position.z = 5;
    
    // Загружаем фоновое изображение
    const loader = new THREE.TextureLoader();
    loader.load(
        'images/background.png',
        (texture) => {
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            backgroundTexture = texture;
            
            // Создаем фоновую плоскость (увеличиваем для соответствия frustumSize = 8)
            const backgroundGeometry = new THREE.PlaneGeometry(16, 9);
            const backgroundMaterial = new THREE.MeshBasicMaterial({
                map: backgroundTexture,
                side: THREE.DoubleSide
            });
            const backgroundMesh = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
            backgroundMesh.position.z = -1; // Позади проектов
            renderScene.add(backgroundMesh);
        },
        undefined,
        (error) => {
            console.error('✗ Ошибка загрузки фонового изображения для рендер-таргета:', error);
        }
    );
    
    // Создаем меши проектов для рендер-таргета
    createProjectMeshes();
    
    // Создаем линию на экране
    createScreenLine();
    
    // Создаем текст на экране
    createScreenText();
    
    // Начальная загрузка текстур
    updateProjectScreens();
}

// Создание линии на экране PSP
function createScreenLine() {
    console.log('createScreenLine вызвана, renderScene:', renderScene);
    if (!renderScene) {
        console.log('renderScene не создан, выходим');
        return;
    }
    
    // Размеры относительно камеры рендер-таргета
    // Камера имеет frustumSize = 8, aspect = 1920/1080 = 1.777
    const frustumSize = 8;
    const aspect = 1920 / 1080;
    const backgroundWidth = frustumSize * aspect;  // 14.22 (видимая область по X)
    const backgroundHeight = frustumSize;          // 8 (видимая область по Y)
    
    // Размеры линии точно по пикселям
    const lineWidth = (1680 / 1920) * backgroundWidth;   // 1680px из 1920px = 14.0
    const lineHeight = (5 / 1080) * backgroundHeight;     // 5px из 1080px = 0.042
    
    // Позиция относительно фона (123, 141 - абсолютные координаты от левого верхнего угла)
    // X=123 - это начало линии, нужно добавить половину ширины линии для центрирования
    const lineX = ((123 / 1920) * backgroundWidth) - (backgroundWidth / 2) + (lineWidth / 2);   // X=123 + половина ширины
    const lineY = (backgroundHeight / 2) - ((141 / 1080) * backgroundHeight); // Y=141 от верхнего края (инвертируем Y)
    
    console.log(`Создаем линию: размер ${lineWidth}x${lineHeight}, позиция (${lineX}, ${lineY})`);
    console.log(`Расчет: 1680/1920=${1680/1920}, 5/1080=${5/1080}`);
    console.log(`Фон: ${backgroundWidth}x${backgroundHeight}`);
    console.log(`Линия должна быть: 1680px ширина, 5px высота`);
    console.log(`Линия должна начинаться с позиции (123, 141) от левого верхнего угла`);
    console.log(`Текущая позиция центра линии: (${lineX}, ${lineY})`);
    console.log(`Начало линии: (${lineX - lineWidth/2}, ${lineY})`);
    console.log(`Конец линии: (${lineX + lineWidth/2}, ${lineY})`);
    
    const lineGeometry = new THREE.PlaneGeometry(lineWidth, lineHeight);
    const lineMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF, // Белый цвет
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 1.0
    });
    
    const line = new THREE.Mesh(lineGeometry, lineMaterial);
    line.position.set(lineX, lineY, 2.0); // Еще выше для тестирования
    line.visible = true;
    
    renderScene.add(line);
    console.log('Линия добавлена в renderScene, количество объектов:', renderScene.children.length);
}

// Создание текста на экране PSP
function createScreenText() {
    console.log('createScreenText вызвана, renderScene:', renderScene);
    if (!renderScene) {
        console.log('renderScene не создан, выходим');
        return;
    }
    
    // Создаем Canvas для рендеринга текста
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // Размеры Canvas (высокое разрешение для четкости)
    const canvasWidth = 800;
    const canvasHeight = 200;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Настройки текста - рендерим точно в 55pt
    const fontSize = 55;
    const fontFamily = 'Arial';
    const text = 'My Projects';
    
    // Настройка шрифта
    context.font = `${fontSize}px ${fontFamily}`;
    context.fillStyle = '#FFFFFF';
    context.textAlign = 'left';
    context.textBaseline = 'top';
    
    // Рендерим текст на Canvas
    context.fillText(text, 0, fontSize); // Смещаем вниз на размер шрифта
    
    console.log(`Canvas: ${canvasWidth}x${canvasHeight}, шрифт: ${fontSize}px, текст: "${text}"`);
    console.log(`Измеряем текст на Canvas: ширина = ${context.measureText(text).width}px`);
    
    // Создаем текстуру из Canvas
    const textTexture = new THREE.CanvasTexture(canvas);
    textTexture.minFilter = THREE.LinearFilter;
    textTexture.magFilter = THREE.LinearFilter;
    
    // Размеры относительно камеры рендер-таргета
    const frustumSize = 8;
    const aspect = 1920 / 1080;
    const backgroundWidth = frustumSize * aspect;  // 14.22
    const backgroundHeight = frustumSize;          // 8
    
    // Параметры текста: X=238, Y=50 от левого верхнего угла экрана 1920x1080
    // Позиция ЛЕВОГО ВЕРХНЕГО УГЛА текста относительно фона 1920x1080
    const textLeftX = ((238 / 1920) * backgroundWidth) - (backgroundWidth / 2);
    const textTopY = (backgroundHeight / 2) - ((50 / 1080) * backgroundHeight); // Инвертируем Y
    
    // Размер текста точно 55pt - синхронизируем с Canvas
    // Canvas рендерит в 55px, Canvas размер 200px высота
    // Нужно масштабировать относительно Canvas, а не экрана
    const textSize = (55 / 200) * backgroundHeight; // 55px из 200px Canvas высоты
    const textWidth = (289 / 200) * backgroundHeight; // 289px ширина из 200px Canvas высоты
    
    // Позиция центра текста (для Three.js меша)
    const textX = textLeftX + (textWidth / 2); // Центр = левый край + половина ширины
    const textY = textTopY - (textSize / 2);   // Центр = верхний край - половина высоты
    
    console.log(`Позиция текста: X=238, Y=50 от левого верхнего угла`);
    console.log(`Левый верхний угол: textLeftX=${textLeftX}, textTopY=${textTopY}`);
    console.log(`Центр текста: textX=${textX}, textY=${textY}`);
    console.log(`Фон границы: от ${-backgroundWidth/2} до ${backgroundWidth/2} по X, от ${-backgroundHeight/2} до ${backgroundHeight/2} по Y`);
    console.log(`Текст границы: от ${textLeftX} до ${textLeftX + textWidth} по X, от ${textTopY - textSize} до ${textTopY} по Y`);
    
    console.log(`Создаем текст: "My Projects", размер ${textSize}x${textWidth}, позиция (${textX}, ${textY})`);
    console.log(`Расчет размера: 73px из 1080px = ${73/1080}, backgroundHeight = ${backgroundHeight}`);
    console.log(`Размер в единицах Three.js: ${textSize}, что составляет ${(textSize/backgroundHeight)*100}% от высоты экрана`);
    console.log(`Canvas размер: ${canvasWidth}x${canvasHeight}, соотношение: ${canvasWidth/canvasHeight}`);
    
    // Создаем текстовую геометрию с текстурой
    const textGeometry = new THREE.PlaneGeometry(textWidth, textSize);
    const textMaterial = new THREE.MeshBasicMaterial({
        map: textTexture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 1.0
    });
    
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.set(textX, textY, 1.5); // Выше линии
    textMesh.visible = true;
    
    renderScene.add(textMesh);
    console.log('Текст добавлен в renderScene, количество объектов:', renderScene.children.length);
}

// Создание мешей проектов для рендер-таргета
function createProjectMeshes() {
    // Создаем 4 меша (3 видимых + 1 буферный)
    for (let i = 0; i < 4; i++) {
        // Создаем геометрию с правильным соотношением сторон (16:9)
        const isActive = i === 1;
        const baseWidth = PROJECT_SIZES.ACTIVE_WIDTH;
        const baseHeight = PROJECT_SIZES.ACTIVE_HEIGHT;
        const scale = isActive ? PROJECT_SIZES.ACTIVE_SCALE : PROJECT_SIZES.INACTIVE_SCALE;
        
        const geometry = new THREE.PlaneGeometry(baseWidth, baseHeight);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: i === 1 ? 1.0 : (i === 3 ? 0.0 : 0.6)
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Устанавливаем начальные позиции из констант
        const positions = [PROJECT_POSITIONS.LEFT, PROJECT_POSITIONS.CENTER, PROJECT_POSITIONS.RIGHT, PROJECT_POSITIONS.BUFFER];
        mesh.position.set(positions[i], 0, 0);
        mesh.visible = i < 3; // Буферный скрыт
        
        // Применяем правильные масштабы сразу при создании
        mesh.scale.set(scale, scale, 1);
        
        renderScene.add(mesh);
        projectMeshes.push({
            mesh: mesh,
            currentX: positions[i],
            targetX: positions[i],
            currentScale: scale,
            targetScale: scale,
            currentOpacity: i === 1 ? 1.0 : 0.6,
            targetOpacity: i === 1 ? 1.0 : 0.6
        });
    }
}

// Рендеринг проектов в текстуру
function renderToTexture() {
    if (!renderTarget || !renderScene || !renderCamera) return;
    
    // Рендерим сцену в текстуру
    renderer.setRenderTarget(renderTarget);
    renderer.render(renderScene, renderCamera);
    renderer.setRenderTarget(null);
    
    // Обновляем материал экрана PSP
    if (screen && screen.material) {
        screen.material.map = renderTarget.texture;
        screen.material.needsUpdate = true;
    }
}

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
            'images/project1.png'
        ],
        thumbnail: 'images/project1.png',
        description: "Описание проекта 1 будет добавлено позже..."
    },
    {
        name: "Проект 2",
        images: [
            'images/project2.png'
        ],
        thumbnail: 'images/project2.png',
        description: "Описание проекта 2 будет добавлено позже..."
    },
    {
        name: "Проект 3",
        images: [
            'images/project3.png'
        ],
        thumbnail: 'images/project3.png',
        description: "Описание проекта 3 будет добавлено позже..."
    },
    {
        name: "Проект 4",
        images: [
            'images/project4.png'
        ],
        thumbnail: 'images/project4.png',
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
    renderer.localClippingEnabled = true; // Включаем локальное обрезание

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

    // Инициализация рендер-таргета
    initRenderTarget();
    
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

    // Экран PSP - теперь использует рендер-таргет
    const screenGeometry = new THREE.PlaneGeometry(4.8, 2.72);
    const screenMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 1.0,
        clippingPlanes: clippingPlanes,
        clipShadows: true
    });
    screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.set(0, 0.5, 0.44);
    psp.add(screen);




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
    
    // Создаем плоскости обрезки после масштабирования PSP
    // Экран имеет ширину 4.8 в локальных координатах, после масштаба 7x - это 4.8*7=33.6 в мировых
    // Центр на X=0, границы на ±2.4*7 = ±16.8 в мировых координатах
    // Нормаль плоскости указывает "внутрь" видимой области
    const pspScale = 7;
    const screenHalfWidth = 2.4 * pspScale;
    clippingPlanes = [
        new THREE.Plane(new THREE.Vector3(1, 0, 0), screenHalfWidth),  // Левая граница (нормаль вправо, обрезает слева)
        new THREE.Plane(new THREE.Vector3(-1, 0, 0), screenHalfWidth)  // Правая граница (нормаль влево, обрезает справа)
    ];
    
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


// Обновление текстур экранов проектов
function updateProjectScreens() {
    if (isProjectViewMode) {
        // В режиме просмотра показываем одно большое изображение
        updateProjectViewScreen();
    } else {
        // В режиме галереи показываем 3 проекта
        updateGalleryScreens();
    }
}

// Обновление экрана в режиме просмотра проекта
function updateProjectViewScreen() {
    const currentProject = projects[currentProjectIndex];
    const imageUrl = currentProject.images[currentImageIndex];
    
    
    // Скрываем боковые и буферный экраны
    projectMeshes[0].mesh.visible = false;
    projectMeshes[2].mesh.visible = false;
    projectMeshes[3].mesh.visible = false;
    
    // Показываем только центральный экран
    projectMeshes[1].mesh.visible = true;
    projectMeshes[1].mesh.scale.set(1.5, 1.5, 1);
    
    const loader = new THREE.TextureLoader();
    loader.load(
        imageUrl,
        (texture) => {
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            texture.needsUpdate = true;
            
            projectMeshes[1].mesh.material = new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.DoubleSide
            });
            projectMeshes[1].mesh.material.needsUpdate = true;
        },
        undefined,
        (error) => {
            console.error('✗ Ошибка загрузки текстуры:', error);
        }
    );
}

// Загрузка текстуры проекта на конкретный экран в рендер-сцене
function loadProjectTexture(screenIndex, projectIndex) {
    const project = projects[projectIndex];
    const loader = new THREE.TextureLoader();
    
    loader.load(
        project.thumbnail,
        (texture) => {
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            texture.needsUpdate = true;
            
            // Сохраняем текущую прозрачность
            const currentOpacity = projectMeshes[screenIndex].mesh.material ? 
                projectMeshes[screenIndex].mesh.material.opacity : 
                projectMeshes[screenIndex].targetOpacity;
            
            projectMeshes[screenIndex].mesh.material = new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: currentOpacity
            });
            projectMeshes[screenIndex].mesh.material.needsUpdate = true;
        },
        undefined,
        (error) => {
            console.error('✗ Ошибка загрузки текстуры:', error);
        }
    );
}

// Обновление экранов в режиме галереи
function updateGalleryScreens(direction) {
    
    // Показываем только первые 3 экрана (не буферный)
    for (let i = 0; i < 3; i++) {
        projectMeshes[i].mesh.visible = true;
    }
    projectMeshes[3].mesh.visible = false; // Буферный скрыт по умолчанию
    
    // Определяем индексы проектов для отображения в зависимости от направления
    let indices;
    if (direction === 'next') {
        // При next новый проект появляется справа
        indices = [
            (currentProjectIndex - 2 + projects.length) % projects.length, // Левый (будет уезжать)
            (currentProjectIndex - 1 + projects.length) % projects.length, // Центральный (было правым)
            currentProjectIndex                                             // Правый (новый проект)
        ];
    } else if (direction === 'prev') {
        // При prev новый проект появляется слева
        indices = [
            currentProjectIndex,                                             // Левый (новый проект)
            (currentProjectIndex + 1) % projects.length,                    // Центральный (было левым)
            (currentProjectIndex + 2) % projects.length                     // Правый (будет уезжать)
        ];
    } else {
        // По умолчанию (первая загрузка)
        indices = [
            (currentProjectIndex - 1 + projects.length) % projects.length, // Левый
            currentProjectIndex,                                             // Центральный
            (currentProjectIndex + 1) % projects.length                      // Правый
        ];
    }
    
    // Загружаем текстуры для каждого экрана
    indices.forEach((projectIndex, screenIndex) => {
        const project = projects[projectIndex];
        const loader = new THREE.TextureLoader();
        
        loader.load(
            project.thumbnail,
            (texture) => {
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
                texture.needsUpdate = true;
                
                // Сохраняем текущую прозрачность если материал уже существует
                const currentOpacity = projectMeshes[screenIndex].mesh.material ? 
                    projectMeshes[screenIndex].mesh.material.opacity : 
                    projectMeshes[screenIndex].targetOpacity;
                
                projectMeshes[screenIndex].mesh.material = new THREE.MeshBasicMaterial({
                    map: texture,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: currentOpacity
                });
                projectMeshes[screenIndex].mesh.material.needsUpdate = true;
            },
            undefined,
            (error) => {
                console.error('✗ Ошибка загрузки текстуры:', error);
            }
        );
    });
}

// Обратная совместимость - старая функция вызывает новую
function updateScreenTexture() {
    updateProjectScreens();
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

        handleButtonClick(userData.action);
        
        // Анимация нажатия
        animateButtonPress(buttonToAnimate);
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
    if (isAnimating) return; // Блокируем переключение во время анимации
    currentProjectIndex = (currentProjectIndex + 1) % projects.length;
    startGalleryAnimation('next');
}

function prevProject() {
    if (isAnimating) return; // Блокируем переключение во время анимации
    currentProjectIndex = (currentProjectIndex - 1 + projects.length) % projects.length;
    startGalleryAnimation('prev');
}

// Запуск анимации перехода между проектами
function startGalleryAnimation(direction) {
    if (isProjectViewMode) {
        // В режиме просмотра проекта анимация не нужна
    updateScreenTexture();
        return;
    }
    
    // Расстояние между экранами (с учетом новых размеров)
    const screenDistance = 4.8;
    
    // Сохраняем текущие параметры перед началом анимации
    projectMeshes.forEach((projectMesh, index) => {
        projectMesh.currentScale = projectMesh.mesh.scale.x;
        projectMesh.currentOpacity = projectMesh.mesh.material ? projectMesh.mesh.material.opacity : (index === 1 ? 1.0 : 0.6);
    });
    
    // Сначала находим который экран находится за границей (скрытый)
    let hiddenScreenIndex = -1;
    for (let i = 0; i < 4; i++) {
        if (!projectMeshes[i].mesh.visible || Math.abs(projectMeshes[i].mesh.position.x) > 7.5) {
            hiddenScreenIndex = i;
            break;
        }
    }
    
    // Если не нашли скрытый, используем экран[3] (буферный)
    if (hiddenScreenIndex === -1) {
        hiddenScreenIndex = 3;
    }
    
    // Устанавливаем позиции из констант
    const positions = [PROJECT_POSITIONS.LEFT, PROJECT_POSITIONS.CENTER, PROJECT_POSITIONS.RIGHT];
    
    if (direction === 'next') {
        // Перемещаем скрытый экран за правый край для въезда
        projectMeshes[hiddenScreenIndex].mesh.visible = true;
        projectMeshes[hiddenScreenIndex].mesh.position.x = positions[2] + screenDistance;
        projectMeshes[hiddenScreenIndex].currentX = positions[2] + screenDistance;
        projectMeshes[hiddenScreenIndex].targetX = positions[2];
        projectMeshes[hiddenScreenIndex].currentScale = 0.8;
        projectMeshes[hiddenScreenIndex].currentOpacity = 0.6;
        projectMeshes[hiddenScreenIndex].mesh.scale.set(0.8, 0.8, 1);
        if (projectMeshes[hiddenScreenIndex].mesh.material) {
            projectMeshes[hiddenScreenIndex].mesh.material.opacity = 0.6;
        }
        
        // Остальные видимые экраны смещаются влево
        for (let i = 0; i < 4; i++) {
            if (i !== hiddenScreenIndex && projectMeshes[i].mesh.visible) {
                projectMeshes[i].currentX = projectMeshes[i].mesh.position.x;
                projectMeshes[i].targetX = projectMeshes[i].mesh.position.x - screenDistance;
            }
        }
        
    } else if (direction === 'prev') {
        // Перемещаем скрытый экран за левый край для въезда
        projectMeshes[hiddenScreenIndex].mesh.visible = true;
        projectMeshes[hiddenScreenIndex].mesh.position.x = positions[0] - screenDistance;
        projectMeshes[hiddenScreenIndex].currentX = positions[0] - screenDistance;
        projectMeshes[hiddenScreenIndex].targetX = positions[0];
        projectMeshes[hiddenScreenIndex].currentScale = 0.8;
        projectMeshes[hiddenScreenIndex].currentOpacity = 0.6;
        projectMeshes[hiddenScreenIndex].mesh.scale.set(0.8, 0.8, 1);
        if (projectMeshes[hiddenScreenIndex].mesh.material) {
            projectMeshes[hiddenScreenIndex].mesh.material.opacity = 0.6;
        }
        
        // Остальные видимые экраны смещаются вправо
        for (let i = 0; i < 4; i++) {
            if (i !== hiddenScreenIndex && projectMeshes[i].mesh.visible) {
                projectMeshes[i].currentX = projectMeshes[i].mesh.position.x;
                projectMeshes[i].targetX = projectMeshes[i].mesh.position.x + screenDistance;
            }
        }
        
    }
    
    // Устанавливаем целевые масштабы в зависимости от целевых позиций
    projectMeshes.forEach((projectMesh, index) => {
        // Кто будет в центре (targetX близок к 0)?
        const willBeInCenter = Math.abs(projectMesh.targetX) < 0.1;
        
        projectMesh.targetScale = willBeInCenter ? PROJECT_SIZES.ACTIVE_SCALE : PROJECT_SIZES.INACTIVE_SCALE;
        projectMesh.targetOpacity = willBeInCenter ? 1.0 : 0.6;
    });
    
    // Загружаем текстуру на найденный скрытый экран
    if (direction === 'next') {
        // Загружаем следующий проект
        loadProjectTexture(hiddenScreenIndex, (currentProjectIndex + 1) % projects.length);
    } else if (direction === 'prev') {
        // Загружаем предыдущий проект
        loadProjectTexture(hiddenScreenIndex, (currentProjectIndex - 1 + projects.length) % projects.length);
    }
    
    isAnimating = true;
    animationStartTime = performance.now();
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

// Обновление анимации галереи
function updateGalleryAnimation() {
    if (!isAnimating) return;
    
    // Вычисляем прогресс на основе времени
    const currentTime = performance.now();
    const elapsed = currentTime - animationStartTime;
    let progress = elapsed / animationDuration;
    
    if (progress >= 1.0) {
        progress = 1.0;
        isAnimating = false;
        
        // НЕ возвращаем позиции! Просто фиксируем текущее состояние
        projectMeshes.forEach((projectMesh, index) => {
            projectMesh.currentX = projectMesh.mesh.position.x;
            projectMesh.targetX = projectMesh.currentX;
            projectMesh.currentScale = projectMesh.mesh.scale.x;
            projectMesh.currentOpacity = projectMesh.mesh.material ? projectMesh.mesh.material.opacity : 0.6;
            
            // Скрываем экраны которые уехали за пределы видимой области
            const isOutOfBounds = Math.abs(projectMesh.mesh.position.x) > 7.5;
            if (isOutOfBounds) {
                projectMesh.mesh.visible = false;
            }
        });
        
        return;
    }
    
    const eased = easeInOutCubic(progress);
    
    // Обновляем позиции, масштаб и прозрачность для каждого экрана в рендер-сцене
    projectMeshes.forEach((projectMesh, index) => {
        // Интерполируем позицию X
        const newX = projectMesh.currentX + (projectMesh.targetX - projectMesh.currentX) * eased;
        projectMesh.mesh.position.x = newX;
        
        // Интерполируем масштаб
        const newScale = projectMesh.currentScale + (projectMesh.targetScale - projectMesh.currentScale) * eased;
        projectMesh.mesh.scale.set(newScale, newScale, 1);
        
        // Интерполируем прозрачность
        const newOpacity = projectMesh.currentOpacity + (projectMesh.targetOpacity - projectMesh.currentOpacity) * eased;
        if (projectMesh.mesh.material) {
            projectMesh.mesh.material.opacity = newOpacity;
        }
    });
}

// Анимационный цикл
function animate() {
    requestAnimationFrame(animate);
    
    // Обновляем анимацию галереи
    updateGalleryAnimation();
    
    // Рендерим проекты в текстуру
    renderToTexture();
    
    // Рендерим основную сцену
    renderer.render(scene, camera);
}

// Запуск при загрузке страницы
window.addEventListener('DOMContentLoaded', init);
