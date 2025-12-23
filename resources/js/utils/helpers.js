/**
 * Funciones helper generales
 */

import clsx from 'clsx';

export { clsx };

export const cn = (...inputs) => {
  return clsx(inputs);
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const getStatusColor = (status) => {
  const colors = {
    // Estados de activos
    disponible: 'bg-green-100 text-green-800',
    en_uso: 'bg-blue-100 text-blue-800',
    en_mantenimiento: 'bg-yellow-100 text-yellow-800',
    en_reparacion: 'bg-orange-100 text-orange-800',
    dado_de_baja: 'bg-red-100 text-red-800',
    
    // Estados de gastos
    pendiente: 'bg-yellow-100 text-yellow-800',
    aprobado: 'bg-green-100 text-green-800',
    rechazado: 'bg-red-100 text-red-800',
    pagado: 'bg-blue-100 text-blue-800',
    
    // Estados de clientes
    activo: 'bg-green-100 text-green-800',
    inactivo: 'bg-gray-100 text-gray-800',
    prospecto: 'bg-blue-100 text-blue-800',
    perdido: 'bg-red-100 text-red-800',
    
    // Estados de servicios
    por_vencer: 'bg-orange-100 text-orange-800',
    vencido: 'bg-red-100 text-red-800',
    suspendido: 'bg-gray-100 text-gray-800',
    cancelado: 'bg-red-100 text-red-800',
    
    // Default
    default: 'bg-gray-100 text-gray-800',
  };
  
  return colors[status?.toLowerCase()] || colors.default;
};

export const getStatusLabel = (status) => {
  const labels = {
    disponible: 'Disponible',
    en_uso: 'En Uso',
    en_mantenimiento: 'En Mantenimiento',
    en_reparacion: 'En Reparación',
    dado_de_baja: 'Dado de Baja',
    pendiente: 'Pendiente',
    aprobado: 'Aprobado',
    rechazado: 'Rechazado',
    pagado: 'Pagado',
    activo: 'Activo',
    inactivo: 'Inactivo',
    prospecto: 'Prospecto',
    perdido: 'Perdido',
    por_vencer: 'Por Vencer',
    vencido: 'Vencido',
    suspendido: 'Suspendido',
    cancelado: 'Cancelado',
  };
  
  return labels[status?.toLowerCase()] || status;
};

export const downloadFile = (url, filename) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    return false;
  }
};

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

