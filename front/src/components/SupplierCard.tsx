import React from 'react';

export interface SupplierCardProps {
  companyName: string;
  contactPerson?: string;
  phoneNumber?: string;
  email?: string;
  triggers?: string[];
}

export const SupplierCard: React.FC<SupplierCardProps> = ({
  companyName,
  contactPerson,
  phoneNumber,
  email,
  triggers = [],
}) => {
  const phone = (phoneNumber ?? '').trim();
  const mail = (email ?? '').trim();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-gray-900 truncate">{companyName}</h3>
          {contactPerson && contactPerson.trim() && (
            <p className="text-sm text-gray-600 mt-1">👤 {contactPerson}</p>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex gap-2">
          <span className="text-gray-500 shrink-0">📱</span>
          {phone ? (
            <a className="text-blue-600 font-semibold hover:underline" href={`tel:${phone.replace(/\s/g, '')}`}>
              {phone}
            </a>
          ) : (
            <span className="text-gray-400">телефон не указан</span>
          )}
        </div>
        <div className="flex gap-2">
          <span className="text-gray-500 shrink-0">✉️</span>
          {mail ? (
            <a className="text-blue-600 hover:underline truncate" href={`mailto:${mail}`}>
              {mail}
            </a>
          ) : (
            <span className="text-gray-400">email не указан</span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Триггеры</p>
        <div className="flex flex-wrap gap-2">
          {triggers.length > 0 ? (
            triggers.map((t) => (
              <span key={t} className="px-3 py-1 bg-purple-50 text-purple-700 text-xs rounded-lg font-semibold">
                {t}
              </span>
            ))
          ) : (
            <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-lg font-semibold">нет триггеров</span>
          )}
        </div>
      </div>
    </div>
  );
};
