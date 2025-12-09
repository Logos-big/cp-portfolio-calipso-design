// Скрипт для автоматического получения данных из Figma
// Использование: node scripts/figma-sync.js

const fs = require('fs');
const path = require('path');

// Загрузка конфигурации
let FIGMA_CONFIG = {
    fileKey: 'YOUR_FIGMA_FILE_KEY',
    token: 'YOUR_FIGMA_TOKEN',
    nodeIds: []
};

const configPath = path.join(__dirname, 'figma-config.json');
if (fs.existsSync(configPath)) {
    try {
        const configData = fs.readFileSync(configPath, 'utf8');
        FIGMA_CONFIG = { ...FIGMA_CONFIG, ...JSON.parse(configData) };
    } catch (error) {
        console.warn('⚠️  Не удалось загрузить figma-config.json, используем значения по умолчанию');
    }
}

// Получение данных из Figma API
async function fetchFigmaData() {
    const fileKey = FIGMA_CONFIG.fileKey;
    const token = FIGMA_CONFIG.token;
    
    if (!fileKey || fileKey === 'YOUR_FIGMA_FILE_KEY') {
        console.error('❌ Укажите FILE_KEY в scripts/figma-config.json');
        console.error('   Скопируйте scripts/figma-config.json.example в scripts/figma-config.json');
        return null;
    }
    
    if (!token || token === 'YOUR_FIGMA_TOKEN') {
        console.error('❌ Укажите TOKEN в scripts/figma-config.json');
        console.error('   Получите токен: Figma → Settings → Account → Personal Access Tokens');
        return null;
    }
    
    try {
        const url = `https://api.figma.com/v1/files/${fileKey}`;
        const response = await fetch(url, {
            headers: {
                'X-Figma-Token': token
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Ошибка получения данных из Figma:', error);
        return null;
    }
}

// Извлечение цветов из макета
function extractColors(figmaData) {
    const colors = {};
    
    function traverse(node) {
        if (node.type === 'RECTANGLE' || node.type === 'FRAME' || node.type === 'COMPONENT') {
            if (node.fills && node.fills.length > 0) {
                const fill = node.fills[0];
                if (fill.type === 'SOLID') {
                    const color = fill.color;
                    const hex = rgbToHex(color.r, color.g, color.b);
                    const name = node.name || 'unnamed';
                    colors[name] = {
                        hex: hex,
                        rgb: `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`,
                        opacity: fill.opacity || 1
                    };
                }
            }
        }
        
        if (node.children) {
            node.children.forEach(child => traverse(child));
        }
    }
    
    if (figmaData.document) {
        traverse(figmaData.document);
    }
    
    return colors;
}

// Извлечение типографики
function extractTypography(figmaData) {
    const typography = {};
    
    function traverse(node) {
        if (node.type === 'TEXT') {
            const style = node.style || {};
            const name = node.name || 'unnamed';
            typography[name] = {
                fontFamily: style.fontFamily || 'Inter',
                fontSize: style.fontSize || 16,
                fontWeight: style.fontWeight || 400,
                lineHeight: style.lineHeightPx || style.fontSize || 16,
                letterSpacing: style.letterSpacing || 0
            };
        }
        
        if (node.children) {
            node.children.forEach(child => traverse(child));
        }
    }
    
    if (figmaData.document) {
        traverse(figmaData.document);
    }
    
    return typography;
}

// Извлечение размеров и отступов
function extractSpacing(figmaData) {
    const spacing = {};
    
    function traverse(node) {
        if (node.type === 'FRAME' || node.type === 'COMPONENT') {
            const name = node.name || 'unnamed';
            spacing[name] = {
                width: node.absoluteBoundingBox?.width || 0,
                height: node.absoluteBoundingBox?.height || 0,
                padding: {
                    top: node.paddingTop || 0,
                    right: node.paddingRight || 0,
                    bottom: node.paddingBottom || 0,
                    left: node.paddingLeft || 0
                }
            };
        }
        
        if (node.children) {
            node.children.forEach(child => traverse(child));
        }
    }
    
    if (figmaData.document) {
        traverse(figmaData.document);
    }
    
    return spacing;
}

// Конвертация RGB в HEX
function rgbToHex(r, g, b) {
    const toHex = (n) => {
        const hex = Math.round(n * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// Генерация CSS файла с переменными
function generateCSS(colors, typography, spacing) {
    let css = ':root {\n';
    
    // Цвета
    css += '\n  /* Colors from Figma */\n';
    Object.entries(colors).forEach(([name, color]) => {
        const varName = `--color-${name.toLowerCase().replace(/\s+/g, '-')}`;
        css += `  ${varName}: ${color.hex};\n`;
    });
    
    // Типографика
    css += '\n  /* Typography from Figma */\n';
    Object.entries(typography).forEach(([name, style]) => {
        const varName = `--font-${name.toLowerCase().replace(/\s+/g, '-')}`;
        css += `  ${varName}-family: '${style.fontFamily}', sans-serif;\n`;
        css += `  ${varName}-size: ${style.fontSize}px;\n`;
        css += `  ${varName}-weight: ${style.fontWeight};\n`;
    });
    
    // Отступы
    css += '\n  /* Spacing from Figma */\n';
    Object.entries(spacing).forEach(([name, size]) => {
        const varName = `--spacing-${name.toLowerCase().replace(/\s+/g, '-')}`;
        css += `  ${varName}-width: ${size.width}px;\n`;
        css += `  ${varName}-height: ${size.height}px;\n`;
    });
    
    css += '}\n';
    return css;
}

// Сохранение данных в JSON
function saveData(colors, typography, spacing) {
    const data = {
        colors,
        typography,
        spacing,
        exportedAt: new Date().toISOString()
    };
    
    const dataPath = path.join(__dirname, '..', 'figma-data.json');
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    console.log('✅ Данные сохранены в figma-data.json');
}

// Главная функция
async function main() {
    console.log('🔄 Загрузка данных из Figma...\n');
    
    const figmaData = await fetchFigmaData();
    if (!figmaData) {
        return;
    }
    
    console.log('📊 Извлечение данных из макета...\n');
    
    const colors = extractColors(figmaData);
    const typography = extractTypography(figmaData);
    const spacing = extractSpacing(figmaData);
    
    console.log(`✅ Найдено:`);
    console.log(`   - Цветов: ${Object.keys(colors).length}`);
    console.log(`   - Стилей текста: ${Object.keys(typography).length}`);
    console.log(`   - Компонентов: ${Object.keys(spacing).length}\n`);
    
    // Сохранение данных
    saveData(colors, typography, spacing);
    
    // Генерация CSS
    const css = generateCSS(colors, typography, spacing);
    const cssPath = path.join(__dirname, '..', 'styles', 'figma-variables.css');
    fs.writeFileSync(cssPath, css);
    console.log('✅ CSS переменные сохранены в styles/figma-variables.css\n');
    
    console.log('🎉 Готово! Данные из Figma синхронизированы.');
}

// Запуск
if (typeof fetch === 'undefined') {
    console.error('❌ Требуется Node.js 18+ с поддержкой fetch API');
    console.log('Или установите: npm install node-fetch');
} else {
    main().catch(console.error);
}

