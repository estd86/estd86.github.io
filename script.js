// Элементы DOM
const intervalButtons = document.querySelectorAll('.interval-btn');
const prevPeriodBtn = document.getElementById('prev-period');
const nextPeriodBtn = document.getElementById('next-period');
const periodDisplay = document.getElementById('period-display');
const chartCanvas = document.getElementById('waterChart');
const noDataMessage = document.getElementById('no-data-message');
const statsContainer = document.getElementById('stats-container');
const fileInput = document.getElementById('data-file');
const fileNameDisplay = document.getElementById('current-file-name');
const iosHelp = document.getElementById('ios-help');
// Проверяем iOS
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

// Переменные для данных и графика
let waterData = [];
let groupedDailyData = [];
let currentDaysInterval = 7;
let currentStartIndex = 0; // Индекс начала текущего периода
let waterChart = null;

// Обработчики кнопок интервала
intervalButtons.forEach(button => {
    button.addEventListener('click', function() {
        // Убираем активный класс со всех кнопок
        intervalButtons.forEach(btn => btn.classList.remove('active'));
        // Добавляем активный класс на нажатую кнопку
        this.classList.add('active');
        // Устанавливаем новый интервал
        currentDaysInterval = parseInt(this.getAttribute('data-days'));
        // Сбрасываем на последний период
        resetToLastPeriod();
        // Обновляем график
        updateChart();
    });
});

// Обработчики кнопок навигации
prevPeriodBtn.addEventListener('click', () => {
    moveToPreviousPeriod();
    updateChart();
});

nextPeriodBtn.addEventListener('click', () => {
    moveToNextPeriod();
    updateChart();
});

// Обработчик выбора файла
fileInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        fileNameDisplay.textContent = `Загружаем: ${file.name}`;
        // Для iOS добавляем небольшую задержку
        if (isIOS) {
            setTimeout(() => readFile(file), 100);
        } else {
            readFile(file);
        }
    }
});

// Чтение файла
function readFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const dataString = e.target.result;
            // Проверка на пустой файл
            if (!dataString || dataString.trim() === '') {
                throw new Error('Файл пустой');
            }
            
            processData(dataString);
            fileNameDisplay.textContent = `Загружен: ${file.name}`;
            enableControls();
            
            // Скрываем сообщение для iOS после успешной загрузки
            iosHelp.style.display = 'none';
        } catch (error) {
            console.error('Ошибка обработки файла:', error);
            showError(`Ошибка обработки: ${error.message}`);
        }
    };
    
    reader.onerror = function() {
        showError('Ошибка при чтении файла');
        if (isIOS) {
            iosHelp.style.display = 'block';
        }
    };
    
    reader.onabort = function() {
        showError('Чтение файла прервано');
    };
    
    try {
        reader.readAsText(file, 'UTF-8');
    } catch (error) {
        showError(`Не удалось прочитать файл: ${error.message}`);
    }
}

// Показать ошибку
function showError(message) {
    fileNameDisplay.textContent = message;
    fileNameDisplay.style.color = '#ff6b6b';
    
    // Сброс через 3 секунды
    setTimeout(() => {
        fileNameDisplay.textContent = 'Файл не выбран';
        fileNameDisplay.style.color = '';
    }, 3000);
}

// Активация элементов управления
function enableControls() {
    intervalButtons.forEach(btn => btn.disabled = false);
    prevPeriodBtn.disabled = false;
    nextPeriodBtn.disabled = false;
}

// Сброс к последнему периоду
function resetToLastPeriod() {
    if (groupedDailyData.length === 0) return;
    // Устанавливаем начало так, чтобы показывать последние N дней
    currentStartIndex = Math.max(0, groupedDailyData.length - currentDaysInterval);
}

// Переход к предыдущему периоду (более ранние даты)
function moveToPreviousPeriod() {
    if (groupedDailyData.length === 0) return;
    // Сдвигаемся назад на текущий интервал
    currentStartIndex = Math.max(0, currentStartIndex - currentDaysInterval);
}

// Переход к следующему периоду (более поздние даты)
function moveToNextPeriod() {
    if (groupedDailyData.length === 0) return;
    // Сдвигаемся вперед на текущий интервал
    currentStartIndex = Math.min(
        groupedDailyData.length - currentDaysInterval, 
        currentStartIndex + currentDaysInterval
    );
}

// Преобразование даты из формата ДД.ММ.ГГГГ в YYYY-MM-DD для корректной сортировки
function parseCustomDate(dateStr) {
    const parts = dateStr.split('.');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
}

