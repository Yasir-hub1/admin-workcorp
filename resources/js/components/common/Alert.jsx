import { InformationCircleIcon, CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils/helpers';

const variants = {
  info: {
    container: 'bg-blue-50 border-blue-200',
    icon: 'text-blue-400',
    title: 'text-blue-800',
    text: 'text-blue-700',
    Icon: InformationCircleIcon,
  },
  success: {
    container: 'bg-green-50 border-green-200',
    icon: 'text-green-400',
    title: 'text-green-800',
    text: 'text-green-700',
    Icon: CheckCircleIcon,
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-200',
    icon: 'text-yellow-400',
    title: 'text-yellow-800',
    text: 'text-yellow-700',
    Icon: ExclamationTriangleIcon,
  },
  error: {
    container: 'bg-red-50 border-red-200',
    icon: 'text-red-400',
    title: 'text-red-800',
    text: 'text-red-700',
    Icon: XCircleIcon,
  },
};

export default function Alert({ variant = 'info', title, children, className }) {
  const config = variants[variant];
  const Icon = config.Icon;

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        config.container,
        className
      )}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={cn('h-5 w-5', config.icon)} />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={cn('text-sm font-medium mb-1', config.title)}>
              {title}
            </h3>
          )}
          <div className={cn('text-sm', config.text)}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

