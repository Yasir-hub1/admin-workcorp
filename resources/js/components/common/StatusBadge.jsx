import Badge from './Badge';
import { getStatusColor, getStatusLabel } from '../../utils/helpers';

export default function StatusBadge({ status, className }) {
  if (!status) return null;
  
  return (
    <Badge className={getStatusColor(status)}>
      {getStatusLabel(status)}
    </Badge>
  );
}

