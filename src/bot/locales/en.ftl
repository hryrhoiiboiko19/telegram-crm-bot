## ===== General =====
start = Welcome to the CRM bot! Type /order to place an order.
unknown_command = Unknown command. Type /start for usage instructions.
internal_server_error = ⚠️ An internal error occurred. Please try again later or contact support.
rate_limit_exceeded = 🛑 Too many requests! Please slow down.

## ===== Order conversation =====
service_request = Please send the type of service you want to request.
service_problem_description = Please send a description of the problem for this service.
contact_request = Please share your contact so we can reach you.
send_contact = Share contact
order_received = Thank you! Your order has been received.

## ===== Validation errors =====
invalid_service_type = Invalid service type. Please send a text between 3 and 255 characters.
invalid_description = Invalid description. Please send a text between 3 and 2000 characters.
invalid_phone_format = Invalid phone format. Please send a valid number like +380XXXXXXXXX, or use the button below to share your contact.

## ===== Admin =====
admin_access_denied = Access denied. You are not an administrator.
admin_greetings = Welcome to the Admin CRM panel. Select an option or type /stats:
admin_export = 📊 Export to Google Sheets
admin_view_active_orders = 📦 View Active Orders
admin_fetching_orders = Fetching orders and generating report…
admin_successful_export = Data successfully exported! Check your spreadsheet.
admin_failed_export = Export failed. Please check the backend container logs.
admin_order_approve = ✅ Confirm
admin_order_cancel = ❌ Cancel
admin_no_pending_orders = No pending orders.
admin_order_status_updated = Order #{$orderId} status updated to {$status}.
admin_broadcast_missing_message = Please provide a message. Usage: /broadcast <message>
admin_broadcast_started = 📣 Broadcast started, sending to {$count} users…
admin_broadcast_success = ✅ Broadcast finished: {$success} delivered, {$failed} failed.
admin_get_stats = 📊 CRM Business Analytics:
  ------------------------
  ⏳ Pending orders: {$pending}
  ✅ Confirmed orders: {$confirmed}
  ✔️ Completed orders: {$completed}
  ❌ Cancelled orders: {$cancelled}
  📈 Conversion rate: {$conversionRate}%
  🛠️ Most popular service: "{$mostPopularService}"
admin_update_order = {$updatedString}
  Service: {$serviceType}
  Description: {$description}
  Created at: {$createdAt}
admin_order_updated = Updated order with ID: {$orderId}

## ===== Notifications =====
order_update_notification = 🔔 Update on Order #{$orderId}: the status of your order has been updated to: {$status}