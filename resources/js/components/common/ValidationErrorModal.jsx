import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Modal from './Modal';
import Button from './Button';

export default function ValidationErrorModal({ open, onClose, errors, title = 'Errores de Validación' }) {
  if (!errors || Object.keys(errors).length === 0) {
    return null;
  }

  // Mapeo de campos a nombres legibles
  const fieldNames = {
    password: 'Contraseña',
    password_confirmation: 'Confirmar Contraseña',
    first_name: 'Nombre',
    last_name: 'Apellido',
    document_type: 'Tipo de Documento',
    document_number: 'Número de Documento',
    hire_date: 'Fecha de Ingreso',
    employee_number: 'Número de Empleado',
    code: 'Código',
    email: 'Email',
    name: 'Nombre',
  };

  // Mapeo de mensajes de error a mensajes legibles
  const errorMessages = {
    'validation.required': 'Este campo es obligatorio',
    'validation.min.string': 'Debe tener al menos :min caracteres',
    'validation.confirmed': 'Las contraseñas no coinciden',
    'validation.unique': 'Este valor ya está en uso',
    'validation.email': 'Debe ser un email válido',
    'validation.date': 'Debe ser una fecha válida',
    'validation.exists': 'El valor seleccionado no es válido',
  };

  const getFieldName = (field) => {
    return fieldNames[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatErrorMessage = (error) => {
    // Si el error ya es un mensaje legible, devolverlo
    if (typeof error === 'string' && !error.startsWith('validation.')) {
      return error;
    }

    // Buscar en el mapeo de mensajes
    for (const [key, message] of Object.entries(errorMessages)) {
      if (error.includes(key)) {
        return message;
      }
    }

    // Si es un mensaje de validación, intentar hacerlo más legible
    if (error.includes('validation.')) {
      return error.replace('validation.', '').replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    return error;
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <Button onClick={onClose}>
          Entendido
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-gray-700 mb-3">
              Por favor, corrige los siguientes errores antes de continuar:
            </p>
            <ul className="space-y-2">
              {Object.entries(errors).map(([field, fieldErrors]) => (
                <li key={field} className="text-sm">
                  <div className="font-medium text-gray-900 mb-1">
                    {getFieldName(field)}:
                  </div>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    {Array.isArray(fieldErrors) ? (
                      fieldErrors.map((error, index) => (
                        <li key={index} className="text-red-600">
                          {formatErrorMessage(error)}
                        </li>
                      ))
                    ) : (
                      <li className="text-red-600">
                        {formatErrorMessage(fieldErrors)}
                      </li>
                    )}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Modal>
  );
}

