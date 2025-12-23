import { motion } from 'framer-motion';
import { cn } from '../../utils/helpers';

export default function Table({ columns, data, onRowClick, loading, emptyMessage = 'No hay datos disponibles' }) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="rounded-full h-8 w-8 border-4 border-indigo-100 border-t-indigo-600"
        />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12"
      >
        <p className="text-gray-500">{emptyMessage}</p>
      </motion.div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column, index) => (
              <motion.th
                key={column.key || index}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                scope="col"
                className={cn(
                  'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                  column.headerClassName
                )}
              >
                {column.header}
              </motion.th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, rowIndex) => (
            <motion.tr
              key={row.id || rowIndex}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: rowIndex * 0.03 }}
              whileHover={onRowClick ? { scale: 1.01, backgroundColor: '#f9fafb' } : {}}
              onClick={() => onRowClick?.(row)}
              className={cn(
                onRowClick && 'cursor-pointer transition-all duration-200'
              )}
            >
              {columns.map((column, colIndex) => (
                <td
                  key={column.key || colIndex}
                  className={cn(
                    'px-6 py-4 whitespace-nowrap text-sm',
                    column.cellClassName
                  )}
                >
                  {column.render
                    ? column.render(row[column.key], row, rowIndex)
                    : row[column.key]}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TableActions({ children }) {
  return (
    <div className="flex items-center gap-2">
      {children}
    </div>
  );
}