// Обработка данных из файла
function processData(dataString) {
    try {
        const lines = dataString.trim().split('\n');
        waterData = [];
        
        let lineNumber = 0;
        for (const line of lines) {
            lineNumber++;
            const trimmedLine = line.trim();
            if (trimmedLine === '') continue; // Пропускаем пустые строки
            
            const parts = trimmedLine.split(';');
            if (parts.length < 4) {
                console.warn(`Строка ${lineNumber} пропущена: неверный формат`);
                continue;
            }
            
            const dateStr = parts[0].trim();
            const timeStr = parts[1].trim();
            const water = parseInt(parts[2]) || 0;
            const otherWater = parseInt(parts[3]) || 0;
            const totalWater = water + otherWater;
            
            // Проверка формата даты
            if (!/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
                console.warn(`Строка ${lineNumber}: неверный формат даты: ${dateStr}`);
                continue;
            }
            
            const isoDateStr = parseCustomDate(dateStr);
            const dateTime = new Date(`${isoDateStr}T${timeStr}`);
            
            waterData.push({
                originalDate: dateStr, // сохраняем оригинальный формат даты
                date: isoDateStr, // используем ISO формат для сортировки
                time: timeStr,
                dateTime: dateTime,
                water: water,
                otherWater: otherWater,
                total: totalWater
            });
        }
        
        if (waterData.length === 0) {
            throw new Error('Нет корректных данных в файле');
        }
        
        // Сортируем данные по дате
        waterData.sort((a, b) => a.dateTime - b.dateTime);
        
        // Группируем данные по дням
        groupedDailyData = groupDataByDay(waterData);
        
        // Сбрасываем на последний период
        resetToLastPeriod();
        
        // Обновляем график и статистику
        updateChart();
        
    } catch (error) {
        console.error('Ошибка обработки данных:', error);
        throw error;
    }
}

// Группировка данных по дням
function groupDataByDay(data) {
    const grouped = {};
    
    data.forEach(entry => {
        // Используем оригинальный формат даты для группировки
        const date = entry.originalDate;
        
        if (!grouped[date]) {
            grouped[date] = {
                originalDate: date,
                date: entry.date,
                total: 0,
                water: 0,
                otherWater: 0,
                count: 0
            };
        }
        
        grouped[date].total += entry.total;
        grouped[date].water += entry.water;
        grouped[date].otherWater += entry.otherWater;
        grouped[date].count++;
    });
    
    // Преобразуем объект в массив и сортируем по дате
    return Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Получение данных для текущего периода
function getCurrentPeriodData() {
    if (groupedDailyData.length === 0) return [];
    
    // Вычисляем конечный индекс
    const endIndex = Math.min(currentStartIndex + currentDaysInterval, groupedDailyData.length);
    
    // Возвращаем данные для текущего периода
    return groupedDailyData.slice(currentStartIndex, endIndex);
}

// Обновление отображаемого периода
function updatePeriodDisplay() {
    if (groupedDailyData.length === 0) {
        periodDisplay.textContent = 'Загрузите файл с данными';
        prevPeriodBtn.disabled = true;
        nextPeriodBtn.disabled = true;
        return;
    }
    
    const periodData = getCurrentPeriodData();
    
    if (periodData.length === 0) {
        periodDisplay.textContent = 'Нет данных для периода';
        prevPeriodBtn.disabled = true;
        nextPeriodBtn.disabled = true;
        return;
    }
    
    // Получаем даты начала и конца периода
    const startDate = periodData[0]?.originalDate || '';
    const endDate = periodData[periodData.length - 1]?.originalDate || '';
    
    // Форматируем для отображения
    let displayText;
    if (startDate && endDate) {
        const isLastPeriod = (currentStartIndex + currentDaysInterval) >= groupedDailyData.length;
        
        if (isLastPeriod) {
            displayText = `Последние ${periodData.length} дней`;
        } else {
            displayText = `${startDate} - ${endDate}`;
        }
    } else {
        displayText = `Период: ${periodData.length} из ${groupedDailyData.length} дней`;
    }
    
    periodDisplay.textContent = displayText;
    
    // Управляем состоянием кнопок навигации
    prevPeriodBtn.disabled = currentStartIndex === 0;
    nextPeriodBtn.disabled = (currentStartIndex + currentDaysInterval) >= groupedDailyData.length;
}

// Обновление графика
function updateChart() {
    if (groupedDailyData.length === 0) {
        noDataMessage.style.display = 'block';
        chartCanvas.style.display = 'none';
        statsContainer.style.display = 'none';
        return;
    }
    
    noDataMessage.style.display = 'none';
    chartCanvas.style.display = 'block';
    statsContainer.style.display = 'flex';
    
    // Получаем данные для текущего периода
    const periodData = getCurrentPeriodData();
    
    // Обновляем отображение периода
    updatePeriodDisplay();
    
    const labels = periodData.map(item => item.originalDate);
    const waterOnly = periodData.map(item => item.water);
    const otherWater = periodData.map(item => item.otherWater);
    
    // Если график уже существует, уничтожаем его
    if (waterChart) {
        waterChart.destroy();
    }
    
    // Создаем новый график
    const ctx = chartCanvas.getContext('2d');
    waterChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Выпил',
                    data: waterOnly,
                    backgroundColor: '#44b7c2',
                    borderColor: '#1a8791',
                    borderWidth: 1
                },
                {
                    label: 'Вышло',
                    data: otherWater,
                    backgroundColor: '#ffad49',
                    borderColor: '#db841a',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            size: 12
                        },
                        padding: 15
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += context.parsed.y + ' мл';
                            return label;
                        },
                        afterLabel: function(context) {
                            if (context.datasetIndex === 0) {
                                const total = waterOnly[context.dataIndex] + otherWater[context.dataIndex];
                                return `Всего: ${total} мл`;
                            }
                            return null;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: false,
                        text: 'Дата',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    title: {
                        display: false,
                        text: 'Объем (мл)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value + ' мл';
                        }
                    }
                }
            }
        }
    });
    
    // Обновляем статистику
    updateStatistics();
}

