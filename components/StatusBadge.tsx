import React from 'react';
import { STATUS_TRANSLATIONS } from '../constants';

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  // Normalize key to lower case to attempt finding translation
  const lowerStatus = status.toLowerCase();
  
  // Try exact match, then lowercase match
  const readableStatus = STATUS_TRANSLATIONS[status] || STATUS_TRANSLATIONS[lowerStatus] || status.replace(/_/g, ' ').toUpperCase();
  
  const normalizedStatus = status.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  let colorClass = 'bg-gray-800 text-gray-300 border-gray-600'; // Default

  // Logic to determine color based on normalized status keywords
  if (['livred', 'livre', 'livre_non_encaisse', 'paye_et_archive', 'payed', 'encaissed', 'encaisse', 'paiements_prets'].some(k => normalizedStatus.includes(k))) {
    colorClass = 'bg-emerald-900/50 text-emerald-400 border-emerald-600';
  } else if (normalizedStatus.includes('return') || normalizedStatus.includes('retour') || normalizedStatus.includes('annule')) {
    colorClass = 'bg-red-900/50 text-red-400 border-red-600';
  } else if (['dispatched_to_driver', 'attempt_delivery', 'en_livraison', 'vers_wilaya'].some(k => normalizedStatus.includes(k))) {
    colorClass = 'bg-amber-900/50 text-amber-400 border-amber-600';
  } else if (['picked', 'accepted_by_carrier', 'en_hub', 'vers_hub', 'en_ramassage'].some(k => normalizedStatus.includes(k))) {
    colorClass = 'bg-violet-900/50 text-violet-400 border-violet-600';
  } else if (normalizedStatus === 'suspendu') {
    colorClass = 'bg-slate-700 text-slate-300 border-slate-500';
  } else if (['order_information_received_by_carrier', 'created', 'prete_a_expedier', 'en_preparation'].some(k => normalizedStatus.includes(k))) {
     colorClass = 'bg-blue-900/50 text-blue-400 border-blue-600';
  }

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${colorClass} uppercase tracking-wider shadow-sm`}>
      {readableStatus}
    </span>
  );
};

export default StatusBadge;