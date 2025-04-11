// Frontend/my-react-app/src/utils/dateUtils.js
export const formatDate = (dateString) => {
    if (!dateString) return 'Brak danych';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
          // Handle cases where the dateString might be just a date without time
          const dateOnly = new Date(dateString + 'T00:00:00Z'); // Assume UTC if no timezone
           if (isNaN(dateOnly.getTime())) {
              console.warn("Received invalid date string:", dateString);
              return 'Nieprawidłowa data';
           }
           return dateOnly.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      }
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return 'Błąd daty';
    }
  };