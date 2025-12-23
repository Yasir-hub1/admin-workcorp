import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils/helpers';

export default function MultiSelect({
  name,
  label,
  options = [],
  value = [],
  onChange,
  placeholder = 'Seleccionar...',
  error,
  helperText,
  className,
  containerClassName,
  required,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValues, setSelectedValues] = useState(() => {
    if (Array.isArray(value)) return value;
    return [];
  });
  const dropdownRef = useRef(null);
  const prevValueRef = useRef(value);

  useEffect(() => {
    // Solo actualizar si el valor realmente cambió (comparación profunda)
    const currentValue = Array.isArray(value) ? value : [];
    const prevValue = Array.isArray(prevValueRef.current) ? prevValueRef.current : [];
    
    if (JSON.stringify(currentValue.sort()) !== JSON.stringify(prevValue.sort())) {
      setSelectedValues(currentValue);
      prevValueRef.current = value;
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleOption = (optionValue) => {
    const newValues = selectedValues.includes(optionValue)
      ? selectedValues.filter(v => v !== optionValue)
      : [...selectedValues, optionValue];
    
    setSelectedValues(newValues);
    
    if (onChange) {
      onChange(newValues);
    }

    // Actualizar el input hidden para el formulario
    const hiddenInput = document.querySelector(`input[name="${name}"][type="hidden"]`);
    if (hiddenInput) {
      hiddenInput.value = JSON.stringify(newValues);
    }
  };

  const removeOption = (optionValue, e) => {
    e.stopPropagation();
    const newValues = selectedValues.filter(v => v !== optionValue);
    setSelectedValues(newValues);
    
    if (onChange) {
      onChange(newValues);
    }

    const hiddenInput = document.querySelector(`input[name="${name}"][type="hidden"]`);
    if (hiddenInput) {
      hiddenInput.value = JSON.stringify(newValues);
    }
  };

  const selectedOptions = options.filter(opt => selectedValues.includes(opt.value));
  const hasError = !!error;

  return (
    <div className={cn('w-full', containerClassName)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative" ref={dropdownRef}>
        <input type="hidden" name={name} value={JSON.stringify(selectedValues)} />
        
        <div
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'block w-full rounded-md border shadow-sm transition-all duration-200 cursor-pointer',
            'focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-0',
            'min-h-[38px] px-3 py-2',
            hasError
              ? 'border-red-300 text-red-900 focus-within:ring-red-500 focus-within:border-red-500'
              : 'border-gray-300 focus-within:ring-indigo-500 focus-within:border-indigo-500',
            className
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1 flex-1 min-w-0">
              {selectedOptions.length === 0 ? (
                <span className="text-gray-500">{placeholder}</span>
              ) : (
                selectedOptions.map((option) => (
                  <span
                    key={option.value}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-xs"
                  >
                    {option.label}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeOption(option.value, e);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          removeOption(option.value, e);
                        }
                      }}
                      className="hover:bg-indigo-200 rounded-full p-0.5 cursor-pointer"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </span>
                  </span>
                ))
              )}
            </div>
            <ChevronDownIcon
              className={cn(
                'h-5 w-5 text-gray-400 transition-transform flex-shrink-0',
                isOpen && 'transform rotate-180'
              )}
            />
          </div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
            >
              {options.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">No hay opciones disponibles</div>
              ) : (
                options.map((option) => {
                  const isSelected = selectedValues.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleOption(option.value)}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors',
                        isSelected && 'bg-indigo-50 text-indigo-900'
                      )}
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          readOnly
                        />
                        <span className="ml-2">{option.label}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {helperText && !hasError && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}

      {hasError && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

