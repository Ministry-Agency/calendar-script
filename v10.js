// ... existing code ...

    /**
     * Конструктор класса UnifiedCalendarManager
     */
    constructor() {
        // Инициализация данных календаря
        this.calendarData = {
            dateRanges: [],
            activeDates: {},
            prices: {}
        };
        
        // Получаем текущую дату
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // getMonth() возвращает месяц от 0 до 11
        
        // Устанавливаем текущий месяц
        this.currentMonthKey = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
        
        console.log(`[UnifiedCalendarManager] Инициализация для месяца ${this.currentMonthKey}`);
        
        // Инициализация менеджера
        this.init();
    }

    /**
     * Обновление календаря
     */
    updateCalendar() {
        try {
            console.log('[UnifiedCalendarManager] Обновление календаря...');
            
            // Генерируем календарь
            this.generateCalendar();
            
            // Обновляем цены (если метод существует)
            if (typeof this.updatePrices === 'function') {
                this.updatePrices();
            } else {
                // Если метод updatePrices не определен, создаем его
                this.updatePrices = function() {
                    console.log('[UnifiedCalendarManager] Обновление цен...');
                    
                    // Получаем текущий год и месяц
                    const [year, month] = this.currentMonthKey.split('-').map(Number);
                    
                    // Получаем все дни календаря
                    const calendarDays = document.querySelectorAll('.calendar_day-wrapper:not(.not_exist)');
                    
                    // Обновляем цены для каждого дня
                    calendarDays.forEach(dayWrapper => {
                        const dayElement = dayWrapper.querySelector('[day]');
                        if (!dayElement) return;
                        
                        const day = parseInt(dayElement.getAttribute('day'));
                        if (isNaN(day)) return;
                        
                        // Формируем ключ даты
                        const dateKey = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                        
                        // Получаем цену для текущего дня
                        const price = this.calendarData.prices[dateKey] || 0;
                        
                        // Обновляем отображение цены
                        const priceElement = dayWrapper.querySelector('.calendar_day-price');
                        if (priceElement) {
                            priceElement.textContent = price > 0 ? `${price} ₽` : '';
                        }
                    });
                    
                    console.log('[UnifiedCalendarManager] Цены обновлены');
                };
                
                // Вызываем созданный метод
                this.updatePrices();
            }
            
            // Получаем текущий год и месяц
            const [year, month] = this.currentMonthKey.split('-').map(Number);
            
            // Получаем название месяца на английском
            const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];
            const monthName = monthNames[month - 1];
            
            // Обновляем заголовок месяца в элементе с классом calendar_month
            const calendarMonthElement = document.querySelector('.calendar_month');
            if (calendarMonthElement) {
                calendarMonthElement.textContent = `${monthName} ${year}`;
                console.log(`[UnifiedCalendarManager] Заголовок месяца обновлен: ${monthName} ${year}`);
            } else {
                console.warn('[UnifiedCalendarManager] Элемент с классом calendar_month не найден');
            }
            
            // Обновляем заголовок месяца в элементе с атрибутом calendar-month
            const calendarMonthAttrElement = document.querySelector('[calendar-month]');
            if (calendarMonthAttrElement) {
                calendarMonthAttrElement.textContent = `${monthName} ${year}`;
                console.log(`[UnifiedCalendarManager] Заголовок месяца (атрибут) обновлен: ${monthName} ${year}`);
            }
            
            console.log(`[UnifiedCalendarManager] Календарь обновлен для ${monthName} ${year}`);
            
            // Переинициализируем обработчики для эффекта hover
            this.initHoverEffectHandlers();
            
            // Обновляем отображение всех дней
            this.updateAllDaysDisplay();
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при обновлении календаря:', error);
        }
    }

    /**
     * Генерация календаря
     */
    generateCalendar() {
        try {
            console.log('[UnifiedCalendarManager] Генерация календаря...');
            
            // Получаем текущий год и месяц
            const [year, month] = this.currentMonthKey.split('-').map(Number);
            
            // Проверяем корректность формата даты
            if (isNaN(year) || isNaN(month)) {
                console.error(`[UnifiedCalendarManager] Некорректный формат даты: ${this.currentMonthKey}`);
                return;
            }
            
            // Получаем контейнер календаря
            const calendarContainer = document.querySelector('.calendar_days');
            if (!calendarContainer) {
                console.error('[UnifiedCalendarManager] Контейнер календаря не найден');
                return;
            }
            
            // Очищаем контейнер
            calendarContainer.innerHTML = '';
            
            // Создаем объект даты для первого дня месяца
            const firstDay = new Date(year, month - 1, 1);
            
            // Получаем день недели первого дня месяца (0 - воскресенье, 1 - понедельник, и т.д.)
            const firstDayOfWeek = firstDay.getDay();
            
            // Получаем количество дней в месяце
            const daysInMonth = new Date(year, month, 0).getDate();
            
            // Добавляем пустые ячейки для дней до первого дня месяца
            // Если первый день месяца - воскресенье (0), то добавляем 6 пустых ячеек
            // Если первый день месяца - понедельник (1), то добавляем 0 пустых ячеек
            // И так далее
            const emptyCellsCount = (firstDayOfWeek === 0) ? 6 : firstDayOfWeek - 1;
            
            for (let i = 0; i < emptyCellsCount; i++) {
                const emptyCell = document.createElement('div');
                emptyCell.className = 'calendar_day-wrapper not_exist';
                calendarContainer.appendChild(emptyCell);
            }
            
            // Добавляем ячейки для дней месяца
            for (let day = 1; day <= daysInMonth; day++) {
                // Создаем элемент для дня
                const dayElement = document.createElement('div');
                dayElement.className = 'calendar_day-wrapper';
                dayElement.setAttribute('day', day);
                
                // Создаем дату для текущего дня
                const date = new Date(year, month - 1, day);
                
                // Проверяем, является ли день выходным
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                
                // Добавляем класс для выходных дней
                if (isWeekend) {
                    dayElement.classList.add('weekend');
                }
                
                // Проверяем, является ли день текущим
                const today = new Date();
                const isToday = date.getDate() === today.getDate() && 
                                date.getMonth() === today.getMonth() && 
                                date.getFullYear() === today.getFullYear();
                
                // Добавляем класс для текущего дня
                if (isToday) {
                    dayElement.classList.add('today');
                }
                
                // Создаем внутреннюю структуру дня
                dayElement.innerHTML = `
                    <div class="calendar_day">
                        <div class="calendar_day-number" day="${day}">${day}</div>
                        <div class="calendar_day-price"></div>
                    </div>
                `;
                
                // Добавляем обработчик клика
                dayElement.addEventListener('click', () => {
                    this.handleDayClick(day, dayElement);
                });
                
                // Добавляем день в контейнер
                calendarContainer.appendChild(dayElement);
            }
            
            console.log(`[UnifiedCalendarManager] Календарь сгенерирован для ${month}.${year}`);
        } catch (error) {
            console.error('[UnifiedCalendarManager] Ошибка при генерации календаря:', error);
        }
    }

// ... existing code ...
