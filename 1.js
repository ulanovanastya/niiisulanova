document.addEventListener('DOMContentLoaded', function() {
    // DOM элементы
    const jsonUpload = document.getElementById('json-upload');
    const jsonInput = document.getElementById('json-input');
    const templateSelect = document.getElementById('template-select');
    const customTemplateSection = document.getElementById('custom-template-section');
    const customTemplate = document.getElementById('custom-template');
    const preview = document.getElementById('preview');
    const exportMdBtn = document.getElementById('export-md');
    const exportHtmlBtn = document.getElementById('export-html');
    const exportPdfBtn = document.getElementById('export-pdf');
    const loadExampleBtn = document.getElementById('load-example');

    // Шаблоны
    const templates = {
        default: `# {{название}}

## Технические характеристики

- **Тип:** {{тип}}
- **Дата создания:** {{дата_создания || "Не указана"}}
- **Версия:** {{версия || "1.0"}}

### Параметры:
{{#параметры}}
- **Напряжение:** {{напряжение}}
- **Ток:** {{ток}}
- **Диапазон температур:** {{диапазон}}
{{/параметры}}

## Описание

{{описание || "Описание не предоставлено"}}`,

        gost: `# ТЕХНИЧЕСКОЕ ОПИСАНИЕ
# {{название | uppercase}}

## 1. ОСНОВНЫЕ ПАРАМЕТРЫ И ХАРАКТЕРИСТИКИ

| Параметр | Значение |
|----------|----------|
| Тип | {{тип}} |
| Версия | {{версия || "1.0"}} |
| Дата создания | {{дата_создания || "Не указана"}} |

### 1.1. Электрические параметры

| Параметр | Значение | Условия |
|----------|----------|---------|
| Напряжение питания | {{параметры.напряжение}} | - |
| Потребляемый ток | {{параметры.ток}} | - |
| Диапазон рабочих температур | {{параметры.диапазон}} | - |

## 2. ОПИСАНИЕ

{{описание || "Описание не предоставлено"}}

Соответствует требованиям ГОСТ Р 12345-2016`
    };

    // Текущие данные
    let currentData = {};
    let currentTemplate = templates.default;

    // Инициализация приложения
    function init() {
        setupEventListeners();
        updatePreview();
    }

    // Настройка обработчиков событий
    function setupEventListeners() {
        jsonUpload.addEventListener('change', handleFileUpload);
        jsonInput.addEventListener('input', handleManualInput);
        templateSelect.addEventListener('change', handleTemplateChange);
        customTemplate.addEventListener('input', handleCustomTemplate);
        exportMdBtn.addEventListener('click', exportToMarkdown);
        exportHtmlBtn.addEventListener('click', exportToHtml);
        exportPdfBtn.addEventListener('click', exportToPdf);
        loadExampleBtn.addEventListener('click', loadExample);
    }

    // Загрузка файла JSON
    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                currentData = JSON.parse(e.target.result);
                jsonInput.value = JSON.stringify(currentData, null, 2);
                updatePreview();
            } catch (error) {
                alert('Ошибка при чтении JSON файла: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    // Ручной ввод JSON
    function handleManualInput() {
        try {
            currentData = JSON.parse(jsonInput.value || '{}');
            updatePreview();
        } catch (error) {
            // Не показываем ошибку при вводе
        }
    }

    // Изменение шаблона
    function handleTemplateChange() {
        const selectedTemplate = templateSelect.value;
        
        if (selectedTemplate === 'custom') {
            customTemplateSection.classList.remove('hidden');
            currentTemplate = customTemplate.value;
        } else {
            customTemplateSection.classList.add('hidden');
            currentTemplate = templates[selectedTemplate];
            if (selectedTemplate === 'gost') {
                preview.classList.add('gost-style');
            } else {
                preview.classList.remove('gost-style');
            }
        }
        
        updatePreview();
    }

    // Пользовательский шаблон
    function handleCustomTemplate() {
        currentTemplate = customTemplate.value;
        updatePreview();
    }

    // Обновление предпросмотра
    function updatePreview() {
        try {
            const compiled = compileTemplate(currentTemplate, currentData);
            preview.innerHTML = marked.parse(compiled);
        } catch (error) {
            preview.innerHTML = `<div class="error">Ошибка при генерации предпросмотра: ${error.message}</div>`;
        }
    }

    // Компиляция шаблона
    function compileTemplate(template, data) {
        return template.replace(/\{\{(.*?)\}\}/g, (match, path) => {
            // Поддержка вложенных свойств
            const parts = path.trim().split('.');
            let value = data;
            
            for (const part of parts) {
                // Поддержка || для значений по умолчанию
                if (part.includes('||')) {
                    const [key, defaultValue] = part.split('||').map(s => s.trim());
                    value = value[key] !== undefined ? value[key] : defaultValue;
                    break;
                }
                
                // Поддержка фильтров (например, uppercase)
                if (part.includes('|')) {
                    const [key, filter] = part.split('|').map(s => s.trim());
                    value = value[key];
                    if (filter === 'uppercase' && typeof value === 'string') {
                        value = value.toUpperCase();
                    }
                    break;
                }
                
                value = value[part];
                if (value === undefined) break;
            }
            
            return value !== undefined ? value : '';
        });
    }

    // Экспорт в Markdown
    function exportToMarkdown() {
        const compiled = compileTemplate(currentTemplate, currentData);
        const blob = new Blob([compiled], { type: 'text/markdown' });
        downloadFile(blob, 'документация.md');
    }

    // Экспорт в HTML
    function exportToHtml() {
        const compiled = compileTemplate(currentTemplate, currentData);
        const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Техническая документация</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #0056b3; border-bottom: 1px solid #eee; padding-bottom: 10px; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        table, th, td { border: 1px solid #ddd; }
        th, td { padding: 8px; text-align: left; }
    </style>
</head>
<body>
${marked.parse(compiled)}
</body>
</html>
        `;
        
        const blob = new Blob([html], { type: 'text/html' });
        downloadFile(blob, 'документация.html');
    }

    // Экспорт в PDF
    function exportToPdf() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Сохраняем текущий HTML для восстановления после преобразования
        const originalHtml = preview.innerHTML;
        
        // Добавляем стили для PDF
        preview.classList.add('pdf-export');
        
        html2canvas(preview).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = doc.internal.pageSize.getWidth() - 20;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            doc.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
            doc.save('документация.pdf');
            
            // Восстанавливаем оригинальный HTML
            preview.classList.remove('pdf-export');
            preview.innerHTML = originalHtml;
        });
    }

    // Загрузка примера
    function loadExample() {
        const exampleData = {
            "название": "Микросхема АЦП XYZ-2000",
            "тип": "Аналогово-цифровой преобразователь",
            "версия": "2.1",
            "дата_создания": "2023-10-15",
            "параметры": {
                "напряжение": "5В ±5%",
                "ток": "10мА в режиме ожидания, 50мА максимальный",
                "диапазон": "-40°C до +85°C"
            },
            "описание": "Высокоточный аналогово-цифровой преобразователь с 16-битным разрешением. Предназначен для использования в измерительных системах высокой точности."
        };
        
        currentData = exampleData;
        jsonInput.value = JSON.stringify(exampleData, null, 2);
        updatePreview();
    }

    // Вспомогательная функция для скачивания файла
    function downloadFile(blob, filename) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Запуск приложения
    init();
});