// Обновление статистики
function updateStatistics() {
    if (groupedDailyData.length === 0) return;

    // Получаем данные для текущего периода
    const periodData = getCurrentPeriodData();

    if (periodData.length === 0) {
        statsContainer.innerHTML = `
            <div class="stat-card water">
                <h3>Основная вода</h3>
                <div class="stat-item">
                    <span class="stat-label">Всего за период</span>
                    <span class="stat-value">0 мл</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Среднее в день</span>
                    <span class="stat-value">0 мл</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Максимум</span>
                    <span class="stat-value">0 мл</span>
                </div>
                <div class="max-date">Нет данных</div>
            </div>
            <div class="stat-card other-water">
                <h3>Другая вода</h3>
                <div class="stat-item">
                    <span class="stat-label">Всего за период</span>
                    <span class="stat-value">0 мл</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Среднее в день</span>
                    <span class="stat-value">0 мл</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Максимум</span>
                    <span class="stat-value">0 мл</span>
                </div>
                <div class="max-date">Нет данных</div>
            </div>
        `;
        return;
    }

    // Расчет статистики для Основной воды
    const totalWater = periodData.reduce((sum, day) => sum + day.water, 0);
    const averageWater = Math.round(totalWater / periodData.length);
    const maxWaterDay = periodData.reduce((max, day) => day.water > max.water ? day : max, {water: 0, originalDate: ''});

    // Расчет статистики для Другой воды
    const totalOtherWater = periodData.reduce((sum, day) => sum + day.otherWater, 0);
    const averageOtherWater = Math.round(totalOtherWater / periodData.length);
    const maxOtherWaterDay = periodData.reduce((max, day) => day.otherWater > max.otherWater ? day : max, {otherWater: 0, originalDate: ''});

    // Расчет статистики для Общего потребления
    const totalCombined = periodData.reduce((sum, day) => sum + day.total, 0);
    const averageCombined = Math.round(totalCombined / periodData.length);
    const maxCombinedDay = periodData.reduce((max, day) => day.total > max.total ? day : max, {total: 0, originalDate: ''});

    // Форматируем значения
    const formatML = (value) => {
        if (value >= 1000) {
            return (value / 1000).toFixed(1) + ' л';
        }
        return value + ' мл';
    };

    // Создаем HTML для статистики
    statsContainer.innerHTML = `
        <div class="stat-card water">
            <h3>Основная вода</h3>
            <div class="stat-item">
                <span class="stat-label">Всего за период</span>
                <span class="stat-value">${formatML(totalWater)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Среднее в день</span>
                <span class="stat-value">${formatML(averageWater)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Максимум ${maxWaterDay.originalDate || 'Нет данных'}</span>
                <span class="stat-value">${formatML(maxWaterDay.water)}</span>
            </div>
        </div>
        <div class="stat-card other-water">
            <h3>Другая вода</h3>
            <div class="stat-item">
                <span class="stat-label">Всего за период</span>
                <span class="stat-value">${formatML(totalOtherWater)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Среднее в день</span>
                <span class="stat-value">${formatML(averageOtherWater)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Максимум ${maxOtherWaterDay.originalDate || 'Нет данных'}</span>
                <span class="stat-value">${formatML(maxOtherWaterDay.otherWater)}</span>
            </div>
        </div>
    `;
}

// Инициализация при загрузке страницы
window.addEventListener('DOMContentLoaded', function() {
    // Все элементы изначально неактивны
    prevPeriodBtn.disabled = true;
    nextPeriodBtn.disabled = true;
    intervalButtons.forEach(btn => btn.disabled = true);
});