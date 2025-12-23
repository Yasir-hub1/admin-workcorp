import { motion } from 'framer-motion';
import { cn } from '../../utils/helpers';

export default function Card({ children, className, title, actions, padding = true, ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
      className={cn(
        'bg-white rounded-lg shadow-md transition-shadow duration-300',
        className
      )}
      {...props}
    >
      {(title || actions) && (
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className={cn(padding && 'p-6')}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export function CardSection({ children, className, title, ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn('space-y-4', className)}
      {...props}
    >
      {title && (
        <motion.h4
          initial={{ x: -10, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="text-sm font-medium text-gray-700"
        >
          {title}
        </motion.h4>
      )}
      {children}
    </motion.div>
  );
}

