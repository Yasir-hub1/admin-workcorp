import { motion } from 'framer-motion';
import { cn } from '../../utils/helpers';

const variants = {
  primary: 'bg-indigo-100 text-indigo-800',
  secondary: 'bg-gray-100 text-gray-800',
  success: 'bg-green-100 text-green-800',
  danger: 'bg-red-100 text-red-800',
  warning: 'bg-yellow-100 text-yellow-800',
  info: 'bg-blue-100 text-blue-800',
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-sm',
  lg: 'px-3 py-1 text-base',
};

export default function Badge({
  children,
  variant = 'secondary',
  size = 'sm',
  className,
  dot,
  ...props
}) {
  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 500 }}
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && (
        <motion.span
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={cn('w-1.5 h-1.5 rounded-full mr-1.5', 
            variant === 'primary' && 'bg-indigo-600',
            variant === 'secondary' && 'bg-gray-600',
            variant === 'success' && 'bg-green-600',
            variant === 'danger' && 'bg-red-600',
            variant === 'warning' && 'bg-yellow-600',
            variant === 'info' && 'bg-blue-600',
          )}
        />
      )}
      {children}
    </motion.span>
  );
}

