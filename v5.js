/**
 * Unified Calendar Management System
 * Оптимизированная версия, объединяющая функциональность из трех файлов
 *
 * Единый источник правды для всех данных календаря.
 * Все взаимодействия с localStorage происходят только через методы этого класса.
 */

// Константы для работы с датами
const MONTH_MAP = {
    'January': '01', 'February': '02', 'March': '03', 'April': '04',
    'May': '05', 'June': '06', 'July': '07', 'August': '08',
    'September': '09', 'October': '10', 'November': '11', 'December': '12'
};

const REVERSE_MONTH_MAP = {
    '01': 'January', '02': 'February', '03': 'March', '04': 'April',
    '05': 'May', '06': 'June', '07': 'July', '08': 'August',
    '09': 'September', '10': 'October', '11': 'November', '12': 'December'
};

/**
 * Менеджер для работы с локальным хранилищем
 */
class StorageManager {
    /**
     * Сохранение данных в localStorage с обработкой ошибок
     * @param {string} key - Ключ для сохранения
     * @param {any} data - Данные для сохранения
     * @returns {boolean} - Успешность операции
     */
    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Ошибка сохранения в localStorage:', error);
            return false;
        }
    }

    /**
     * Загрузка данных из localStorage с обработкой ошибок
     * @param {string} key - Ключ для загрузки
     * @param {any} defaultValue - Значение по умолчанию
     * @returns {any} - Загруженные данные или значение по умолчанию
     */
    load(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Ошибка загрузки из localStorage:', error);
            return defaultValue;
        }
    }

    /**
     * Удаление данных из localStorage с обработкой ошибок
     * @param {string} key - Ключ для удаления
     * @returns {boolean} - Успешность операции
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Ошибка удаления из localStorage:', error);
            return false;
        }
    }

    /**
     * Удаление всех данных по шаблону ключа
     * @param {RegExp} pattern - Регулярное выражение для фильтрации ключей
     * @returns {boolean} - Успешность операции
     */
    removeByPattern(pattern) {
        try {
            Object.keys(localStorage).forEach(key => {
                if (pattern.test(key)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.error('Ошибка удаления данных по шаблону:', error);
            return false;
        }
    }
}

class UnifiedCalendarManager {
    constructor() {
        // Инициализация менеджера хранилища
        this.storage = new StorageManager();

        // Данные календаря
        this.calendarData = {
            dateRanges: [],           // Выбранные диапазоны дат
            excludedDates: new Set(), // Исключенные даты
            dateDiscounts: {},        // Скидки для дат {timestamp: discountedPrice}
            blockedDates: {},         // Заблокированные даты по месяцам {yearMonth: [{date, price}]}
            basePrices: {},           // Базовые цены по месяцам {yearMonth: {prices: [{date, price}], defaultCost}}
            globalSettings: {         // Глобальные настройки
                defaultCost: 250
            }
        };

        // Состояние выбора диапазона
        this.tempSelection = {
            start: null,
            startMonth: null,
            startYear: null,
            isRangeConfirmed: true
        };

        // Текущий месяц
        this.currentMonthKey = this.getCurrentMonthKey() || this.getDefaultMonthKey();

        // Инициализация
        this.init();
    }

    /**
     * Инициализация менеджера календаря
     */
    init() {
        // Загружаем настройки
        this.loadGlobalSettings();
        this.loadMonthData(this.currentMonthKey);

        // Инициализируем обработчики событий
        this.initHandlers();

        // Проверяем состояние чекбокса скидки для выходных дней при загрузке
        setTimeout(() => {
            this.checkWeekendDiscountCheckbox();
        }, 500);

        // Обновляем календарь
        this.updateCalendar();

        // Логируем информацию о запуске
        console.log(`[UnifiedCalendarManager] Инициализирован для месяца ${this.currentMonthKey}`);
    }

    /**
     * Получение ключа текущего месяца в формате "YYYY-MM"
     */
    getCurrentMonthKey() {
        const monthYearElement = document.querySelector('[current_month_year]');
        if (!monthYearElement) return null;

        try {
            const [monthName, year] = monthYearElement.textContent.trim().split(' ');
            if (!monthName || !year || !MONTH_MAP[monthName]) {
                console.error(`[UnifiedCalendarManager] Неверный формат месяца и года: ${monthYearElement.textContent}`);
                return null;
            }

            const monthNum = MONTH_MAP[monthName];
            return `${year}-${monthNum}`;
        } catch (error) {
            console.error(`[UnifiedCalendarManager] Ошибка получения текущего месяца:`, error);
            return null;
        }
    }

    /**
     * Получение ключа месяца по умолчанию (текущий месяц и год)
     */
    getDefaultMonthKey() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }

    /**
     * Форматирование даты в строку "DD.MM.YYYY"
     * @param {number|string} day - День
     * @param {number|string} month - Месяц
     * @param {number|string} year - Год
     * @returns {string} - Отформатированная дата
     */
    formatDate(day, month, year) {
        // Проверка параметров
        if (!day || !month || !year) {
            console.error(`[UnifiedCalendarManager] Неверные параметры даты: день=${day}, месяц=${month}, год=${year}`);
            return '';
        }

        try {
            return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
        } catch (error) {
            console.error(`[UnifiedCalendarManager] Ошибка форматирования даты:`, error);
            return '';
        }
    }

    /**
     * Создание полной структуры даты
     * @param {number|string} day - День
     * @param {string} monthName - Название месяца
     * @param {number|string} year - Год
     * @returns {Object|null} - Объект даты или null при ошибке
     */
    createFullDate(day, monthName, year) {
        try {
            if (!MONTH_MAP[monthName]) {
                console.error(`[UnifiedCalendarManager] Неизвестный месяц: ${monthName}`);
                return null;
            }

            const monthNum = MONTH_MAP[monthName];
            const dateObj = new Date(parseInt(year), parseInt(monthNum) - 1, parseInt(day));

            // Проверка валидности даты
            if (isNaN(dateObj.getTime())) {
                console.error(`[UnifiedCalendarManager] Невалидная дата: ${day}.${monthNum}.${year}`);
                return null;
            }

            return {
                day: parseInt(day),
                month: monthNum,
                year: parseInt(year),
                timestamp: dateObj.getTime()
            };
        } catch (error) {
            console.error(`[UnifiedCalendarManager] Ошибка создания объекта даты:`, error);
            return null;
        }
    }

    /**
     * Получение базовой стоимости
     * @returns {number} - Базовая стоимость
     */
    getBasePrice() {
        const costInput = document.querySelector('input[name="cost_per_hour"]');
        const defaultCost = this.calendarData.globalSettings.defaultCost;

        if (!costInput) {
            console.warn('[UnifiedCalendarManager] Элемент ввода стоимости не найден, используется значение по умолчанию');
            return defaultCost;
        }

        const inputValue = parseInt(costInput.value);
        if (isNaN(inputValue) || inputValue <= 0) {
            console.warn(`[UnifiedCalendarManager] Некорректное значение стоимости: ${costInput.value}, используется значение по умолчанию`);
            return defaultCost;
        }

        return inputValue;
    }

    /**
     * Применение процентной скидки к цене
     * @param {number} basePrice - Базовая цена
     * @param {string|number} discountStr - Процент скидки (строка или число)
     * @returns {number} - Цена со скидкой
     */
    applyDiscount(basePrice, discountStr) {
        let discountValue;

        // Преобразуем скидку в число
        if (typeof discountStr === 'string') {
            discountValue = parseInt(discountStr.replace(/[^\d.]/g, ''));
        } else if (typeof discountStr === 'number') {
            discountValue = discountStr;
        } else {
            console.error(`[UnifiedCalendarManager] Неверный тип скидки: ${typeof discountStr}`);
            return basePrice;
        }

        // Проверяем корректность скидки
        if (isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
            console.error(`[UnifiedCalendarManager] Некорректное значение скидки: ${discountStr}`);
            return basePrice;
        }

        // Рассчитываем и округляем цену со скидкой
        return Math.round(basePrice * (100 - discountValue) / 100);
    }

    /**
     * Проверка, входит ли дата в какой-либо диапазон
     * @param {Object} fullDate - Объект даты
     * @returns {boolean} - true, если дата входит в диапазон
     */
    isDateInRanges(fullDate) {
        if (!fullDate || !fullDate.timestamp) {
            console.error('[UnifiedCalendarManager] Передан неверный объект даты в isDateInRanges');
            return false;
        }

        return this.calendarData.dateRanges.some(range => {
            return fullDate.timestamp >= range.start.timestamp &&
                   fullDate.timestamp <= range.end.timestamp;
        });
    }

    /**
     * Проверка, исключена ли дата
     * @param {number} timestamp - Временная метка даты
     * @returns {boolean} - true, если дата исключена
     */
    isDateExcluded(timestamp) {
        if (!timestamp || isNaN(timestamp)) {
            console.error('[UnifiedCalendarManager] Передана неверная временная метка в isDateExcluded');
            return false;
        }

        return this.calendarData.excludedDates.has(timestamp);
    }

    /**
     * Проверка, заблокирована ли дата
     * @param {string} dateString - Строка даты в формате DD.MM.YYYY
     * @param {string} monthYearKey - Ключ месяца в формате YYYY-MM
     * @returns {boolean} - true, если дата заблокирована
     */
    isDateBlocked(dateString, monthYearKey) {
        if (!dateString || !monthYearKey) {
            console.error(`[UnifiedCalendarManager] Неверные параметры в isDateBlocked: дата=${dateString}, ключ=${monthYearKey}`);
            return false;
        }

        if (!this.calendarData.blockedDates[monthYearKey]) return false;

        return this.calendarData.blockedDates[monthYearKey].some(item => {
            if (typeof item === 'object' && item.date) {
                return item.date === dateString;
            }
            return item === dateString;
        });
    }

    /**
     * Получение цены для заблокированной даты
     * @param {string} dateString - Строка даты в формате DD.MM.YYYY
     * @param {string} monthYearKey - Ключ месяца в формате YYYY-MM
     * @returns {number} - Цена для заблокированной даты или 0 по умолчанию
     */
    getBlockedDatePrice(dateString, monthYearKey) {
        if (!dateString || !monthYearKey) {
            console.error(`[UnifiedCalendarManager] Неверные параметры в getBlockedDatePrice: дата=${dateString}, ключ=${monthYearKey}`);
            return 0;
        }

        if (!this.calendarData.blockedDates[monthYearKey]) return 0;

        const blockedItem = this.calendarData.blockedDates[monthYearKey].find(item => {
            if (typeof item === 'object' && item.date) {
                return item.date === dateString;
            }
            return item === dateString;
        });

        if (!blockedItem) return 0;
        return typeof blockedItem === 'object' ? blockedItem.price : 0;
    }

    /**
     * Проверка, пересекается ли новый диапазон с существующими
     * @param {number} newStart - Начальная временная метка нового диапазона
     * @param {number} newEnd - Конечная временная метка нового диапазона
     * @returns {boolean} - true, если есть пересечение
     */
    isRangeOverlap(newStart, newEnd) {
        if (!newStart || !newEnd || isNaN(newStart) || isNaN(newEnd)) {
            console.error(`[UnifiedCalendarManager] Неверные параметры в isRangeOverlap: начало=${newStart}, конец=${newEnd}`);
            return false;
        }

        return this.calendarData.dateRanges.some(range =>
            (newStart <= range.end.timestamp && newEnd >= range.start.timestamp)
        );
    }

    /**
     * Загрузка глобальных настроек из localStorage
     */
    loadGlobalSettings() {
        const storedSettings = this.storage.load('calendarGlobalSettings');
        if (storedSettings) {
            this.calendarData.globalSettings = storedSettings;
        }

        // Обновляем поля ввода
        const costInput = document.querySelector('input[name="cost_per_hour"]') ||
                           document.querySelector('input[name="cost_per_show"]');
        if (costInput) {
            costInput.value = this.calendarData.globalSettings.defaultCost;
        }
    }

    /**
     * Сохранение глобальных настроек в localStorage
     */
    saveGlobalSettings() {
        const defaultCost = this.getBasePrice();
        this.calendarData.globalSettings.defaultCost = defaultCost;

        this.storage.save('calendarGlobalSettings', this.calendarData.globalSettings);

        // Обновляем базовую стоимость для всех месяцев
        Object.keys(this.calendarData.basePrices).forEach(monthKey => {
            this.calendarData.basePrices[monthKey].defaultCost = defaultCost;
            
            // Обновляем цены для дней, у которых не установлена индивидуальная цена
            const prices = this.calendarData.basePrices[monthKey].prices;
            if (prices && Array.isArray(prices)) {
                prices.forEach(priceObj => {
                    // Если это не заблокированный день и не день со скидкой
                    if (priceObj.price !== 0 && !this.calendarData.dateDiscounts[this.getTimestampFromDateString(priceObj.date, monthKey)]) {
                        priceObj.price = defaultCost;
                    }
                });
            }
            
            this.saveMonthData(monthKey);
        });

        // Перезагружаем цены для текущего месяца и обновляем отображение
        this.loadMonthPrices();
        this.updateAllDaysDisplay();
        
        console.log(`[UnifiedCalendarManager] Базовая стоимость обновлена: ${defaultCost}`);
    }

    /**
     * Получение временной метки из строки даты
     * @param {string} dateString - Строка даты в формате DD.MM.YYYY
     * @param {string} monthKey - Ключ месяца в формате YYYY-MM
     * @returns {number} - Временная метка
     */
    getTimestampFromDateString(dateString, monthKey) {
        try {
            if (!dateString || !dateString.includes('.')) return 0;
            
            const [day, month, year] = dateString.split('.').map(Number);
            if (isNaN(day) || isNaN(month) || isNaN(year)) return 0;
            
            return new Date(year, month - 1, day).getTime();
        } catch (error) {
            console.error(`[UnifiedCalendarManager] Ошибка получения временной метки: ${error}`);
            return 0;
        }
    }

    /**
     * Загрузка данных месяца из localStorage
     * @param {string} monthKey - Ключ месяца в формате YYYY-MM
     */
    loadMonthData(monthKey) {
        if (!monthKey) {
            console.error('[UnifiedCalendarManager] Не указан ключ месяца для загрузки данных');
            return;
        }

        // Загружаем базовые цены
        const storedPrices = this.storage.load(`monthData-${monthKey}`);
        const defaultCost = this.calendarData.globalSettings.defaultCost;

        this.calendarData.basePrices[monthKey] = storedPrices
            ? storedPrices
            : { prices: [], defaultCost: defaultCost };

        // Загружаем заблокированные даты
        const storedBlocked = this.storage.load('blockedDatesMap', {});
        this.calendarData.blockedDates = storedBlocked;

        // Гарантируем наличие цен для всех дней
        this.ensureBasePrices(monthKey);

        console.log(`[UnifiedCalendarManager] Данные месяца ${monthKey} загружены`);
    }

    /**
     * Применение скидки к выходным дням
     * @param {string|number} discountPercent - Процент скидки
     */
    applyWeekendDiscount(discountPercent) {
        try {
            if (!discountPercent) {
                console.warn('[UnifiedCalendarManager] Не указан процент скидки для выходных дней');
                return;
            }
            
            const monthKey = this.currentMonthKey;
            if (!monthKey) {
                console.error('[UnifiedCalendarManager] Не определен текущий месяц');
                return;
            }
            
            const [year, month] = monthKey.split('-');
            const basePrice = this.getBasePrice();
            const discountedPrice = this.applyDiscount(basePrice, discountPercent);
            
            console.log(`[UnifiedCalendarManager] Применение скидки ${discountPercent}% к выходным дням. Новая цена: ${discountedPrice}`);
            
            // Получаем количество дней в месяце
            const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
            
            // Проходим по всем дням месяца
            for (let day = 1; day <= daysInMonth; day++) {
                // Создаем объект даты
                const date = new Date(parseInt(year), parseInt(month) - 1, day);
                const dayOfWeek = date.getDay(); // 0 - воскресенье, 6 - суббота
                
                // Проверяем, является ли день выходным (суббота или воскресенье)
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    const timestamp = date.getTime();
                    const dateString = this.formatDate(day, month, year);
                    
                    // Проверяем, не заблокирован ли день
                    if (this.isDateBlocked(dateString, monthKey)) {
                        continue;
                    }
                    
                    // Сохраняем скидку для этой даты
                    this.calendarData.dateDiscounts[timestamp] = discountedPrice;
                    
                    // Обновляем базовые цены в хранилище
                    if (!this.calendarData.basePrices[monthKey]) {
                        this.calendarData.basePrices[monthKey] = {
                            prices: [],
                            defaultCost: basePrice
                        };
                    }
                    
                    const prices = this.calendarData.basePrices[monthKey].prices;
                    const priceIndex = prices.findIndex(item => item.date === dateString);
                    
                    if (priceIndex !== -1) {
                        prices[priceIndex].price = discountedPrice;
                    } else {
                        prices.push({ date: dateString, price: discountedPrice });
                    }
                    
                    // Обновляем UI для текущего месяца
                    document.querySelectorAll('.calendar_day-wrapper:not(.not_exist)').forEach(dayWrapper => {
                        const dayEl = dayWrapper.querySelector('[day]');
                        if (dayEl && parseInt(dayEl.textContent.trim()) === day) {
                            // Добавляем класс is-active для обозначения скидки
                            dayWrapper.classList.add('is-active');
                            
                            // Обновляем отображаемую цену
                            const servicePriceElement = dayWrapper.querySelector('[service-price]');
                            if (servicePriceElement) {
                                servicePriceElement.textContent = discountedPrice;
                            }
                        }
                    });
                }
            }
            
            // Сохраняем данные месяца
            this.saveMonthData(monthKey);
            
            console.log('[UnifiedCalendarManager] Скидка для выходных дней успешно применена');
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при применении скидки к выходным дням:', error);
        }
    }

    /**
     * Сброс скидок для выходных дней
     */
    resetWeekendDiscounts() {
        const monthKey = this.currentMonthKey;
        if (!monthKey) return;

        const [year, month] = monthKey.split('-');
        const basePrice = this.getBasePrice();
        const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(parseInt(year), parseInt(month) - 1, day);
            const isWeekend = (date.getDay() === 0 || date.getDay() === 6); // воскресенье или суббота

            if (isWeekend) {
                const dateString = this.formatDate(day, month, year);
                const timestamp = date.getTime();

                // Пропускаем заблокированные дни
                if (this.isDateBlocked(dateString, monthKey)) continue;

                // Удаляем скидку
                delete this.calendarData.dateDiscounts[timestamp];

                // Обновляем базовые цены
                if (this.calendarData.basePrices[monthKey]) {
                    const prices = this.calendarData.basePrices[monthKey].prices;
                    const priceIndex = prices.findIndex(item => item.date === dateString);

                    if (priceIndex !== -1) {
                        prices[priceIndex].price = basePrice;
                    }
                }
            }
        }

        this.saveMonthData(monthKey);
        this.updateAllDaysDisplay();
    }

    /**
     * Блокировка выбранного диапазона дат
     */
    blockSelectedRange() {
        if (this.calendarData.dateRanges.length === 0) {
            console.warn('[UnifiedCalendarManager] Нет выбранных диапазонов для блокировки');
            return;
        }

        try {
            const lastRange = this.calendarData.dateRanges[this.calendarData.dateRanges.length - 1];
            if (!lastRange || !lastRange.start || !lastRange.end) {
                console.error('[UnifiedCalendarManager] Некорректный диапазон дат');
                return;
            }

            // Получаем текущую базовую цену
            const basePrice = this.getBasePrice();
            
            // Проходим по всем дням в диапазоне
            const startDate = new Date(lastRange.start.timestamp);
            const endDate = new Date(lastRange.end.timestamp);
            const processedMonthKeys = new Set(); // Для отслеживания обработанных месяцев

            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const day = date.getDate();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                const monthKey = `${year}-${month}`;
                const dateString = this.formatDate(day, month, year);
                
                // Добавляем дату в список заблокированных
                if (!this.calendarData.blockedDates[monthKey]) {
                    this.calendarData.blockedDates[monthKey] = [];
                }
                
                // Проверяем, не заблокирована ли дата уже
                const isAlreadyBlocked = this.calendarData.blockedDates[monthKey].some(item => {
                    if (typeof item === 'object' && item.date) {
                        return item.date === dateString;
                    }
                    return item === dateString;
                });
                
                if (!isAlreadyBlocked) {
                    this.calendarData.blockedDates[monthKey].push({
                        date: dateString,
                        price: basePrice // Сохраняем текущую цену
                    });
                }
                
                processedMonthKeys.add(monthKey);
                
                // Обновляем UI для текущего месяца
                const monthName = REVERSE_MONTH_MAP[month];
                const currentMonthYearElement = document.querySelector('[current_month_year]');
                
                if (currentMonthYearElement) {
                    const [currentMonthName, currentYear] = currentMonthYearElement.textContent.trim().split(' ');
                    
                    if (monthName === currentMonthName && year.toString() === currentYear) {
                        // Находим ячейку для этого дня
                        document.querySelectorAll('.calendar_day-wrapper:not(.not_exist)').forEach(dayWrapper => {
                            const dayEl = dayWrapper.querySelector('[day]');
                            if (dayEl && parseInt(dayEl.textContent.trim()) === day) {
                                // Добавляем класс is-blocked для обозначения блокировки
                                dayWrapper.classList.add('is-blocked');
                                dayWrapper.classList.remove('is-selected');
                                dayWrapper.classList.remove('is-active');
                                
                                // Обновляем отображаемую цену (для заблокированных дней обычно не показывается)
                                const servicePriceElement = dayWrapper.querySelector('[service-price]');
                                if (servicePriceElement) {
                                    servicePriceElement.textContent = basePrice;
                                }
                            }
                        });
                    }
                }
            }
            
            // Сохраняем данные для всех затронутых месяцев
            this.storage.save('blockedDatesMap', this.calendarData.blockedDates);
            
            // Удаляем заблокированный диапазон из выбранных
            this.calendarData.dateRanges.pop();
            
            // Обновляем отображение и состояние
            this.updateAllDaysDisplay();
            this.toggleSettingsVisibility(false);
            this.toggleChosenDatesVisibility(false);
            this.tempSelection.isRangeConfirmed = true;
            this.tempSelection.start = null;
            this.tempSelection.startMonth = null;
            this.tempSelection.startYear = null;
            this.clearWaitState();
            
            // Деактивируем режим блокировки
            const blockButton = document.querySelector('[button_block]');
            if (blockButton) {
                blockButton.classList.remove('is--add-service');
            }
            
            // Устанавливаем цвет фона для всех дней в диапазоне
            this.setRangeBackgroundColor(lastRange.start.timestamp, lastRange.end.timestamp, '#090633');
            
            console.log('[UnifiedCalendarManager] Диапазон дат успешно заблокирован');
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при блокировке диапазона дат:', error);
        }
    }

    /**
     * Сохранение данных месяца в localStorage
     * @param {string} monthKey - Ключ месяца в формате YYYY-MM
     */
    saveMonthData(monthKey) {
        if (!monthKey) {
            console.error('[UnifiedCalendarManager] Не указан ключ месяца для сохранения данных');
            return;
        }

        try {
            // Сохраняем базовые цены
            this.storage.save(`monthData-${monthKey}`, this.calendarData.basePrices[monthKey]);
            
            // Сохраняем заблокированные даты
            this.storage.save('blockedDatesMap', this.calendarData.blockedDates);
            
            console.log(`[UnifiedCalendarManager] Данные месяца ${monthKey} сохранены`);
        } catch (error) {
            console.error(`[UnifiedCalendarManager] Ошибка сохранения данных месяца ${monthKey}:`, error);
        }
    }

    /**
     * Обновление отображения всех дней в календаре
     */
    updateAllDaysDisplay() {
        const monthYearElement = document.querySelector('[current_month_year]');
        if (!monthYearElement) {
            console.warn('[UnifiedCalendarManager] Элемент текущего месяца и года не найден');
            return;
        }

        try {
            const [currentMonthName, currentYear] = monthYearElement.textContent.trim().split(' ');
            if (!currentMonthName || !currentYear || !MONTH_MAP[currentMonthName]) {
                console.error(`[UnifiedCalendarManager] Некорректный формат месяца и года: ${monthYearElement.textContent}`);
                return;
            }

            const basePrice = this.getBasePrice();
            const yearNum = parseInt(currentYear);
            const monthNum = MONTH_MAP[currentMonthName];
            const monthYearKey = `${currentYear}-${monthNum}`;

            // Проходим по всем ячейкам календаря
            const dayWrappers = document.querySelectorAll('.calendar_day-wrapper');
            dayWrappers.forEach(dayWrapper => {
                const cell = dayWrapper.querySelector('[day]');
                if (!cell) return;

                const dayText = cell.textContent.trim();
                if (dayText === "") return;

                try {
                    const day = parseInt(dayText);
                    const fullDate = this.createFullDate(day, currentMonthName, yearNum);
                    if (!fullDate) return;

                    const timestamp = fullDate.timestamp;
                    const dateString = this.formatDate(day, monthNum, yearNum);

                    // Проверяем статусы
                    const isInRange = this.isDateInRanges(fullDate);
                    const isExcluded = this.isDateExcluded(timestamp);
                    const isBlocked = this.isDateBlocked(dateString, monthYearKey);
                    const hasDiscount = this.calendarData.dateDiscounts[timestamp] !== undefined;

                    // Обновляем классы для отображения статуса
                    dayWrapper.classList.toggle('is-selected', isInRange && !isExcluded && !isBlocked);
                    dayWrapper.classList.toggle('is-active', hasDiscount && !isExcluded && !isBlocked);
                    dayWrapper.classList.toggle('is-blocked', isBlocked);
                    dayWrapper.classList.toggle('is-blocked-active', isBlocked);

                    // Обновляем отображение цены
                    const servicePriceElement = dayWrapper.querySelector('[service-price]');
                    if (servicePriceElement) {
                        if (isBlocked) {
                            servicePriceElement.textContent = this.getBlockedDatePrice(dateString, monthYearKey);
                        } else if (isExcluded) {
                            servicePriceElement.textContent = basePrice;
                        } else if (hasDiscount) {
                            servicePriceElement.textContent = this.calendarData.dateDiscounts[timestamp];
                        } else {
                            servicePriceElement.textContent = basePrice;
                        }
                    }

                    // Отмечаем первый день диапазона при выборе
                    if (this.tempSelection.start &&
                        this.tempSelection.startMonth === currentMonthName &&
                        this.tempSelection.startYear === yearNum &&
                        this.tempSelection.start === day) {
                        dayWrapper.classList.add('is-wait');
                    }
                } catch (error) {
                    console.error(`[UnifiedCalendarManager] Ошибка при обработке дня ${dayText}:`, error);
                }
            });

            // Обновляем данные о ценах в хранилище
            if (this.calendarData.basePrices[monthYearKey]) {
                this.saveMonthData(monthYearKey);
            }

            console.log(`[UnifiedCalendarManager] Отображение календаря обновлено для месяца ${monthYearKey}`);
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при обновлении отображения календаря:', error);
        }
    }
    
    /**
     * Генерация календаря для указанного месяца и года
     * @param {string} dateString - Строка даты в формате "MM.YYYY"
     */
    generateCalendar(dateString) {
        if (!dateString || !dateString.includes('.')) {
            console.error(`[UnifiedCalendarManager] Некорректный формат даты: ${dateString}`);
            return;
        }

        try {
            const [month, year] = dateString.split('.').map(Number);
            if (isNaN(month) || isNaN(year) || month < 1 || month > 12 || year < 1900 || year > 2100) {
                console.error(`[UnifiedCalendarManager] Недопустимые значения месяца или года: месяц=${month}, год=${year}`);
                return;
            }

            const firstDay = new Date(year, month - 1, 1);
            const lastDay = new Date(year, month, 0);
            const daysInMonth = lastDay.getDate();

            const calendarArray = [];
            let week = Array(7).fill('');
            const adjustedFirstDay = (firstDay.getDay() === 0) ? 6 : firstDay.getDay() - 1;

            let dayCounter = 1;
            for (let i = 0; i < adjustedFirstDay; i++) {
                week[i] = '';
            }

            for (let col = adjustedFirstDay; col < 7; col++) {
                week[col] = dayCounter++;
            }
            calendarArray.push(week);

            while (dayCounter <= daysInMonth) {
                week = Array(7).fill('');
                for (let col = 0; col < 7 && dayCounter <= daysInMonth; col++) {
                    week[col] = dayCounter++;
                }
                calendarArray.push(week);
            }

            // Сбрасываем состояние блокировки
            const selectedElements_blocked = document.querySelectorAll('.calendar_day-wrapper.is-blocked.is-blocked-active');
            const button_block = document.querySelector('[button_block]');
            if (button_block) button_block.classList.remove('is--add-service');

            selectedElements_blocked.forEach(element => {
                element.classList.remove('is-blocked-active');
            });

            // Заполняем календарь датами используя DocumentFragment для оптимизации
            const fragment = document.createDocumentFragment();
            let flatDays = calendarArray.flat();

            for (let i = 0; i < 42; i++) {
                const cell = document.querySelector(`[day='${i}']`);
                const dayWrapper = cell ? cell.closest('.calendar_day-wrapper') : null;
                if (!cell || !dayWrapper) continue;

                try {
                    const day = flatDays[i];
                    const servicePrice = dayWrapper.querySelector('[service-price]');
                    const priceCurrency = dayWrapper.querySelector('[price-currency]');

                    if (day) {
                        cell.textContent = day;
                        dayWrapper.classList.remove('not_exist');
                        if (servicePrice) {
                            servicePrice.style.display = '';
                        }
                        if (priceCurrency) {
                            priceCurrency.style.display = '';
                        }
                    } else {
                        cell.textContent = '';
                        dayWrapper.classList.add('not_exist');
                        if (servicePrice) {
                            servicePrice.style.display = 'none';
                        }
                        if (priceCurrency) {
                            priceCurrency.style.display = 'none';
                        }
                    }
                } catch (error) {
                    console.error(`[UnifiedCalendarManager] Ошибка при генерации ячейки ${i}:`, error);
                }
            }

            this.updateAllDaysDisplay();
            console.log(`[UnifiedCalendarManager] Календарь сгенерирован для ${month}.${year}`);
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при генерации календаря:', error);
        }
    }

    /**
     * Установка текущей даты
     */
    setCurrentDate() {
        try {
            const now = new Date();
            if (isNaN(now.getTime())) {
                console.error('[UnifiedCalendarManager] Ошибка получения текущей даты');
                return;
            }

            const currentMonth = REVERSE_MONTH_MAP[(now.getMonth() + 1).toString().padStart(2, '0')];
            const currentYear = now.getFullYear();
            const monthYearElement = document.querySelector('[current_month_year]');

            if (monthYearElement) {
                monthYearElement.textContent = `${currentMonth} ${currentYear}`;
            } else {
                console.warn('[UnifiedCalendarManager] Элемент текущего месяца и года не найден');
            }

            console.log(`[UnifiedCalendarManager] Установлена текущая дата: ${currentMonth} ${currentYear}`);
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при установке текущей даты:', error);
        }
    }

    /**
     * Обновление календаря для текущего месяца
     */
    updateCalendar() {
        const monthYearElement = document.querySelector('[current_month_year]');
        if (!monthYearElement) {
            console.warn('[UnifiedCalendarManager] Элемент текущего месяца и года не найден');
            return;
        }

        try {
            const currentMonthText = monthYearElement.textContent.trim();
            const [monthName, year] = currentMonthText.split(' ');

            if (!monthName || !year || !MONTH_MAP[monthName]) {
                console.error(`[UnifiedCalendarManager] Некорректный формат месяца и года: ${currentMonthText}`);
                return;
            }

            const current_month = `${MONTH_MAP[monthName]}.${year}`;
            this.generateCalendar(current_month);
            this.loadMonthPrices();

            console.log(`[UnifiedCalendarManager] Календарь обновлен для ${monthName} ${year}`);
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при обновлении календаря:', error);
        }
    }

    /**
     * Загрузка цен для текущего месяца
     */
    loadMonthPrices() {
        const monthKey = this.currentMonthKey;
        if (!monthKey) {
            console.error('[UnifiedCalendarManager] Текущий ключ месяца не определен');
            return;
        }

        try {
            const [year, month] = monthKey.split('-');
            if (!year || !month) {
                console.error(`[UnifiedCalendarManager] Неверный формат ключа месяца: ${monthKey}`);
                return;
            }

            // Если нет данных для текущего месяца, загружаем их
            if (!this.calendarData.basePrices[monthKey]) {
                this.loadMonthData(monthKey);
            }

            const monthPrices = this.calendarData.basePrices[monthKey].prices || [];
            const defaultCost = this.calendarData.basePrices[monthKey].defaultCost;

            // Создаем DocumentFragment для оптимизации DOM-операций
            const fragment = document.createDocumentFragment();
            const updatedCells = [];

            document.querySelectorAll('.calendar_day-wrapper:not(.not_exist)').forEach(dayWrapper => {
                const dayElement = dayWrapper.querySelector('[day]');
                const servicePriceElement = dayWrapper.querySelector('[service-price]');

                if (!dayElement || !servicePriceElement) return;

                try {
                    const dayText = dayElement.textContent.trim();
                    if (dayText === "") return;

                    const day = parseInt(dayText);
                    if (isNaN(day) || day < 1 || day > 31) {
                        console.warn(`[UnifiedCalendarManager] Некорректный день месяца: ${dayText}`);
                        return;
                    }

                    const date = this.formatDate(day, month, year);
                    const dateString = this.formatDate(day, month, year);

                    // Проверяем статусы
                    const isBlocked = this.isDateBlocked(dateString, monthKey);

                    if (isBlocked) {
                        // Если день заблокирован, устанавливаем классы и цену 0
                        dayWrapper.classList.add('is-blocked');
                        dayWrapper.classList.add('is-blocked-active');
                        servicePriceElement.textContent = this.getBlockedDatePrice(dateString, monthKey);
                    } else {
                        // Иначе используем цену из базовых цен или по умолчанию
                        const priceObj = monthPrices.find(item => item.date === date);
                        const finalPrice = priceObj ? priceObj.price : defaultCost;
                        servicePriceElement.textContent = finalPrice;

                        // Проверяем, не является ли это днем со скидкой
                        const timestamp = new Date(parseInt(year), parseInt(month) - 1, day).getTime();
                        const hasDiscount = this.calendarData.dateDiscounts[timestamp] !== undefined;
                        dayWrapper.classList.toggle('is-active', hasDiscount);
                    }

                    // Добавляем ячейку в список обновленных
                    updatedCells.push(day);
                } catch (error) {
                    console.error('[UnifiedCalendarManager] Ошибка при обработке дня:', error);
                }
            });

            console.log(`[UnifiedCalendarManager] Загружены цены для месяца ${monthKey}. Обновлено ячеек: ${updatedCells.length}`);
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при загрузке цен для месяца:', error);
        }
    }

    /**
     * Форматирование диапазона дат для отображения
     * @param {Object} range - Объект диапазона дат {start, end}
     * @returns {string} - Форматированная строка диапазона
     */
    formatDateRange(range) {
        if (!range || !range.start || !range.end) {
            console.error('[UnifiedCalendarManager] Передан неверный диапазон дат в formatDateRange');
            return '';
        }

        try {
            const startDay = range.start.day.toString().padStart(2, '0');
            const endDay = range.end.day.toString().padStart(2, '0');

            if (range.start.month === range.end.month && range.start.year === range.end.year) {
                const month = REVERSE_MONTH_MAP[range.start.month];
                return `${startDay} - ${endDay} ${month}`;
            } else {
                const startMonth = REVERSE_MONTH_MAP[range.start.month];
                const endMonth = REVERSE_MONTH_MAP[range.end.month];
                return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
            }
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка форматирования диапазона дат:', error);
            return '';
        }
    }

    /**
     * Обновление отображения выбранных дат
     */
    updateChosenDates() {
        try {
            const chosenDatesElement = document.querySelector('[chosen-dates]');
            if (!chosenDatesElement) return;
            
            if (this.calendarData.dateRanges.length === 0) {
                chosenDatesElement.textContent = '';
                return;
            }
            
            const dateRanges = this.calendarData.dateRanges.map(range => {
                const startDate = new Date(range.start.timestamp);
                const endDate = new Date(range.end.timestamp);
                
                const startDay = startDate.getDate();
                const endDay = endDate.getDate();
                
                const startMonth = REVERSE_MONTH_MAP[String(startDate.getMonth() + 1).padStart(2, '0')];
                const endMonth = REVERSE_MONTH_MAP[String(endDate.getMonth() + 1).padStart(2, '0')];
                
                const startYear = startDate.getFullYear();
                const endYear = endDate.getFullYear();
                
                if (startMonth === endMonth && startYear === endYear) {
                    return `${startDay}-${endDay} ${startMonth} ${startYear}`;
                } else {
                    return `${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear}`;
                }
            });
            
            chosenDatesElement.textContent = dateRanges.join(', ');
            
            console.log(`[UnifiedCalendarManager] Обновлено отображение выбранных дат: ${dateRanges.join(', ')}`);
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при обновлении отображения выбранных дат:', error);
        }
    }

    /**
     * Переключение видимости панели настроек
     * @param {boolean} show - Показать или скрыть панель
     */
    toggleSettingsVisibility(show) {
        try {
            const settingsPanel = document.querySelector('.calendar_settings');
            if (!settingsPanel) return;
            
            if (show) {
                settingsPanel.style.display = 'block';
            } else {
                settingsPanel.style.display = 'none';
            }
            
            console.log(`[UnifiedCalendarManager] Видимость панели настроек: ${show}`);
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при переключении видимости панели настроек:', error);
        }
    }

    /**
     * Очистка состояния ожидания выбора диапазона
     */
    clearWaitState() {
        document.querySelectorAll('.calendar_day-wrapper.is-wait').forEach(day => {
            day.classList.remove('is-wait');
        });
    }

    /**
     * Отмена последнего выбранного диапазона
     */
    cancelLastRange() {
        try {
            if (this.calendarData.dateRanges.length === 0) {
                console.warn('[UnifiedCalendarManager] Нет выбранных диапазонов для отмены');
                return;
            }
            
            // Получаем последний выбранный диапазон
            const lastRange = this.calendarData.dateRanges.pop();
            if (!lastRange || !lastRange.start || !lastRange.end) {
                console.error('[UnifiedCalendarManager] Некорректный диапазон дат для отмены');
                return;
            }
            
            console.log(`[UnifiedCalendarManager] Отмена диапазона: ${new Date(lastRange.start.timestamp).toLocaleDateString()} - ${new Date(lastRange.end.timestamp).toLocaleDateString()}`);
            
            // Снимаем выделение с дней в диапазоне
            const startDate = new Date(lastRange.start.timestamp);
            const endDate = new Date(lastRange.end.timestamp);
            
            // Проверяем, относится ли диапазон к текущему отображаемому месяцу
            const currentMonthYearElement = document.querySelector('[current_month_year]');
            if (currentMonthYearElement) {
                const [currentMonthName, currentYear] = currentMonthYearElement.textContent.trim().split(' ');
                const currentMonth = MONTH_MAP[currentMonthName];
                const currentYearNum = parseInt(currentYear);
                
                // Проходим по всем дням в диапазоне
                for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                    const day = date.getDate();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const year = date.getFullYear();
                    
                    // Если день относится к текущему месяцу, снимаем выделение
                    if (month === currentMonth && year === currentYearNum) {
                        document.querySelectorAll('.calendar_day-wrapper:not(.not_exist)').forEach(dayWrapper => {
                            const dayEl = dayWrapper.querySelector('[day]');
                            if (dayEl && parseInt(dayEl.textContent.trim()) === day) {
                                dayWrapper.classList.remove('is-selected');
                                dayWrapper.classList.remove('is-wait');
                                dayWrapper.classList.remove('is-active');
                            }
                        });
                    }
                }
            }
            
            // Обновляем отображение выбранных дат
            this.updateChosenDates();
            
            // Если больше нет выбранных диапазонов, скрываем панель настроек
            if (this.calendarData.dateRanges.length === 0) {
                this.toggleSettingsVisibility(false);
                
                // Деактивируем кнопки
                const button_open = document.querySelector('[button_open]');
                if (button_open) {
                    button_open.classList.remove('is--add-service');
                }
                
                const button_block = document.querySelector('[button_block]');
                if (button_block) {
                    button_block.classList.remove('is--add-service');
                }
            }
            
            // Сбрасываем состояние выбора
            this.tempSelection.isRangeConfirmed = true;
            this.tempSelection.start = null;
            this.tempSelection.startMonth = null;
            this.tempSelection.startYear = null;
            
            console.log('[UnifiedCalendarManager] Диапазон успешно отменен');
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при отмене диапазона:', error);
        }
    }

    /**
     * Полная очистка всех выбранных дат и настроек
     */
    clearAllDates() {
        try {
            // Получаем текущую базовую цену из поля ввода
            const basePrice = this.getBasePrice();

            // Очищаем состояние
            this.calendarData.dateRanges = [];
            this.calendarData.excludedDates = new Set();
            this.calendarData.dateDiscounts = {};
            this.calendarData.blockedDates = {};

            this.tempSelection.start = null;
            this.tempSelection.startMonth = null;
            this.tempSelection.startYear = null;
            this.tempSelection.isRangeConfirmed = true;

            this.clearWaitState();

            // Обновляем глобальные настройки с текущей ценой
            this.calendarData.globalSettings.defaultCost = basePrice;
            this.storage.save('calendarGlobalSettings', this.calendarData.globalSettings);

            // Обновляем цены для всех дней в текущем месяце
            const monthKey = this.currentMonthKey;
            if (monthKey) {
                // Создаем новую структуру цен для текущего месяца
                this.calendarData.basePrices[monthKey] = {
                    prices: [],
                    defaultCost: basePrice
                };
                
                // Сохраняем обновленные данные
                this.saveMonthData(monthKey);
            }

            // Обновляем отображение цен в календаре
            document.querySelectorAll('.calendar_day-wrapper:not(.not_exist)').forEach(day => {
                // Очищаем классы
                day.classList.remove('is-selected');
                day.classList.remove('is-wait');
                day.classList.remove('is-active');
                day.classList.remove('is-blocked');
                day.classList.remove('is-blocked-active');

                // Устанавливаем базовую цену
                const servicePriceElement = day.querySelector('[service-price]');
                if (servicePriceElement) {
                    servicePriceElement.textContent = basePrice;
                }
            });

            // Обновляем состояние кнопок
            const button_open = document.querySelector('[button_open]');
            if (button_open) {
                button_open.classList.remove('is--add-service');
            }

            const button_block = document.querySelector('[button_block]');
            if (button_block) {
                button_block.classList.remove('is--add-service');
            }

            // Очищаем выбранные даты
            const chosenDatesElement = document.querySelector('[chosen-dates]');
            if (chosenDatesElement) {
                chosenDatesElement.textContent = '';
            }

            this.toggleSettingsVisibility(false);

            // Очищаем localStorage
            this.storage.removeByPattern(/^monthData-/);
            this.storage.remove('blockedDatesMap');

            console.log(`[UnifiedCalendarManager] Все даты очищены. Установлена базовая цена: ${basePrice}`);
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при очистке всех дат:', error);
        }
    }

    /**
     * Применение скидки к выбранному диапазону дат
     */
    applyDiscountToRange() {
        if (this.calendarData.dateRanges.length === 0) {
            console.warn('[UnifiedCalendarManager] Нет выбранных диапазонов для применения скидки');
            return;
        }

        try {
            // Получаем значение скидки из поля ввода
            const discountInput = document.getElementById('Selected-Discount');
            if (!discountInput) {
                console.error('[UnifiedCalendarManager] Элемент ввода скидки не найден');
                return;
            }

            const discountValue = discountInput.value.trim();
            if (!discountValue) {
                console.warn('[UnifiedCalendarManager] Не указано значение скидки');
                return;
            }

            console.log(`[UnifiedCalendarManager] Применение скидки ${discountValue} к выбранному диапазону`);

            // Получаем последний выбранный диапазон
            const lastRange = this.calendarData.dateRanges[this.calendarData.dateRanges.length - 1];
            if (!lastRange || !lastRange.start || !lastRange.end) {
                console.error('[UnifiedCalendarManager] Некорректный диапазон дат для применения скидки');
                return;
            }

            // Получаем базовую цену
            const basePrice = this.getBasePrice();
            
            // Вычисляем цену со скидкой
            const discountedPrice = this.applyDiscount(basePrice, discountValue);
            
            console.log(`[UnifiedCalendarManager] Базовая цена: ${basePrice}, Цена со скидкой: ${discountedPrice}`);

            // Применяем скидку к каждому дню в диапазоне
            const startDate = new Date(lastRange.start.timestamp);
            const endDate = new Date(lastRange.end.timestamp);
            
            // Отслеживаем затронутые месяцы для сохранения данных
            const processedMonthKeys = new Set();

            // Проходим по всем дням в диапазоне
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const day = date.getDate();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                const monthKey = `${year}-${month}`;
                const dateString = this.formatDate(day, month, year);
                const timestamp = date.getTime();
                
                // Добавляем месяц в список затронутых
                processedMonthKeys.add(monthKey);
                
                // Проверяем, не заблокирован ли день
                if (this.isDateBlocked(dateString, monthKey)) {
                    console.log(`[UnifiedCalendarManager] День ${dateString} заблокирован, скидка не применяется`);
                    continue;
                }
                
                // Сохраняем скидку для этой даты
                this.calendarData.dateDiscounts[timestamp] = discountedPrice;
                
                // Обновляем базовые цены в хранилище
                if (!this.calendarData.basePrices[monthKey]) {
                    this.calendarData.basePrices[monthKey] = {
                        prices: [],
                        defaultCost: basePrice
                    };
                }
                
                const prices = this.calendarData.basePrices[monthKey].prices;
                const priceIndex = prices.findIndex(item => item.date === dateString);
                
                if (priceIndex !== -1) {
                    prices[priceIndex].price = discountedPrice;
                } else {
                    prices.push({ date: dateString, price: discountedPrice });
                }
                
                // Обновляем UI для текущего месяца
                if (monthKey === this.currentMonthKey) {
                    document.querySelectorAll('.calendar_day-wrapper:not(.not_exist)').forEach(dayWrapper => {
                        const dayEl = dayWrapper.querySelector('[day]');
                        if (dayEl && parseInt(dayEl.textContent.trim()) === day) {
                            // Добавляем класс is-active для обозначения скидки
                            dayWrapper.classList.add('is-active');
                            
                            // Обновляем отображаемую цену
                            const servicePriceElement = dayWrapper.querySelector('[service-price]');
                            if (servicePriceElement) {
                                servicePriceElement.textContent = discountedPrice;
                            }
                        }
                    });
                }
            }

            // Сохраняем данные для всех затронутых месяцев
            processedMonthKeys.forEach(monthKey => {
                this.saveMonthData(monthKey);
            });

            // Устанавливаем цвет фона для всех дней в диапазоне
            this.setRangeBackgroundColor(lastRange.start.timestamp, lastRange.end.timestamp, '#090633');

            // Обновляем отображение и состояние
            this.updateAllDaysDisplay();
            this.toggleSettingsVisibility(false);
            this.toggleChosenDatesVisibility(false);
            this.tempSelection.isRangeConfirmed = true;
            this.tempSelection.start = null;
            this.tempSelection.startMonth = null;
            this.tempSelection.startYear = null;
            this.clearWaitState();
            
            // Деактивируем режим скидки
            const openButton = document.querySelector('[button_open]');
            if (openButton) {
                openButton.classList.remove('is--add-service');
            }
            
            console.log('[UnifiedCalendarManager] Скидка успешно применена к диапазону дат');
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при применении скидки к диапазону:', error);
        }
    }

    /**
     * Применение скидки к цене
     * @param {number} price - Исходная цена
     * @param {string|number} discount - Процент скидки (например, "10%" или 10)
     * @returns {number} - Цена со скидкой
     */
    applyDiscount(price, discount) {
        try {
            // Преобразуем скидку в число
            let discountPercent = 0;
            if (typeof discount === 'string') {
                // Удаляем символ процента и преобразуем в число
                discountPercent = parseFloat(discount.replace('%', ''));
            } else {
                discountPercent = parseFloat(discount);
            }
            
            // Проверяем корректность скидки
            if (isNaN(discountPercent)) {
                console.error('[UnifiedCalendarManager] Некорректное значение скидки:', discount);
                return price;
            }
            
            // Ограничиваем скидку диапазоном от 0 до 100
            discountPercent = Math.max(0, Math.min(100, discountPercent));
            
            // Вычисляем цену со скидкой
            const discountedPrice = Math.round(price * (1 - discountPercent / 100));
            
            return discountedPrice;
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при применении скидки к цене:', error);
            return price;
        }
    }

    /**
     * Обновление отображения всех дней в календаре
     */
    updateAllDaysDisplay() {
        try {
            const monthKey = this.currentMonthKey;
            if (!monthKey) {
                console.error('[UnifiedCalendarManager] Не определен текущий месяц');
                return;
            }
            
            const [year, month] = monthKey.split('-');
            const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
            
            // Проходим по всем дням месяца
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(parseInt(year), parseInt(month) - 1, day);
                const timestamp = date.getTime();
                const dateString = this.formatDate(day, month, year);
                
                // Получаем цену для этого дня
                let price = this.getBasePrice();
                
                // Проверяем, есть ли скидка для этой даты
                if (this.calendarData.dateDiscounts[timestamp]) {
                    price = this.calendarData.dateDiscounts[timestamp];
                } else if (this.calendarData.basePrices[monthKey]) {
                    const priceData = this.calendarData.basePrices[monthKey].prices.find(item => item.date === dateString);
                    if (priceData) {
                        price = priceData.price;
                    }
                }
                
                // Обновляем UI для этого дня
                document.querySelectorAll('.calendar_day-wrapper:not(.not_exist)').forEach(dayWrapper => {
                    const dayEl = dayWrapper.querySelector('[day]');
                    if (dayEl && parseInt(dayEl.textContent.trim()) === day) {
                        // Проверяем, заблокирован ли день
                        if (this.isDateBlocked(dateString, monthKey)) {
                            dayWrapper.classList.add('is-blocked');
                            dayWrapper.classList.remove('is-active');
                        } else if (price !== this.getBasePrice()) {
                            // Если цена отличается от базовой, добавляем класс is-active
                            dayWrapper.classList.add('is-active');
                            dayWrapper.classList.remove('is-blocked');
                        } else {
                            // Иначе удаляем оба класса
                            dayWrapper.classList.remove('is-active');
                            dayWrapper.classList.remove('is-blocked');
                        }
                        
                        // Обновляем отображаемую цену
                        const servicePriceElement = dayWrapper.querySelector('[service-price]');
                        if (servicePriceElement) {
                            servicePriceElement.textContent = price;
                        }
                    }
                });
            }
            
            console.log('[UnifiedCalendarManager] Отображение всех дней в календаре обновлено');
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при обновлении отображения всех дней:', error);
        }
    }

    /**
     * Инициализация обработчиков событий
     */
    initHandlers() {
        try {
            // Обработчик клика по дням календаря
            document.querySelectorAll('.calendar_day-wrapper').forEach(dayWrapper => {
                dayWrapper.addEventListener('click', (event) => {
                    if (dayWrapper.classList.contains('not_exist')) return;
                    
                    const dayElement = dayWrapper.querySelector('[day]');
                    if (!dayElement) return;
                    
                    const day = parseInt(dayElement.textContent.trim());
                    if (isNaN(day)) return;
                    
                    this.handleDayClick(day, dayWrapper);
                });
            });
            
            // Обработчик кнопки отмены последнего диапазона
            const cancelButton = document.querySelector('[button_cancel], [calendar-choosen-cancel]');
            if (cancelButton) {
                cancelButton.addEventListener('click', () => this.cancelLastRange());
            }
            
            // Обработчик кнопки применения скидки или блокировки
            const applyButton = document.querySelector('[calendar-apply-button]');
            if (applyButton) {
                applyButton.addEventListener('click', () => {
                    // Проверяем, какое действие нужно выполнить
                    const blockButton = document.querySelector('[button_block]');
                    const openButton = document.querySelector('[button_open]');
                    
                    if (blockButton && blockButton.classList.contains('is--add-service')) {
                        // Если активна кнопка блокировки, блокируем даты
                        this.blockSelectedRange();
                        // Сбрасываем режим блокировки
                        blockButton.classList.remove('is--add-service');
                    } else if (openButton && openButton.classList.contains('is--add-service')) {
                        // Если активна кнопка скидки, применяем скидку
                        this.applyDiscountToRange();
                        // Сбрасываем режим скидки
                        openButton.classList.remove('is--add-service');
                    } else {
                        // По умолчанию применяем скидку
                        this.applyDiscountToRange();
                    }
                });
            }
            
            // Обработчик кнопки блокировки дат
            const blockButton = document.querySelector('[button_block]');
            if (blockButton) {
                blockButton.addEventListener('click', () => {
                    // Переключаем класс активности
                    blockButton.classList.toggle('is--add-service');
                    
                    // Если кнопка активна, готовимся к блокировке и убираем активность с кнопки открытия
                    const button_open = document.querySelector('[button_open]');
                    if (blockButton.classList.contains('is--add-service')) {
                        console.log('[UnifiedCalendarManager] Режим блокировки дат активирован');
                        if (button_open) {
                            button_open.classList.remove('is--add-service');
                        }
                    } else {
                        console.log('[UnifiedCalendarManager] Режим блокировки дат деактивирован');
                    }
                });
            }
            
            // Обработчик кнопки открытия (скидки)
            const openButton = document.querySelector('[button_open]');
            if (openButton) {
                openButton.addEventListener('click', () => {
                    // Переключаем класс активности
                    openButton.classList.toggle('is--add-service');
                    
                    // Если кнопка активна, готовимся к скидке и убираем активность с кнопки блокировки
                    if (openButton.classList.contains('is--add-service')) {
                        console.log('[UnifiedCalendarManager] Режим скидки активирован');
                        if (blockButton) {
                            blockButton.classList.remove('is--add-service');
                        }
                    } else {
                        console.log('[UnifiedCalendarManager] Режим скидки деактивирован');
                    }
                });
            }
            
            // Обработчик кнопки очистки всех дат
            const clearButton = document.querySelector('[button_clear]');
            if (clearButton) {
                clearButton.addEventListener('click', () => this.clearAllDates());
            }
            
            // Обработчик элемента с атрибутом clear-dates
            const clearDatesElement = document.querySelector('[clear-dates]');
            if (clearDatesElement) {
                clearDatesElement.addEventListener('click', () => {
                    this.clearAllDates();
                    console.log('[UnifiedCalendarManager] Очистка календаря по клику на clear-dates');
                });
            }
            
            // Обработчик изменения базовой цены
            const costInput = document.querySelector('input[name="cost_per_hour"]');
            if (costInput) {
                costInput.addEventListener('change', () => {
                    this.saveGlobalSettings();
                    this.updateAllDaysDisplay();
                });
                
                // Также добавляем обработчик для события input, чтобы обновлять при вводе
                costInput.addEventListener('input', () => {
                    this.saveGlobalSettings();
                    this.updateAllDaysDisplay();
                });
            }
            
            // Обработчик чекбокса скидки для выходных дней
            const weekendDiscountCheckbox = document.querySelector('input[type="checkbox"][name="Weekend-Discount"]');
            if (weekendDiscountCheckbox) {
                console.log('[UnifiedCalendarManager] Найден чекбокс скидки для выходных дней');
                
                // Проверяем начальное состояние чекбокса и устанавливаем видимость поля ввода
                const isChecked = weekendDiscountCheckbox.checked;
                console.log(`[UnifiedCalendarManager] Начальное состояние чекбокса: ${isChecked ? 'включен' : 'выключен'}`);
                this.toggleWeekendDiscountInput(isChecked);
                
                // Добавляем обработчик события change
                weekendDiscountCheckbox.addEventListener('change', (event) => {
                    const isCheckedNow = event.target.checked;
                    console.log(`[UnifiedCalendarManager] Состояние чекбокса изменено: ${isCheckedNow ? 'включен' : 'выключен'}`);
                    
                    // Переключаем видимость поля ввода скидки
                    this.toggleWeekendDiscountInput(isCheckedNow);
                    
                    // Если чекбокс выключен, сбрасываем скидки для выходных дней
                    if (!isCheckedNow) {
                        this.resetWeekendDiscounts();
                    } else {
                        // Если чекбокс включен и есть значение скидки, применяем его
                        const weekendDiscountInput = document.querySelector('input[weekend_discount]');
                        if (weekendDiscountInput && weekendDiscountInput.value) {
                            this.applyWeekendDiscount(weekendDiscountInput.value);
                        }
                    }
                });
                
                // Также проверяем состояние при загрузке страницы
                if (isChecked) {
                    this.toggleWeekendDiscountInput(true);
                    const weekendDiscountInput = document.querySelector('input[weekend_discount]');
                    if (weekendDiscountInput && weekendDiscountInput.value) {
                        this.applyWeekendDiscount(weekendDiscountInput.value);
                    }
                }
            } else {
                console.warn('[UnifiedCalendarManager] Чекбокс скидки для выходных дней не найден');
            }
            
            // Обработчики для эффекта hover при выборе диапазона
            this.initHoverEffectHandlers();
            
            console.log('[UnifiedCalendarManager] Инициализация обработчиков событий');
            
            // Обработчик кнопки отмены выбора диапазона
            const cancelRangeButton = document.querySelector('[calendar-choosen-cancel]');
            if (cancelRangeButton) {
                cancelRangeButton.addEventListener('click', () => {
                    // Скрываем элемент с выбранными датами
                    this.toggleChosenDatesVisibility(false);
                    
                    // Отменяем выбор диапазона
                    this.cancelRangeSelection();
                    
                    // Очищаем эффект hover
                    this.clearHoverEffect();
                    
                    // Сбрасываем цвет фона для всех дней
                    this.resetAllDaysBackgroundColor();
                    
                    console.log('[UnifiedCalendarManager] Выбор диапазона отменен');
                });
            }
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при инициализации обработчиков:', error);
        }
    }

    /**
     * Инициализация обработчиков для эффекта hover при выборе диапазона
     */
    initHoverEffectHandlers() {
        try {
            console.log('[UnifiedCalendarManager] Инициализация обработчиков для эффекта hover...');
            
            // Функция для добавления обработчиков к дням календаря
            const addHoverHandlers = () => {
                // Получаем все дни календаря
                const calendarDays = document.querySelectorAll('.calendar_day-wrapper:not(.not_exist)');
                console.log(`[UnifiedCalendarManager] Найдено ${calendarDays.length} дней календаря`);
                
                // Добавляем обработчики событий mouseenter для каждого дня
                calendarDays.forEach(dayWrapper => {
                    // Удаляем предыдущие обработчики, чтобы избежать дублирования
                    dayWrapper.removeEventListener('mouseenter', this.handleDayHover);
                    
                    // Добавляем новый обработчик
                    dayWrapper.addEventListener('mouseenter', this.handleDayHover.bind(this));
                    
                    // Добавляем атрибут для отладки
                    dayWrapper.setAttribute('data-has-hover', 'true');
                });
                
                // Обработчик события mouseleave для всего календаря
                const calendar = document.querySelector('.calendar_wrapper');
                if (calendar) {
                    // Удаляем предыдущий обработчик
                    calendar.removeEventListener('mouseleave', this.handleCalendarLeave);
                    
                    // Добавляем новый обработчик
                    calendar.addEventListener('mouseleave', this.handleCalendarLeave.bind(this));
                    
                    // Добавляем атрибут для отладки
                    calendar.setAttribute('data-has-leave', 'true');
                }
                
                console.log('[UnifiedCalendarManager] Обработчики для эффекта hover добавлены');
            };
            
            // Добавляем обработчики сразу
            addHoverHandlers();
            
            // Также добавляем обработчики при изменении месяца
            const prevMonthButton = document.querySelector('[calendar-prev]');
            const nextMonthButton = document.querySelector('[calendar-next]');
            
            if (prevMonthButton) {
                prevMonthButton.addEventListener('click', () => {
                    // Добавляем небольшую задержку, чтобы DOM успел обновиться
                    setTimeout(addHoverHandlers, 100);
                });
            }
            
            if (nextMonthButton) {
                nextMonthButton.addEventListener('click', () => {
                    // Добавляем небольшую задержку, чтобы DOM успел обновиться
                    setTimeout(addHoverHandlers, 100);
                });
            }
            
            console.log('[UnifiedCalendarManager] Обработчики для эффекта hover при выборе диапазона инициализированы');
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при инициализации обработчиков для эффекта hover:', error);
        }
    }

    /**
     * Обработчик события mouseenter для дня календаря
     * @param {Event} event - Событие mouseenter
     */
    handleDayHover(event) {
        try {
            // Если не начат выбор диапазона, ничего не делаем
            if (this.tempSelection.isRangeConfirmed) {
                return;
            }
            
            // Получаем элемент дня
            const dayWrapper = event.currentTarget;
            
            // Получаем день, на который наведен курсор
            const dayEl = dayWrapper.querySelector('[day]');
            if (!dayEl) {
                return;
            }
            
            const currentDay = parseInt(dayEl.textContent.trim());
            const startDay = this.tempSelection.start;
            
            console.log(`[UnifiedCalendarManager] Наведение на день ${currentDay}, начальный день: ${startDay}`);
            
            // Если начальный день не выбран или текущий день равен начальному, ничего не делаем
            if (!startDay || currentDay === startDay) {
                return;
            }
            
            // Очищаем предыдущий предварительный выбор
            this.clearHoverEffect();
            
            // Определяем диапазон дней для подсветки
            const minDay = Math.min(startDay, currentDay);
            const maxDay = Math.max(startDay, currentDay);
            
            console.log(`[UnifiedCalendarManager] Подсветка диапазона: ${minDay}-${maxDay}`);
            
            // Подсвечиваем все дни в диапазоне
            document.querySelectorAll('.calendar_day-wrapper:not(.not_exist)').forEach(day => {
                const dayElement = day.querySelector('[day]');
                if (dayElement) {
                    const dayNum = parseInt(dayElement.textContent.trim());
                    if (dayNum >= minDay && dayNum <= maxDay) {
                        // Используем цвет #EAECF0 для эффекта hover
                        if (dayNum === startDay) {
                            // Для начального дня оставляем цвет #090633
                            day.style.backgroundColor = '#090633';
                        } else {
                            day.style.backgroundColor = '#EAECF0';
                        }
                        day.classList.add('hover-selected');
                    }
                }
            });
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при обработке наведения на день:', error);
        }
    }

    /**
     * Обработчик события mouseleave для календаря
     */
    handleCalendarLeave() {
        try {
            // Если не начат выбор диапазона, ничего не делаем
            if (this.tempSelection.isRangeConfirmed) {
                return;
            }
            
            // Очищаем предварительный выбор
            this.clearHoverEffect();
            
            console.log('[UnifiedCalendarManager] Курсор покинул календарь, эффект hover очищен');
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при обработке события mouseleave для календаря:', error);
        }
    }

    /**
     * Очистка эффекта hover для всех дней
     */
    clearHoverEffect() {
        try {
            // Получаем все дни с классом hover-selected
            const selectedDays = document.querySelectorAll('.calendar_day-wrapper.hover-selected');
            
            // Удаляем стиль backgroundColor и класс hover-selected
            selectedDays.forEach(day => {
                day.style.backgroundColor = '';
                day.classList.remove('hover-selected');
            });
            
            console.log(`[UnifiedCalendarManager] Эффект hover очищен для ${selectedDays.length} дней`);
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при очистке эффекта hover:', error);
        }
    }

    /**
     * Обработка клика по дню календаря
     * @param {number} day - День месяца
     * @param {HTMLElement} dayWrapper - DOM-элемент дня
     */
    handleDayClick(day, dayWrapper) {
        try {
            const monthYearElement = document.querySelector('[current_month_year]');
            if (!monthYearElement) return;
            
            const [monthName, year] = monthYearElement.textContent.trim().split(' ');
            if (!monthName || !year || !MONTH_MAP[monthName]) return;
            
            const monthNum = MONTH_MAP[monthName];
            const yearNum = parseInt(year);
            
            // Создаем объект даты
            const fullDate = this.createFullDate(day, monthName, yearNum);
            if (!fullDate) return;
            
            // Проверяем, заблокирована ли дата
            const dateString = this.formatDate(day, monthNum, yearNum);
            const monthYearKey = `${yearNum}-${monthNum}`;
            
            if (this.isDateBlocked(dateString, monthYearKey)) {
                console.log(`[UnifiedCalendarManager] День ${dateString} заблокирован`);
                return;
            }
            
            // Если это первый клик в диапазоне
            if (this.tempSelection.isRangeConfirmed) {
                // Начинаем новый диапазон
                this.tempSelection.start = day;
                this.tempSelection.startMonth = monthName;
                this.tempSelection.startYear = yearNum;
                this.tempSelection.isRangeConfirmed = false;
                
                // Отмечаем день как ожидающий
                dayWrapper.classList.add('is-wait');
                
                // Показываем элемент с выбранными датами
                this.toggleChosenDatesVisibility(true);
                
                // Очищаем предыдущий предварительный выбор
                this.clearHoverEffect();
                
                console.log(`[UnifiedCalendarManager] Начало диапазона: ${day} ${monthName} ${yearNum}`);
                
                // Устанавливаем цвет фона для выбранного дня
                dayWrapper.style.backgroundColor = '#090633';
            } else {
                // Это второй клик, завершаем диапазон
                const startDay = this.tempSelection.start;
                const startMonth = this.tempSelection.startMonth;
                const startYear = this.tempSelection.startYear;
                
                // Проверяем, что выбор в том же месяце
                if (startMonth !== monthName || startYear !== yearNum) {
                    console.warn('[UnifiedCalendarManager] Выбор диапазона между разными месяцами не поддерживается');
                    this.clearWaitState();
                    this.tempSelection.isRangeConfirmed = true;
                    return;
                }
                
                // Определяем начало и конец диапазона
                const rangeStart = Math.min(startDay, day);
                const rangeEnd = Math.max(startDay, day);
                
                // Создаем объекты дат для диапазона
                const startDate = this.createFullDate(rangeStart, monthName, yearNum);
                const endDate = this.createFullDate(rangeEnd, monthName, yearNum);
                
                if (!startDate || !endDate) {
                    console.error('[UnifiedCalendarManager] Ошибка создания объектов дат для диапазона');
                    this.clearWaitState();
                    this.tempSelection.isRangeConfirmed = true;
                    return;
                }
                
                // Проверяем пересечение с существующими диапазонами
                if (this.isRangeOverlap(startDate.timestamp, endDate.timestamp)) {
                    console.warn('[UnifiedCalendarManager] Диапазон пересекается с существующими');
                    this.clearWaitState();
                    this.tempSelection.isRangeConfirmed = true;
                    return;
                }
                
                // Добавляем новый диапазон
                this.calendarData.dateRanges.push({
                    start: startDate,
                    end: endDate
                });
                
                // Отмечаем дни в диапазоне как выбранные
                for (let d = rangeStart; d <= rangeEnd; d++) {
                    document.querySelectorAll('.calendar_day-wrapper:not(.not_exist)').forEach(wrapper => {
                        const dayEl = wrapper.querySelector('[day]');
                        if (dayEl && parseInt(dayEl.textContent.trim()) === d) {
                            wrapper.classList.add('is-selected');
                        }
                    });
                }
                
                // Обновляем отображение выбранных дат
                this.updateChosenDates();
                
                // Показываем панель настроек
                this.toggleSettingsVisibility(true);
                
                // Активируем кнопку добавления услуги
                const button_open = document.querySelector('[button_open]');
                if (button_open) {
                    button_open.classList.add('is--add-service');
                }
                
                // Сбрасываем состояние ожидания
                this.clearWaitState();
                this.tempSelection.isRangeConfirmed = true;
                
                console.log(`[UnifiedCalendarManager] Диапазон выбран: ${rangeStart}-${rangeEnd} ${monthName} ${yearNum}`);
            }
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при обработке клика по дню:', error);
            this.clearWaitState();
            this.tempSelection.isRangeConfirmed = true;
            this.clearHoverEffect();
        }
    }

    /**
     * Гарантирует наличие базовых цен для всех дней месяца
     * @param {string} monthKey - Ключ месяца в формате YYYY-MM
     */
    ensureBasePrices(monthKey) {
        if (!monthKey) return;
        
        const [year, month] = monthKey.split('-');
        const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
        const basePrice = this.getBasePrice();
        
        if (!this.calendarData.basePrices[monthKey]) {
            this.calendarData.basePrices[monthKey] = {
                prices: [],
                defaultCost: basePrice
            };
        }
        
        // Проверяем, есть ли цены для всех дней месяца
        const prices = this.calendarData.basePrices[monthKey].prices;
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateString = this.formatDate(day, month, year);
            const existingPrice = prices.find(item => item.date === dateString);
            
            if (!existingPrice) {
                prices.push({
                    date: dateString,
                    price: basePrice
                });
            }
        }
        
        console.log(`[UnifiedCalendarManager] Базовые цены для месяца ${monthKey} обеспечены`);
    }

    /**
     * Переключение видимости поля ввода скидки для выходных дней
     * @param {boolean} show - Показать или скрыть поле ввода
     */
    toggleWeekendDiscountInput(show) {
        try {
            // Находим поле ввода по атрибуту weekend_discount
            const weekendDiscountInput = document.querySelector('input[weekend_discount]');
            
            if (!weekendDiscountInput) {
                console.warn('[UnifiedCalendarManager] Поле ввода скидки для выходных дней не найдено');
                return;
            }
            
            console.log(`[UnifiedCalendarManager] Переключение видимости поля ввода скидки для выходных дней: ${show ? 'показать' : 'скрыть'}`);
            
            if (show) {
                weekendDiscountInput.style.display = 'block';
                console.log('[UnifiedCalendarManager] Поле ввода скидки для выходных дней отображено');
            } else {
                weekendDiscountInput.style.display = 'none';
                console.log('[UnifiedCalendarManager] Поле ввода скидки для выходных дней скрыто');
            }
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при переключении видимости поля ввода скидки для выходных дней:', error);
        }
    }

    /**
     * Проверка состояния чекбокса скидки для выходных дней
     */
    checkWeekendDiscountCheckbox() {
        try {
            // Находим чекбокс по имени и типу
            const weekendDiscountCheckbox = document.querySelector('input[type="checkbox"][name="Weekend-Discount"]');
            
            if (weekendDiscountCheckbox) {
                // Проверяем состояние чекбокса
                const isChecked = weekendDiscountCheckbox.checked;
                
                console.log(`[UnifiedCalendarManager] Проверка состояния чекбокса скидки для выходных дней: ${isChecked ? 'включен' : 'выключен'}`);
                
                // Переключаем видимость поля ввода скидки
                this.toggleWeekendDiscountInput(isChecked);
            } else {
                console.warn('[UnifiedCalendarManager] Чекбокс скидки для выходных дней не найден при проверке');
            }
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при проверке состояния чекбокса скидки для выходных дней:', error);
        }
    }

    /**
     * Сброс скидок для выходных дней
     */
    resetWeekendDiscounts() {
        try {
            const monthKey = this.currentMonthKey;
            if (!monthKey) {
                console.error('[UnifiedCalendarManager] Не определен текущий месяц');
                return;
            }
            
            const [year, month] = monthKey.split('-');
            const basePrice = this.getBasePrice();
            
            console.log(`[UnifiedCalendarManager] Сброс скидок для выходных дней в месяце ${monthKey}`);
            
            // Получаем количество дней в месяце
            const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
            
            // Проходим по всем дням месяца
            for (let day = 1; day <= daysInMonth; day++) {
                // Создаем объект даты
                const date = new Date(parseInt(year), parseInt(month) - 1, day);
                const dayOfWeek = date.getDay(); // 0 - воскресенье, 6 - суббота
                
                // Проверяем, является ли день выходным (суббота или воскресенье)
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    const timestamp = date.getTime();
                    const dateString = this.formatDate(day, month, year);
                    
                    // Проверяем, не заблокирован ли день
                    if (this.isDateBlocked(dateString, monthKey)) {
                        continue;
                    }
                    
                    // Удаляем скидку для этой даты
                    delete this.calendarData.dateDiscounts[timestamp];
                    
                    // Обновляем базовые цены в хранилище
                    if (this.calendarData.basePrices[monthKey]) {
                        const prices = this.calendarData.basePrices[monthKey].prices;
                        const priceIndex = prices.findIndex(item => item.date === dateString);
                        
                        if (priceIndex !== -1) {
                            prices[priceIndex].price = basePrice;
                        }
                    }
                    
                    // Обновляем UI для текущего месяца
                    document.querySelectorAll('.calendar_day-wrapper:not(.not_exist)').forEach(dayWrapper => {
                        const dayEl = dayWrapper.querySelector('[day]');
                        if (dayEl && parseInt(dayEl.textContent.trim()) === day) {
                            // Удаляем класс is-active
                            dayWrapper.classList.remove('is-active');
                            
                            // Обновляем отображаемую цену
                            const servicePriceElement = dayWrapper.querySelector('[service-price]');
                            if (servicePriceElement) {
                                servicePriceElement.textContent = basePrice;
                            }
                        }
                    });
                }
            }
            
            // Сохраняем данные месяца
            this.saveMonthData(monthKey);
            
            console.log('[UnifiedCalendarManager] Скидки для выходных дней успешно сброшены');
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при сбросе скидок для выходных дней:', error);
        }
    }

    /**
     * Переключение видимости элемента с выбранными датами
     * @param {boolean} show - Показать или скрыть элемент
     */
    toggleChosenDatesVisibility(show) {
        try {
            const chosenDatesElement = document.querySelector('[calendar-choosen]');
            if (!chosenDatesElement) {
                console.warn('[UnifiedCalendarManager] Элемент с выбранными датами не найден');
                return;
            }
            
            if (show) {
                chosenDatesElement.style.display = 'flex'; // Используем flex вместо block
                console.log('[UnifiedCalendarManager] Элемент с выбранными датами отображен');
            } else {
                chosenDatesElement.style.display = 'none';
                console.log('[UnifiedCalendarManager] Элемент с выбранными датами скрыт');
            }
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при переключении видимости элемента с выбранными датами:', error);
        }
    }

    /**
     * Отмена выбора диапазона
     */
    cancelRangeSelection() {
        try {
            // Очищаем предварительный выбор
            this.clearHoverEffect();
            
            // Сбрасываем состояние выбора
            this.tempSelection.isRangeConfirmed = true;
            this.tempSelection.start = null;
            this.tempSelection.startMonth = null;
            this.tempSelection.startYear = null;
            
            // Очищаем состояние ожидания
            this.clearWaitState();
            
            // Снимаем выделение с дней
            document.querySelectorAll('.calendar_day-wrapper.is-wait').forEach(dayWrapper => {
                dayWrapper.classList.remove('is-wait');
            });
            
            console.log('[UnifiedCalendarManager] Состояние выбора диапазона сброшено');
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при отмене выбора диапазона:', error);
        }
    }

    /**
     * Установка цвета фона для всех дней в диапазоне
     * @param {number} startTimestamp - Временная метка начала диапазона
     * @param {number} endTimestamp - Временная метка конца диапазона
     * @param {string} color - Цвет фона
     */
    setRangeBackgroundColor(startTimestamp, endTimestamp, color) {
        try {
            const startDate = new Date(startTimestamp);
            const endDate = new Date(endTimestamp);
            
            // Проходим по всем дням в диапазоне
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const day = date.getDate();
                const month = date.getMonth() + 1;
                const year = date.getFullYear();
                
                // Находим элемент дня в текущем месяце
                if (month === parseInt(this.currentMonthKey.split('-')[1]) && 
                    year === parseInt(this.currentMonthKey.split('-')[0])) {
                    
                    document.querySelectorAll('.calendar_day-wrapper:not(.not_exist)').forEach(dayWrapper => {
                        const dayEl = dayWrapper.querySelector('[day]');
                        if (dayEl && parseInt(dayEl.textContent.trim()) === day) {
                            dayWrapper.style.backgroundColor = color;
                        }
                    });
                }
            }
            
            console.log(`[UnifiedCalendarManager] Установлен цвет фона ${color} для диапазона дат`);
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при установке цвета фона для диапазона дат:', error);
        }
    }

    /**
     * Сброс цвета фона для всех дней
     */
    resetAllDaysBackgroundColor() {
        try {
            // Получаем все дни календаря
            const calendarDays = document.querySelectorAll('.calendar_day-wrapper:not(.not_exist)');
            
            // Сбрасываем цвет фона для каждого дня
            calendarDays.forEach(dayWrapper => {
                dayWrapper.style.backgroundColor = '';
            });
            
            console.log('[UnifiedCalendarManager] Цвет фона для всех дней сброшен');
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при сбросе цвета фона для всех дней:', error);
        }
    }
}

// Инициализация менеджера календаря при загрузке документа
document.addEventListener('DOMContentLoaded', function() {
    window.calendarManager = new UnifiedCalendarManager();
});
