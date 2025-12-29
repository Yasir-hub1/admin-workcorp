/**
 * Formateadores de datos
 */

export const formatCurrency = (value, currency = 'BOB') => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: currency,
  }).format(value);
};

export const formatNumber = (value) => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('es-BO').format(value);
};

/**
 * Formatea una fecha evitando problemas de zona horaria
 * Si la fecha viene en formato YYYY-MM-DD, la parsea directamente sin usar new Date()
 * para evitar que se muestre un día antes
 */
export const formatDate = (date, format = 'short') => {
  if (!date) return '-';
  
  // Si la fecha viene en formato YYYY-MM-DD, parsearla directamente
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number);
    
    if (format === 'short') {
      return new Intl.DateTimeFormat('es-BO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'UTC', // Usar UTC para evitar problemas de zona horaria
      }).format(new Date(Date.UTC(year, month - 1, day)));
    }
    
    if (format === 'long') {
      return new Intl.DateTimeFormat('es-BO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(Date.UTC(year, month - 1, day)));
    }
    
    if (format === 'datetime') {
      return new Intl.DateTimeFormat('es-BO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
      }).format(new Date(Date.UTC(year, month - 1, day)));
    }
    
    // Formato por defecto
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
  }
  
  // Para otros formatos de fecha, usar el método tradicional
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return '-';
  }
  
  if (format === 'short') {
    return new Intl.DateTimeFormat('es-BO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(dateObj);
  }
  
  if (format === 'long') {
    return new Intl.DateTimeFormat('es-BO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj);
  }
  
  if (format === 'datetime') {
    return new Intl.DateTimeFormat('es-BO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  }
  
  return dateObj.toLocaleDateString('es-BO');
};

/**
 * Formatea una fecha con hora evitando problemas de zona horaria
 * Maneja fechas ISO y otros formatos correctamente
 */
export const formatDateTime = (date) => {
  if (!date) return '-';
  
  try {
    const dateObj = new Date(date);
    
    // Verificar que la fecha es válida
    if (isNaN(dateObj.getTime())) {
      return '-';
    }
    
    // Formatear con la zona horaria local del usuario
    return new Intl.DateTimeFormat('es-BO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Usar la zona horaria del usuario
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting date time:', error, date);
    return '-';
  }
};

export const formatPercentage = (value) => {
  if (value === null || value === undefined) return '-';
  return `${Number(value).toFixed(2)}%`;
};

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Convierte una fecha a formato YYYY-MM-DD para inputs type="date"
 * Maneja diferentes formatos de fecha que pueden venir del backend
 */
export const formatDateForInput = (date) => {
  if (!date) return '';
  
  // Si ya está en formato YYYY-MM-DD, devolverlo tal cual
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  try {
    const dateObj = new Date(date);
    
    // Verificar que la fecha es válida
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    // Formatear a YYYY-MM-DD
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date for input:', error, date);
    return '';
  }
};

/**
 * Calcula la diferencia en días entre dos fechas (inclusive)
 * Si solo hay fecha inicio, devuelve 1
 * Maneja fechas en formato YYYY-MM-DD sin problemas de zona horaria
 */
export const calculateDaysBetween = (startDate, endDate) => {
  if (!startDate) return 0;
  
  // Si no hay fecha fin, es 1 día
  if (!endDate) return 1;
  
  try {
    let start, end;
    
    // Si las fechas vienen en formato YYYY-MM-DD, parsearlas directamente
    if (typeof startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      const [year, month, day] = startDate.split('-').map(Number);
      start = new Date(Date.UTC(year, month - 1, day));
    } else {
      start = new Date(startDate);
      // Normalizar a medianoche UTC para evitar problemas de zona horaria
      start = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    }
    
    if (typeof endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      const [year, month, day] = endDate.split('-').map(Number);
      end = new Date(Date.UTC(year, month - 1, day));
    } else {
      end = new Date(endDate);
      // Normalizar a medianoche UTC para evitar problemas de zona horaria
      end = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
    }
    
    // Verificar que las fechas son válidas
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 1;
    }
    
    // Calcular diferencia en milisegundos
    const diffTime = end - start;
    
    // Convertir a días y sumar 1 (inclusive)
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    // Asegurar que sea al menos 1 día
    return Math.max(1, diffDays);
  } catch (error) {
    console.error('Error calculating days between dates:', error);
    return 1;
  }
};

