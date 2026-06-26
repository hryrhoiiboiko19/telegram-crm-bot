## ===== General =====
start = Ласкаво просимо до CRM-бота! Надішліть /order, щоб створити замовлення.
unknown_command = Невідома команда. Надішліть /start, щоб переглянути інструкції.

## ===== Order conversation =====
service_request = Надішліть тип послуги, яку ви хочете замовити.
service_problem_description = Опишіть проблему для цієї послуги.
contact_request = Поділіться контактом, щоб ми могли з вами зв’язатися.
send_contact = Поділитися контактом
order_received = Дякуємо! Ваше замовлення прийнято.

## ===== Validation errors =====
invalid_service_type = Невірний тип послуги. Надішліть текст довжиною від 3 до 255 символів.
invalid_description = Невірний опис. Надішліть текст довжиною від 3 до 2000 символів.
invalid_phone_format = Невірний формат телефону. Надішліть номер у форматі +380XXXXXXXXX або скористайтеся кнопкою нижче, щоб поділитися контактом.

## ===== Admin =====
admin_access_denied = Доступ заборонено. Ви не є адміністратором.
admin_greetings = Ласкаво просимо до адмін-панелі CRM. Оберіть опцію або введіть /stats:
admin_export = 📊 Експорт до Google Sheets
admin_view_active_orders = 📦 Переглянути активні замовлення
admin_fetching_orders = Отримую замовлення та генерую звіт…
admin_successful_export = Дані успішно експортовано! Перевірте таблицю.
admin_failed_export = Експорт не вдався. Перевірте логи backend-контейнера.
admin_order_approve = ✅ Підтвердити
admin_order_cancel = ❌ Скасувати
admin_no_pending_orders = Немає замовлень у черзі.
admin_order_status_updated = Замовлення #{$orderId}: статус змінено на {$status}.
admin_get_stats = 📊 Загальна статистика за весь час:
  ------------------------
  ⏳ Замовлень у черзі: {$pending}
  ✅ Підтверджених замовлень: {$confirmed}
  📈 Конверсія: {$conversionRate}%
  🛠️ Найпопулярніша послуга: "{$mostPopularService}"
admin_update_order = {$updatedString}
  Послуга: {$serviceType}
  Опис: {$description}
  Створено: {$createdAt}
admin_order_updated = Оновлено замовлення з ID: {$orderId}

## ===== Notifications =====
order_update_notification = 🔔 Оновлення замовлення #{$orderId}: статус вашого замовлення змінено на: {$status}