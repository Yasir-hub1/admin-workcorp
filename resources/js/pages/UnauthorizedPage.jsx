import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../components/common/Button';
import { ArrowLeftIcon, HomeIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="max-w-lg w-full"
      >
        <div className="bg-white shadow-xl rounded-2xl p-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center">
              <ShieldExclamationIcon className="h-7 w-7 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Acceso restringido</h1>
              <p className="text-sm text-gray-500">No tienes permisos para ver o ejecutar esta acción.</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link to="/dashboard">
              <Button icon={HomeIcon} fullWidth>
                Ir al Dashboard
              </Button>
            </Link>
            <Button
              variant="outline"
              icon={ArrowLeftIcon}
              fullWidth
              onClick={() => window.history.back()}
            >
              Volver
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


