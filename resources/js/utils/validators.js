/**
 * Validadores de formularios
 */

export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const validateRUC = (ruc) => {
  return /^\d{11}$/.test(ruc);
};

export const validateCI = (ci) => {
  // CI boliviano: puede tener guiones o no, generalmente 6-8 dígitos
  return /^\d{6,8}$/.test(ci.replace(/-/g, ''));
};

export const validateNIT = (nit) => {
  // NIT boliviano: puede tener guiones o no, generalmente 6-11 dígitos
  return /^\d{6,11}$/.test(nit.replace(/-/g, ''));
};

export const validatePhone = (phone) => {
  return /^\d{9}$/.test(phone.replace(/\s/g, ''));
};

export const validateURL = (url) => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

export const required = (value) => {
  if (value === null || value === undefined || value === '') {
    return 'Este campo es requerido';
  }
  return true;
};

export const minLength = (min) => (value) => {
  if (value && value.length < min) {
    return `Mínimo ${min} caracteres`;
  }
  return true;
};

export const maxLength = (max) => (value) => {
  if (value && value.length > max) {
    return `Máximo ${max} caracteres`;
  }
  return true;
};

export const minValue = (min) => (value) => {
  if (value && Number(value) < min) {
    return `El valor mínimo es ${min}`;
  }
  return true;
};

export const maxValue = (max) => (value) => {
  if (value && Number(value) > max) {
    return `El valor máximo es ${max}`;
  }
  return true;
};

