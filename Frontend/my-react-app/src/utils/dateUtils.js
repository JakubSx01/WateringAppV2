// Frontend/my-react-app/src/utils/dateUtils.js
export const formatDate = (dateString) => {
  if (!dateString) return 'Brak danych';
  try {
    // Try parsing as a full date string first
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
        // If parsing fails, try parsing as date only (assuming YYYY-MM-DD format)
        // Adding 'T00:00:00' and 'Z' helps ensure it's treated as UTC midnight
        // which is then converted to local time by toLocaleDateString.
        // This avoids timezone issues where a date like '2025-04-25' in UTC
        // might become '2025-04-24' in a timezone like America/New_York.
        // However, toLocaleDateString *itself* uses the system's locale and timezone.
        // A simpler approach for date-only from backend might just be to display the string itself if it's reliable.
        // But converting ensures consistency if dateString might include time sometimes.
        // Let's stick to trying to parse and then format.
        const dateOnly = new Date(dateString); // Re-attempt without 'T00:00:00Z' first
         if (isNaN(dateOnly.getTime())) {
            console.warn("Received invalid date string:", dateString);
            return 'Nieprawidłowa data';
         }
         // If it's a date-only string that parsed correctly, format it without time
         // Use date-only formatting options
         return dateOnly.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
    // If it parsed as a full datetime string, format it.
    // We might want different formatting for datetime vs date-only.
    // For simplicity, let's use date-only format for both for now as next_watering_date is a DateField.
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return 'Błąd daty';
  }
};