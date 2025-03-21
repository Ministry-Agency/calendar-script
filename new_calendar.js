/**
     * Навигация по месяцам (prev/next)
     * @param {string} direction - Направление навигации ('prev' или 'next')
     */
    navigateMonth(direction) {
        const monthYearElement = document.querySelector('[current_month_year]');
        if (!monthYearElement) {
            console.warn('[UnifiedCalendarManager] Элемент текущего месяца и года не найден');
            return;
        }

        try {
            const currentMonthText = monthYearElement.textContent.trim();
            let [monthName, year] = currentMonthText.split(' ');

            if (!monthName || !year || !MONTH_MAP[monthName]) {
                console.error(`[UnifiedCalendarManager] Некорректный формат месяца и года: ${currentMonthText}`);
                return;
            }

            let monthNum = MONTH_MAP[monthName];
            let yearNum = Number(year);

            if (isNaN(yearNum)) {
                console.error(`[UnifiedCalendarManager] Некорректный год: ${year}`);
                return;
            }

            if (direction === 'prev') {
                if (monthNum === '01') {
                    monthNum = '12';
                    yearNum -= 1;
                } else {
                    monthNum = (parseInt(monthNum) - 1).toString().padStart(2, '0');
                }
            } else if (direction === 'next') {
                if (monthNum === '12') {
                    monthNum = '01';
                    yearNum += 1;
                } else {
                    monthNum = (parseInt(monthNum) + 1).toString().padStart(2, '0');
                }
            } else {
                console.error(`[UnifiedCalendarManager] Неизвестное направление навигации: ${direction}`);
                return;
            }

            // Проверка на валидность результата
            if (yearNum < 1900 || yearNum > 2100) {
                console.error(`[UnifiedCalendarManager] Выход за допустимые границы года: ${yearNum}`);
                return;
            }

            monthYearElement.textContent = `${REVERSE_MONTH_MAP[monthNum]} ${yearNum}`;

            // Обновляем текущий ключ месяца
            this.currentMonthKey = `${yearNum}-${monthNum}`;

            // Загружаем данные для нового месяца
            this.loadMonthData(this.currentMonthKey);

            // Обновляем календарь
            this.updateCalendar();

            console.log(`[UnifiedCalendarManager] Навигация выполнена: ${direction}, новый месяц: ${REVERSE_MONTH_MAP[monthNum]} ${yearNum}`);
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при навигации по месяцам:', error);
        }
    }

    /**
     * Обработка клика по заблокированному дню
     * @param {HTMLElement} dayWrapper - DOM-элемент ячейки дня
     */
    handleBlockedDayClick(dayWrapper) {
        try {
            if (!dayWrapper || !dayWrapper.classList.contains('is-blocked')) {
                console.warn('[UnifiedCalendarManager] Передан неверный элемент дня');
                return;
            }

            // Переключаем класс active
            const isActive = dayWrapper.classList.contains('is-blocked-active');

            if (isActive) {
                dayWrapper.classList.remove('is-blocked-active');
            } else {
                dayWrapper.classList.add('is-blocked-active');

                // Активируем кнопку блокировки
                const button_block = document.querySelector('[button_block]');
                if (button_block) {
                    button_block.classList.add('is--add-service');
                }
            }

            const cell = dayWrapper.querySelector('[day]');
            if (!cell) {
                console.warn('[UnifiedCalendarManager] Элемент дня не найден');
                return;
            }

            const day = parseInt(cell.textContent.trim());
            if (isNaN(day) || day < 1 || day > 31) {
                console.error(`[UnifiedCalendarManager] Некорректный день: ${cell.textContent.trim()}`);
                return;
            }

            // Получаем текущие данные о месяце и годе
            const monthYearElement = document.querySelector('[current_month_year]');
            if (!monthYearElement) {
                console.warn('[UnifiedCalendarManager] Элемент текущего месяца и года не найден');
                return;
            }

            const [currentMonthName, currentYear] = monthYearElement.textContent.trim().split(' ');
            if (!currentMonthName || !currentYear || !MONTH_MAP[currentMonthName]) {
                console.error(`[UnifiedCalendarManager] Некорректный формат месяца и года: ${monthYearElement.textContent}`);
                return;
            }

            const monthNum = MONTH_MAP[currentMonthName];
            const yearNum = parseInt(currentYear);
            if (isNaN(yearNum)) {
                console.error(`[UnifiedCalendarManager] Некорректный год: ${currentYear}`);
                return;
            }

            // Формируем ключ и строку даты
            const monthYearKey = `${yearNum}-${monthNum}`;
            const dateString = this.formatDate(day, monthNum, yearNum);

            // Если день был активно заблокирован и стал неактивным, то полностью снимаем блокировку
            if (!dayWrapper.classList.contains('is-blocked-active')) {
                dayWrapper.classList.remove('is-blocked');

                // Восстанавливаем базовую цену
                const servicePriceElement = dayWrapper.querySelector('[service-price]');
                if (servicePriceElement) {
                    servicePriceElement.textContent = this.getBasePrice();
                }

                // Удаляем из списка заблокированных
                if (this.calendarData.blockedDates[monthYearKey]) {
                    this.calendarData.blockedDates[monthYearKey] = this.calendarData.blockedDates[monthYearKey].filter(item => {
                        if (typeof item === 'object' && item.date) {
                            return item.date !== dateString;
                        }
                        return item !== dateString;
                    });

                    // Обновляем цену в базовых ценах
                    if (this.calendarData.basePrices[monthYearKey]) {
                        const prices = this.calendarData.basePrices[monthYearKey].prices;
                        const priceIndex = prices.findIndex(item => item.date === dateString);

                        if (priceIndex !== -1) {
                            prices[priceIndex].price = this.getBasePrice();
                        }
                    }

                    this.saveMonthData(monthYearKey);
                }
            }

            console.log(`[UnifiedCalendarManager] Обработан клик по заблокированному дню: ${dateString}`);
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при обработке клика по заблокированному дню:', error);
        }
    }

    /**
     * Исключение дня из выбранного диапазона
     * @param {HTMLElement} dayWrapper - DOM-элемент ячейки дня
     * @param {Object} fullDate - Объект даты
     * @param {number} currentDate - Текущий день
     * @param {string} currentMonthName - Название текущего месяца
     * @param {string} currentYear - Текущий год
     */
    excludeDay(dayWrapper, fullDate, currentDate, currentMonthName, currentYear) {
        try {
            if (!dayWrapper || !fullDate || !fullDate.timestamp) {
                console.error('[UnifiedCalendarManager] Неверные параметры для исключения дня');
                return;
            }

            const servicePriceElement = dayWrapper.querySelector('[service-price]');
            if (!servicePriceElement) {
                console.warn('[UnifiedCalendarManager] Элемент цены не найден');
                return;
            }

            // Получаем базовую стоимость
            const basePrice = this.getBasePrice();

            // Устанавливаем базовую стоимость для исключаемого дня
            servicePriceElement.textContent = basePrice;

            // Добавляем день в исключения и удаляем класс is-active
            this.calendarData.excludedDates.add(fullDate.timestamp);
            dayWrapper.classList.remove('is-active');

            // Удаляем сохраненную скидку для этого дня
            if (this.calendarData.dateDiscounts[fullDate.timestamp]) {
                delete this.calendarData.dateDiscounts[fullDate.timestamp];
            }

            // Обновляем базовые цены
            const monthKey = this.currentMonthKey;
            if (!monthKey) {
                console.warn('[UnifiedCalendarManager] Текущий ключ месяца не определен');
                return;
            }

            const monthNum = MONTH_MAP[currentMonthName];
            if (!monthNum) {
                console.error(`[UnifiedCalendarManager] Неизвестный месяц: ${currentMonthName}`);
                return;
            }

            const date = this.formatDate(currentDate, monthNum, parseInt(currentYear));

            if (this.calendarData.basePrices[monthKey]) {
                const prices = this.calendarData.basePrices[monthKey].prices;
                const priceIndex = prices.findIndex(item => item.date === date);
                if (priceIndex !== -1) {
                    prices[priceIndex].price = basePrice;
                    this.saveMonthData(monthKey);
                }
            }

            // Очищаем состояние выбора
            this.clearWaitState();
            this.tempSelection.start = null;
            this.tempSelection.startMonth = null;
            this.tempSelection.startYear = null;

            console.log(`[UnifiedCalendarManager] День исключен из диапазона: ${date}`);
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при исключении дня из диапазона:', error);
        }
    }/**
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
        const storedSettings = localStorage.getItem('calendarGlobalSettings');
        if (storedSettings) {
            this.calendarData.globalSettings = JSON.parse(storedSettings);
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

        localStorage.setItem('calendarGlobalSettings',
                            JSON.stringify(this.calendarData.globalSettings));

        // Обновляем базовую стоимость для всех месяцев
        Object.keys(this.calendarData.basePrices).forEach(monthKey => {
            this.calendarData.basePrices[monthKey].defaultCost = defaultCost;
            this.saveMonthData(monthKey);
        });

        // Перезагружаем цены для текущего месяца
        this.loadMonthPrices();
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
     * Сохранение данных месяца в localStorage
     * @param {string} monthKey - Ключ месяца в формате YYYY-MM
     */
    saveMonthData(monthKey) {
        if (!monthKey) {
            console.error('[UnifiedCalendarManager] Не указан ключ месяца для сохранения данных');
            return;
        }

        const success = this.storage.save(`monthData-${monthKey}`, this.calendarData.basePrices[monthKey]);
        if (!success) {
            console.error(`[UnifiedCalendarManager] Не удалось сохранить данные месяца ${monthKey}`);
            return;
        }

        // Сохраняем заблокированные даты
        this.storage.save('blockedDatesMap', this.calendarData.blockedDates);

        console.log(`[UnifiedCalendarManager] Данные месяца ${monthKey} сохранены`);
    }

    /**
     * Гарантирует наличие базовых цен для всех дней месяца
     * @param {string} monthKey - Ключ месяца в формате YYYY-MM
     */
    ensureBasePrices(monthKey) {
        if (!monthKey) {
            console.error('[UnifiedCalendarManager] Не указан ключ месяца для обеспечения базовых цен');
            return;
        }

        try {
            const [year, month] = monthKey.split('-');
            if (!year || !month) {
                console.error(`[UnifiedCalendarManager] Неверный формат ключа месяца: ${monthKey}`);
                return;
            }

            const existingDates = this.calendarData.basePrices[monthKey].prices.map(item => item.date);
            const defaultCost = this.calendarData.basePrices[monthKey].defaultCost;

            // Получаем все дни текущего месяца
            document.querySelectorAll('.calendar_day-wrapper:not(.not_exist)').forEach(dayWrapper => {
                const dayElement = dayWrapper.querySelector('[day]');
                if (!dayElement) return;

                const dayText = dayElement.textContent.trim();
                if (dayText === "") return;

                try {
                    const day = parseInt(dayText);
                    if (isNaN(day) || day < 1 || day > 31) {
                        console.warn(`[UnifiedCalendarManager] Некорректный день месяца: ${dayText}`);
                        return;
                    }

                    const date = this.formatDate(day, month, year);

                    if (!existingDates.includes(date)) {
                        this.calendarData.basePrices[monthKey].prices.push({
                            date: date,
                            price: defaultCost
                        });
                    }
                } catch (error) {
                    console.error('[UnifiedCalendarManager] Ошибка при обработке дня месяца:', error);
                }
            });
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при обеспечении базовых цен:', error);
        }
    }
        // Гарантируем наличие цен для всех дней
        this.ensureBasePrices(monthKey);
    }

    /**
     * Сохранение данных месяца в localStorage
     */
    saveMonthData(monthKey) {
        localStorage.setItem(`monthData-${monthKey}`,
                            JSON.stringify(this.calendarData.basePrices[monthKey]));

        // Сохраняем заблокированные даты
        localStorage.setItem('blockedDatesMap',
                            JSON.stringify(this.calendarData.blockedDates));
    }

    /**
     * Гарантирует наличие базовых цен для всех дней месяца
     */
    ensureBasePrices(monthKey) {
        if (!monthKey) return;

        const [year, month] = monthKey.split('-');
        const existingDates = this.calendarData.basePrices[monthKey].prices.map(item => item.date);
        const defaultCost = this.calendarData.basePrices[monthKey].defaultCost;

        // Получаем все дни текущего месяца
        document.querySelectorAll('.calendar_day-wrapper:not(.not_exist)').forEach(dayWrapper => {
            const dayElement = dayWrapper.querySelector('[day]');
            if (!dayElement) return;

            const dayText = dayElement.textContent.trim();
            if (dayText === "") return;

            const day = parseInt(dayText);
            const date = this.formatDate(day, month, year);

            if (!existingDates.includes(date)) {
                this.calendarData.basePrices[monthKey].prices.push({
                    date: date,
                    price: defaultCost
                });
            }
        });
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
        const chosenDatesElement = document.querySelector('[chosen-dates]');
        if (!chosenDatesElement) {
            console.warn('[UnifiedCalendarManager] Элемент для отображения выбранных дат не найден');
            return;
        }

        if (this.calendarData.dateRanges.length === 0) {
            chosenDatesElement.textContent = '';
            return;
        }

        const lastRange = this.calendarData.dateRanges[this.calendarData.dateRanges.length - 1];
        const formattedRange = this.formatDateRange(lastRange);

        if (formattedRange) {
            chosenDatesElement.textContent = formattedRange;
        }
    }

    /**
     * Переключение видимости настроек календаря
     * @param {boolean} showChoosen - Показывать ли панель выбранных дат
     */
    toggleSettingsVisibility(showChoosen) {
        const settingsElement = document.querySelector('[calendar-settings]');
        const choosenElement = document.querySelector('[calendar-choosen]');

        if (settingsElement) {
            settingsElement.style.display = showChoosen ? 'none' : 'block';
        } else {
            console.warn('[UnifiedCalendarManager] Элемент настроек календаря не найден');
        }

        if (choosenElement) {
            choosenElement.style.display = showChoosen ? 'flex' : 'none';
        } else {
            console.warn('[UnifiedCalendarManager] Элемент выбранных дат не найден');
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
        if (this.calendarData.dateRanges.length === 0) {
            console.warn('[UnifiedCalendarManager] Нет диапазонов для отмены');
            return;
        }

        try {
            const lastRange = this.calendarData.dateRanges.pop();

            // Удаляем все скидки для дат в этом диапазоне
            const startTimestamp = lastRange.start.timestamp;
            const endTimestamp = lastRange.end.timestamp;

            // Проходим по всем дням в диапазоне и удаляем скидки
            for (let timestamp = startTimestamp; timestamp <= endTimestamp; timestamp += 86400000) {
                delete this.calendarData.dateDiscounts[timestamp];
            }

            this.updateAllDaysDisplay();
            this.toggleSettingsVisibility(false);
            this.tempSelection.isRangeConfirmed = true;

            // Обновляем состояние кнопки добавления услуги
            const button_open = document.querySelector('[button_open]');
            if (button_open) {
                if (this.calendarData.dateRanges.length === 0 && this.calendarData.excludedDates.size === 0) {
                    button_open.classList.remove('is--add-service');
                }
            }

            console.log('[UnifiedCalendarManager] Последний диапазон отменен');
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при отмене последнего диапазона:', error);
        }
    }

    /**
     * Полная очистка всех выбранных дат и настроек
     */
    clearAllDates() {
        try {
            // Сохраняем текущую базовую цену перед очисткой
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

            // Очищаем DOM - используем DocumentFragment для оптимизации
            const fragment = document.createDocumentFragment();
            const dayWrappers = document.querySelectorAll('.calendar_day-wrapper');

            dayWrappers.forEach(day => {
                // Очищаем классы
                day.classList.remove('is-selected');
                day.classList.remove('is-wait');
                day.classList.remove('is-active');
                day.classList.remove('is-blocked');
                day.classList.remove('is-blocked-active');

                // Сбрасываем цены к дефолтным значениям
                const servicePriceElement = day.querySelector('[service-price]');
                if (servicePriceElement) {
                    servicePriceElement.textContent = basePrice;
                }

                // Клонируем и добавляем в фрагмент для оптимизации перерисовки
                fragment.appendChild(day.cloneNode(true));
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

            this.toggleSettingsVisibility(false);

            // Очищаем localStorage
            this.storage.removeByPattern(/^monthData-/);
            this.storage.remove('blockedDatesMap');

            // Сохраняем глобальные настройки (базовая цена)
            this.saveGlobalSettings();

            // Обновляем календарь
            this.updateCalendar();

            console.log('[UnifiedCalendarManager] Все даты очищены');
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
            const selectedDiscountInput = document.querySelector('#selected_discount');
            if (!selectedDiscountInput) {
                console.warn('[UnifiedCalendarManager] Элемент ввода скидки не найден');
                return;
            }

            const selectedDiscount = selectedDiscountInput.value || '';
            const basePrice = this.getBasePrice();

            if (!selectedDiscount) {
                console.warn('[UnifiedCalendarManager] Не указан процент скидки');
                return;
            }

            const lastRange = this.calendarData.dateRanges[this.calendarData.dateRanges.length - 1];
            if (!lastRange || !lastRange.start || !lastRange.end) {
                console.error('[UnifiedCalendarManager] Некорректный диапазон дат');
                return;
            }

            const discountedPrice = this.applyDiscount(basePrice, selectedDiscount);
            console.log(`[UnifiedCalendarManager] Применяется скидка: ${selectedDiscount}%, новая цена: ${discountedPrice}`);

            // Используем DocumentFragment для оптимизации DOM-операций
            const fragment = document.createDocumentFragment();
            const currentMonthYearElement = document.querySelector('[current_month_year]');
            let currentMonthName, currentYear;

            if (currentMonthYearElement) {
                [currentMonthName, currentYear] = currentMonthYearElement.textContent.trim().split(' ');
                currentYear = parseInt(currentYear);
            }

            // Проходим по всем дням в диапазоне
            const startDate = new Date(lastRange.start.timestamp);
            const endDate = new Date(lastRange.end.timestamp);
            const processedMonthKeys = new Set(); // Для отслеживания обработанных месяцев

            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const timestamp = date.getTime();

                // Пропускаем исключенные дни
                if (this.isDateExcluded(timestamp)) continue;

                // Сохраняем цену со скидкой для этой даты
                this.calendarData.dateDiscounts[timestamp] = discountedPrice;

                // Находим соответствующий DOM-элемент для обновления отображения цены
                const day = date.getDate();
                const monthName = REVERSE_MONTH_MAP[String(date.getMonth() + 1).padStart(2, '0')];
                const year = date.getFullYear();

                // Если это текущий отображаемый месяц, обновляем UI
                if (currentMonthName && currentYear && monthName === currentMonthName && year === currentYear) {
                    // Находим ячейку для этого дня
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

                            // Клонируем и добавляем в фрагмент для оптимизации перерисовки
                            fragment.appendChild(dayWrapper.cloneNode(true));
                        }
                    });
                }

                // Обновляем базовые цены в хранилище
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const dateString = this.formatDate(day, month, year);
                const monthKey = `${year}-${month}`;
                processedMonthKeys.add(monthKey);

                if (!this.calendarData.basePrices[monthKey]) {
                    // Инициализируем данные для месяца, если их еще нет
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

                // Сохраняем данные для этого месяца
                this.saveMonthData(monthKey);
            }
        }

        // Обновляем отображение и состояние
        this.updateAllDaysDisplay();
        this.toggleSettingsVisibility(false);
        this.tempSelection.isRangeConfirmed = true;
        this.tempSelection.start = null;
        this.tempSelection.startMonth = null;
        this.tempSelection.startYear = null;
        this.clearWaitState();
    }Index = prices.findIndex(item => item.date === dateString);

                if (priceIndex !== -1) {
                    prices[priceIndex].price = discountedPrice;
                } else {
                    prices.push({ date: dateString, price: discountedPrice });
                }
            }

            // Сохраняем данные для всех затронутых месяцев
            processedMonthKeys.forEach(monthKey => {
                this.saveMonthData(monthKey);
            });

            // Обновляем отображение и состояние
            this.updateAllDaysDisplay();
            this.toggleSettingsVisibility(false);
            this.tempSelection.isRangeConfirmed = true;
            this.tempSelection.start = null;
            this.tempSelection.startMonth = null;
            this.tempSelection.startYear = null;
            this.clearWaitState();

            console.log('[UnifiedCalendarManager] Скидка успешно применена к диапазону дат');
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при применении скидки к диапазону:', error);
        }
    }Index = prices.findIndex(item => item.date === dateString);

                if (priceIndex !== -1) {
                    prices[priceIndex].price = discountedPrice;
                } else {
                    prices.push({ date: dateString, price: discountedPrice });
                }

                // Сохраняем данные для этого месяца
                this.saveMonthData(monthKey);
            }
        }

        // Обновляем отображение и состояние
        this.updateAllDaysDisplay();
        this.toggleSettingsVisibility(false);
        this.tempSelection.isRangeConfirmed = true;
        this.tempSelection.start = null;
        this.tempSelection.startMonth = null;
        this.tempSelection.startYear = null;
        this.clearWaitState();
    }

    /**
     * Применение скидки для выходных дней
     */
    applyWeekendDiscount(discountPercent) {
        const monthKey = this.currentMonthKey;
        if (!monthKey) return;

        const [year, month] = monthKey.split('-');
        const basePrice = this.getBasePrice();
        const discountedPrice = this.applyDiscount(basePrice, discountPercent);

        // Применяем скидку ко всем выходным текущего месяца
        const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(parseInt(year), parseInt(month) - 1, day);
            const isWeekend = (date.getDay() === 0 || date.getDay() === 6); // воскресенье или суббота

            if (isWeekend) {
                const dateString = this.formatDate(day, month, year);
                const timestamp = date.getTime();

                // Пропускаем заблокированные или исключенные дни
                if (this.isDateExcluded(timestamp) ||
                    this.isDateBlocked(dateString, monthKey)) continue;

                // Сохраняем цену со скидкой
                this.calendarData.dateDiscounts[timestamp] = discountedPrice;

                // Обновляем базовые цены
                if (!this.calendarData.basePrices[monthKey]) {
                    // Инициализируем данные для месяца, если их еще нет
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

                // Находим ячейку для этого дня и обновляем ее внешний вид
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

        this.saveMonthData(monthKey);
        this.updateAllDaysDisplay();
    }

    /**
     * Блокировка выбранного диапазона дат
     */
    blockSelectedRange() {
        const chosenDatesElement = document.querySelector('[chosen-dates]');
        if (!chosenDatesElement) {
            console.warn('[UnifiedCalendarManager] Элемент выбранных дат не найден');
            return;
        }

        try {
            // Извлекаем диапазон дат
            const dateRangeText = chosenDatesElement.textContent.trim();
            const dateMatch = dateRangeText.match(/(\d+)\s*-\s*(\d+)\s*(\w+)/);

            if (!dateMatch) {
                console.error(`[UnifiedCalendarManager] Не удалось распознать диапазон дат: ${dateRangeText}`);
                return;
            }

            const startDay = parseInt(dateMatch[1]);
            const endDay = parseInt(dateMatch[2]);
            const monthName = dateMatch[3];

            if (!startDay || !endDay || !monthName) {
                console.error(`[UnifiedCalendarManager] Некорректные параметры диапазона: начало=${startDay}, конец=${endDay}, месяц=${monthName}`);
                return;
            }

            // Получаем текущий месяц и год
            const monthYearElement = document.querySelector('[current_month_year]');
            if (!monthYearElement) {
                console.error('[UnifiedCalendarManager] Элемент текущего месяца и года не найден');
                return;
            }

            const [currentMonthName, currentYear] = monthYearElement.textContent.trim().split(' ');
            if (!MONTH_MAP[currentMonthName]) {
                console.error(`[UnifiedCalendarManager] Неизвестный месяц: ${currentMonthName}`);
                return;
            }

            const currentMonthNumber = MONTH_MAP[currentMonthName];
            const yearNum = parseInt(currentYear);

            // Ключ для текущего месяца и года
            const monthYearKey = `${currentYear}-${currentMonthNumber}`;

            // Инициализируем массив для этого месяца, если его нет
            if (!this.calendarData.blockedDates[monthYearKey]) {
                this.calendarData.blockedDates[monthYearKey] = [];
            }

            console.log(`[UnifiedCalendarManager] Блокировка диапазона дат: ${startDay}-${endDay} ${currentMonthName} ${currentYear}`);

            // Создаем DocumentFragment для оптимизации DOM-операций
            const fragment = document.createDocumentFragment();
            const blockedDays = [];

            // Блокируем дни в диапазоне
            for (let day = startDay; day <= endDay; day++) {
                const dateString = this.formatDate(day, currentMonthNumber, yearNum);

                // Проверяем, существует ли уже такая дата в массиве
                const existingIndex = this.calendarData.blockedDates[monthYearKey].findIndex(item => {
                    if (typeof item === 'object' && item.date) {
                        return item.date === dateString;
                    }
                    return item === dateString;
                });

                // Добавляем или обновляем элемент с ценой 0
                if (existingIndex === -1) {
                    this.calendarData.blockedDates[monthYearKey].push({
                        date: dateString,
                        price: 0
                    });
                } else {
                    // Если элемент был строкой, преобразуем в объект
                    if (typeof this.calendarData.blockedDates[monthYearKey][existingIndex] === 'string') {
                        this.calendarData.blockedDates[monthYearKey][existingIndex] = {
                            date: dateString,
                            price: 0
                        };
                    } else {
                        // Иначе просто обновляем цену
                        this.calendarData.blockedDates[monthYearKey][existingIndex].price = 0;
                    }
                }

                // Также обновляем данные о ценах
                if (!this.calendarData.basePrices[monthYearKey]) {
                    this.calendarData.basePrices[monthYearKey] = {
                        prices: [],
                        defaultCost: this.getBasePrice()
                    };
                }

                const prices = this.calendarData.basePrices[monthYearKey].prices;
                const priceIndex = prices.findIndex(item => item.date === dateString);

                if (priceIndex !== -1) {
                    prices[priceIndex].price = 0;
                } else {
                    prices.push({ date: dateString, price: 0 });
                }

                // Добавляем день в список заблокированных
                blockedDays.push(day);
            }

            // Обновляем UI для заблокированных дней
            blockedDays.forEach(day => {
                document.querySelectorAll('.calendar_day-wrapper:not(.not_exist)').forEach(dayWrapper => {
                    const dayEl = dayWrapper.querySelector('[day]');
                    if (dayEl && parseInt(dayEl.textContent.trim()) === day) {
                        // Добавляем классы блокировки
                        dayWrapper.classList.add('is-blocked');
                        dayWrapper.classList.add('is-blocked-active');

                        // Устанавливаем цену в 0
                        const servicePriceElement = dayWrapper.querySelector('[service-price]');
                        if (servicePriceElement) {
                            servicePriceElement.textContent = '0';
                        }

                        // Клонируем и добавляем в фрагмент для оптимизации перерисовки
                        fragment.appendChild(dayWrapper.cloneNode(true));
                    }
                });
            });

            // Сохраняем обновленные данные
            this.saveMonthData(monthYearKey);

            // Обновляем отображение
            this.updateAllDaysDisplay();

            console.log(`[UnifiedCalendarManager] Диапазон дат успешно заблокирован. Заблокировано дней: ${blockedDays.length}`);
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при блокировке диапазона дат:', error);
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

            // Используем DocumentFragment для оптимизации DOM-операций
            const fragment = document.createDocumentFragment();

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

                    // Клонируем и добавляем в фрагмент для оптимизации перерисовки
                    fragment.appendChild(dayWrapper.cloneNode(true));
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

                    // Клонируем и добавляем в фрагмент для оптимизации перерисовки
                    fragment.appendChild(dayWrapper.cloneNode(true));
                } catch (error) {
                    console.error(`[UnifiedCalendarManager] Ошибка при генерации ячейки ${i}:`, error);
                }
            }

            this.updateAllDaysDisplay();
            console.log(`[UnifiedCalendarManager] Календарь сгенерирован для ${month}.${year}`);
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при генерации календаря:', error);
        }
    }DateBlocked(dateString, monthYearKey);
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

                    // Клонируем и добавляем в фрагмент для оптимизации перерисовки
                    fragment.appendChild(dayWrapper.cloneNode(true));
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
    }DateBlocked(dateString, monthYearKey);
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
        });

        // Обновляем данные о ценах в хранилище
        if (this.calendarData.basePrices[monthYearKey]) {
            this.saveMonthData(monthYearKey);
        }
    }

    /**
     * Генерация календаря для указанного месяца и года
     */
    generateCalendar(dateString) {
        const [month, year] = dateString.split('.').map(Number);
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

        // Заполняем календарь датами
        let flatDays = calendarArray.flat();
        for (let i = 0; i < 42; i++) {
            const cell = document.querySelector(`[day='${i}']`);
            const dayWrapper = cell ? cell.closest('.calendar_day-wrapper') : null;
            if (cell && dayWrapper) {
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
            }
        }

        this.updateAllDaysDisplay();
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

                    // Клонируем и добавляем в фрагмент для оптимизации перерисовки
                    fragment.appendChild(dayWrapper.cloneNode(true));
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
     * Инициализация обработчиков событий
     */
    initHandlers() {
        try {
            // Обработчик для кнопки очистки дат
            const clearDatesBtn = document.querySelector('[clear-dates]');
            if (clearDatesBtn) {
                clearDatesBtn.addEventListener('click', (event) => {
                    event.preventDefault();
                    this.clearAllDates();
                });
            } else {
                console.warn('[UnifiedCalendarManager] Кнопка очистки дат не найдена');
            }

            // Обработчик для кнопки отмены последнего диапазона
            const cancelBtn = document.querySelector('[calendar-choosen-cancel]');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', (event) => {
                    event.preventDefault();
                    this.cancelLastRange();
                });
            } else {
                console.warn('[UnifiedCalendarManager] Кнопка отмены диапазона не найдена');
            }

            // Обработчики для кнопок навигации по месяцам
            const prevBtn = document.querySelector('.calendar_prev');
            const nextBtn = document.querySelector('.calendar_next');

            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    this.navigateMonth('prev');
                });
            } else {
                console.warn('[UnifiedCalendarManager] Кнопка предыдущего месяца не найдена');
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    this.navigateMonth('next');
                });
            } else {
                console.warn('[UnifiedCalendarManager] Кнопка следующего месяца не найдена');
            }

            // Обработчик для выбора дней календаря
            document.addEventListener('click', (event) => {
                this.handleDayClick(event);
            });

            // Обработчик для применения скидки к выбранному диапазону
            const applyBtn = document.querySelector('[calendar-apply-button]');
            if (applyBtn) {
                applyBtn.addEventListener('click', (event) => {
                    event.preventDefault();
                    this.applyDiscountToRange();
                });
            } else {
                console.warn('[UnifiedCalendarManager] Кнопка применения скидки не найдена');
            }

            // Обработчик для кнопки блокировки дат
            const blockBtn = document.querySelector('[button_block]');
            if (blockBtn) {
                blockBtn.addEventListener('click', (event) => {
                    event.preventDefault();
                    this.blockSelectedRange();
                });
            } else {
                console.warn('[UnifiedCalendarManager] Кнопка блокировки дат не найдена');
            }

            // Обработчик для изменения базовой стоимости
            const costInput = document.querySelector('input[name="cost_per_hour"]');
            if (costInput) {
                costInput.addEventListener('input', () => {
                    this.saveGlobalSettings();
                });
            } else {
                console.warn('[UnifiedCalendarManager] Поле ввода стоимости не найдено');
            }

            // Обработчик для свитчера выходных дней
            const weekendDiscountCheckbox = document.querySelector('#weekend_discount');
            const weekendDiscountInput = document.querySelector('input[weekend_discount]');

            if (weekendDiscountCheckbox && weekendDiscountInput) {
                weekendDiscountCheckbox.addEventListener('change', () => {
                    if (weekendDiscountCheckbox.checked) {
                        const discountPercent = parseFloat(weekendDiscountInput.value.replace(/[^\d.]/g, '')) || 0;
                        this.applyWeekendDiscount(discountPercent);
                    } else {
                        // Сбрасываем скидки для выходных
                        this.resetWeekendDiscounts();
                    }
                });

                weekendDiscountInput.addEventListener('input', () => {
                    if (weekendDiscountCheckbox.checked) {
                        const discountPercent = parseFloat(weekendDiscountInput.value.replace(/[^\d.]/g, '')) || 0;
                        this.applyWeekendDiscount(discountPercent);
                    }
                });
            } else {
                console.warn('[UnifiedCalendarManager] Элементы управления скидкой для выходных не найдены');
            }

            console.log('[UnifiedCalendarManager] Обработчики событий инициализированы');
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при инициализации обработчиков событий:', error);
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
     * Навигация по месяцам (prev/next)
     */
    navigateMonth(direction) {
        const monthYearElement = document.querySelector('[current_month_year]');
        if (!monthYearElement) return;

        const currentMonthText = monthYearElement.textContent.trim();
        let [monthName, year] = currentMonthText.split(' ');
        let monthNum = MONTH_MAP[monthName];
        let yearNum = Number(year);

        if (direction === 'prev') {
            if (monthNum === '01') {
                monthNum = '12';
                yearNum -= 1;
            } else {
                monthNum = (parseInt(monthNum) - 1).toString().padStart(2, '0');
            }
        } else {
            if (monthNum === '12') {
                monthNum = '01';
                yearNum += 1;
            } else {
                monthNum = (parseInt(monthNum) + 1).toString().padStart(2, '0');
            }
        }

        monthYearElement.textContent = `${REVERSE_MONTH_MAP[monthNum]} ${yearNum}`;

        // Обновляем текущий ключ месяца
        this.currentMonthKey = `${yearNum}-${monthNum}`;

        // Загружаем данные для нового месяца
        this.loadMonthData(this.currentMonthKey);

        // Обновляем календарь
        this.updateCalendar();
    }

    /**
     * Обработчик клика по дню календаря
     */
    handleDayClick(event) {
        const dayWrapper = event.target.closest('.calendar_day-wrapper');
        const button_open = document.querySelector('[button_open]');
        const button_block = document.querySelector('[button_block]');

        if (!dayWrapper) return;

        // Если процесс выбора не завершен, игнорируем
        if (!this.tempSelection.isRangeConfirmed) {
            return;
        }

        // Обработка заблокированных дней
        if (dayWrapper.classList.contains('is-blocked')) {
            this.handleBlockedDayClick(dayWrapper);
            return;
        }

        const cell = dayWrapper.querySelector('[day]');
        if (!cell) return;

        const dayText = cell.textContent.trim();
        if (dayText === "") return;

        const currentDate = parseInt(dayText);
        const monthYearElement = document.querySelector('[current_month_year]');
        if (!monthYearElement) return;

        const [currentMonthName, currentYear] = monthYearElement.textContent.trim().split(' ');
        const fullDate = this.createFullDate(currentDate, currentMonthName, parseInt(currentYear));

        const isInRange = this.isDateInRanges(fullDate);

        // Сценарий 1: Исключение выбранного дня из диапазона
        if (isInRange && !this.isDateExcluded(fullDate.timestamp)) {
            this.excludeDay(dayWrapper, fullDate, currentDate, currentMonthName, currentYear);
        }
        // Сценарий 2: Начало нового диапазона или завершение выбора
        else {
            if (!this.tempSelection.start) {
                this.startRangeSelection(dayWrapper, currentDate, currentMonthName, currentYear, fullDate);
            } else {
                this.completeRangeSelection(currentDate, currentMonthName, currentYear, fullDate);
            }
        }

        this.updateAllDaysDisplay();

        if (button_open && (this.calendarData.dateRanges.length > 0 || this.calendarData.excludedDates.size > 0)) {
            button_open.classList.add('is--add-service');
        }
    }

    /**
     * Начало выбора диапазона дат
     * @param {HTMLElement} dayWrapper - DOM-элемент ячейки дня
     * @param {number} currentDate - Текущий день
     * @param {string} currentMonthName - Название текущего месяца
     * @param {number} currentYear - Текущий год
     * @param {Object} fullDate - Объект даты
     */
    startRangeSelection(dayWrapper, currentDate, currentMonthName, currentYear, fullDate) {
        try {
            if (!dayWrapper || !fullDate || !fullDate.timestamp) {
                console.error('[UnifiedCalendarManager] Неверные параметры для начала выбора диапазона');
                return;
            }

            this.clearWaitState();

            // Если день был исключен, удаляем его из исключений
            if (this.isDateExcluded(fullDate.timestamp)) {
                this.calendarData.excludedDates.delete(fullDate.timestamp);
            }

            this.tempSelection.start = currentDate;
            this.tempSelection.startMonth = currentMonthName;
            this.tempSelection.startYear = parseInt(currentYear);

            dayWrapper.classList.add('is-wait');
            dayWrapper.classList.add('is-selected');

            console.log(`[UnifiedCalendarManager] Начат выбор диапазона с даты: ${currentDate} ${currentMonthName} ${currentYear}`);
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при начале выбора диапазона:', error);
        }
    }

    /**
     * Завершение выбора диапазона дат
     * @param {number} currentDate - Текущий день
     * @param {string} currentMonthName - Название текущего месяца
     * @param {number} currentYear - Текущий год
     * @param {Object} fullDate - Объект даты
     */
    completeRangeSelection(currentDate, currentMonthName, currentYear, fullDate) {
        try {
            if (!fullDate || !fullDate.timestamp || !this.tempSelection.start) {
                console.error('[UnifiedCalendarManager] Неверные параметры для завершения выбора диапазона');
                return;
            }

            const startDate = this.createFullDate(
                this.tempSelection.start,
                this.tempSelection.startMonth,
                this.tempSelection.startYear
            );

            if (!startDate) {
                console.error('[UnifiedCalendarManager] Не удалось создать объект начальной даты');
                return;
            }

            const endDate = fullDate;

            // Проверка на перекрытие с существующими диапазонами
            if (this.isRangeOverlap(startDate.timestamp, endDate.timestamp)) {
                console.warn('[UnifiedCalendarManager] Новый диапазон пересекается с существующими');
                // Можно добавить здесь уведомление пользователя
            }

            // Сортируем даты, чтобы начальная была меньше конечной
            let start, end;
            if (startDate.timestamp > endDate.timestamp) {
                start = endDate;
                end = startDate;
            } else {
                start = startDate;
                end = endDate;
            }

            // Добавляем новый диапазон
            this.calendarData.dateRanges.push({ start, end });

            this.tempSelection.isRangeConfirmed = false;
            this.toggleSettingsVisibility(true);
            this.updateChosenDates();

            // Сбрасываем поле скидки
            const selectedDiscountInput = document.querySelector('#selected_discount');
            if (selectedDiscountInput) {
                selectedDiscountInput.value = '';
            }

            this.clearWaitState();
            this.tempSelection.start = null;
            this.tempSelection.startMonth = null;
            this.tempSelection.startYear = null;

            console.log(`[UnifiedCalendarManager] Завершен выбор диапазона: ${this.formatDateRange({ start, end })}`);
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при завершении выбора диапазона:', error);
        }
    }
}
        const endDate = fullDate;

        // Сортируем даты, чтобы начальная была меньше конечной
        let start, end;
        if (startDate.timestamp > endDate.timestamp) {
            start = endDate;
            end = startDate;
        } else {
            start = startDate;
            end = endDate;
        }

        // Добавляем новый диапазон
        this.calendarData.dateRanges.push({ start, end });

        this.tempSelection.isRangeConfirmed = false;
        this.toggleSettingsVisibility(true);
        this.updateChosenDates();

        // Сбрасываем поле скидки
        const selectedDiscountInput = document.querySelector('#selected_discount');
        if (selectedDiscountInput) {
            selectedDiscountInput.value = '';
        }

        this.clearWaitState();
        this.tempSelection.start = null;
        this.tempSelection.startMonth = null;
        this.tempSelection.startYear = null;
    }
}

// Запуск после загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
    window.calendarManager = new UnifiedCalendarManager();
});
