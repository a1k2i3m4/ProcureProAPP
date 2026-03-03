import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Package, Send, CheckCircle, AlertCircle, Clock, Loader2 } from 'lucide-react';
import axios from 'axios';
import { getApiBaseUrl } from '../api/apiBase';

const API_URL = getApiBaseUrl();

type ApiErrorBody = { message?: string };
function getApiErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const maybe = data as ApiErrorBody;
  return typeof maybe.message === 'string' ? maybe.message : null;
}

interface OrderItem {
  tovar: string;
  qty: number;
  specific?: string;
}

interface ItemResponse {
  item_name: string;
  price: number;
  quantity: number;
  delivery_days: number;
}

interface AlternativeOffer {
  item_name: string;
  price: number;
  quantity: number;
  delivery_days: number;
}

interface FormData {
  order_id: string;
  fast: string;
  items: OrderItem[];
  items_count: number;
}

interface SupplierData {
  id: number;
  name: string;
}

interface AnalysisData {
  status: string;
  can_submit: boolean;
  message: string | null;
}

interface ExistingResponse {
  id: number;
  item_name: string;
  price: number;
  quantity_available: number;
  delivery_days: number;
}

const SupplierFormPage: React.FC = () => {
  const { orderId, supplierId } = useParams<{ orderId: string; supplierId: string }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [orderData, setOrderData] = useState<FormData | null>(null);
  const [supplierData, setSupplierData] = useState<SupplierData | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);

  const [contactName, setContactName] = useState('');

  const [itemResponses, setItemResponses] = useState<ItemResponse[]>([]);
  const [alternativeOffer, setAlternativeOffer] = useState<AlternativeOffer>({
    item_name: '',
    price: 0,
    quantity: 0,
    delivery_days: 0
  });
  const [showAlternative, setShowAlternative] = useState(false);

  const fetchFormData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_URL}/supplier-form/${orderId}/${supplierId}`);

      if (response.data.success) {
        setOrderData(response.data.order);
        setSupplierData(response.data.supplier);
        setAnalysisData(response.data.analysis);

        // Initialize item responses from order items
        if (response.data.order.items) {
          const initialResponses = response.data.order.items.map((item: OrderItem) => {
            // Check if there's an existing response for this item
            const existing = response.data.existing_responses?.find(
              (r: ExistingResponse) => r.item_name === item.tovar
            );

            return {
              item_name: item.tovar,
              price: existing?.price || 0,
              quantity: existing?.quantity_available || item.qty,
              delivery_days: existing?.delivery_days || 0
            };
          });
          setItemResponses(initialResponses);
        }

        // If already responded, show submitted state
        if (response.data.existing_responses?.length > 0) {
          setSubmitted(true);
        }
      } else {
        setError(response.data.message || 'Ошибка загрузки данных');
      }
    } catch (err: unknown) {
      console.error('Error fetching form data:', err);
      if (axios.isAxiosError(err)) {
        const msg = getApiErrorMessage(err.response?.data);
        setError(msg || 'Не удалось загрузить данные формы');
      } else {
        setError('Не удалось загрузить данные формы');
      }
    } finally {
      setLoading(false);
    }
  }, [orderId, supplierId]);

  useEffect(() => {
    fetchFormData();
  }, [fetchFormData]);

  const handleItemChange = (index: number, field: keyof ItemResponse, value: string | number) => {
    const updated = [...itemResponses];
    if (field === 'price' || field === 'quantity' || field === 'delivery_days') {
      updated[index][field] = Number(value) || 0;
    } else {
      updated[index][field] = value as string;
    }
    setItemResponses(updated);
  };

  const handleAlternativeChange = (field: keyof AlternativeOffer, value: string | number) => {
    setAlternativeOffer(prev => ({
      ...prev,
      [field]: field === 'item_name' ? value : (Number(value) || 0)
    }));
  };

  const validateForm = (): boolean => {
    if (!contactName.trim()) {
      setError('Пожалуйста, укажите ваше ФИО');
      return false;
    }

    const hasValidItem = itemResponses.some(
      item => item.price > 0 && item.quantity > 0
    );

    if (!hasValidItem && !showAlternative) {
      setError('Укажите цену и количество хотя бы для одного товара');
      return false;
    }

    if (showAlternative) {
      if (!alternativeOffer.item_name.trim()) {
        setError('Укажите название альтернативного товара');
        return false;
      }
      if (alternativeOffer.price <= 0 || alternativeOffer.quantity <= 0) {
        setError('Укажите корректную цену и количество для альтернативного предложения');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    try {
      setSubmitting(true);

      // Filter only items with valid data
      const validItems = itemResponses.filter(
        item => item.price > 0 && item.quantity > 0
      );

      const payload: {
        contact_name: string;
        items: ItemResponse[];
        alternative_offer?: AlternativeOffer;
      } = {
        contact_name: contactName,
        items: validItems
      };

      if (showAlternative && alternativeOffer.item_name && alternativeOffer.price > 0) {
        payload.alternative_offer = alternativeOffer;
      }

      const response = await axios.post(
        `${API_URL}/supplier-form/${orderId}/${supplierId}`,
        payload
      );

      if (response.data.success) {
        setSubmitted(true);
      } else {
        setError(response.data.message || 'Ошибка отправки формы');
      }
    } catch (err: unknown) {
      console.error('Error submitting form:', err);
      if (axios.isAxiosError(err)) {
        const msg = getApiErrorMessage(err.response?.data);
        setError(msg || 'Не удалось отправить форму');
      } else {
        setError('Не удалось отправить форму');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  // Error state (no data)
  if (!orderData || !supplierData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ошибка</h1>
          <p className="text-gray-600">{error || 'Данные не найдены'}</p>
        </div>
      </div>
    );
  }

  // Analysis completed state
  if (analysisData && !analysisData.can_submit && !submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Анализ завершён</h1>
          <p className="text-gray-600">{analysisData.message}</p>
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Заказ #{orderData.order_id}</p>
            <p className="text-sm text-gray-500">Поставщик: {supplierData.name}</p>
          </div>
        </div>
      </div>
    );
  }

  // Success state (submitted)
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Спасибо!</h1>
          <p className="text-gray-600 mb-6">Ваш ответ успешно принят и будет учтён при анализе заказа.</p>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Заказ #{orderData.order_id}</p>
            <p className="text-sm text-gray-500">Поставщик: {supplierData.name}</p>
          </div>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Форма ответа поставщика</h1>
              <p className="text-gray-500">Заполните информацию о ценах и наличии товаров</p>
            </div>
          </div>

          {orderData.fast === 'yes' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700 font-medium">СРОЧНЫЙ ЗАКАЗ</span>
            </div>
          )}
        </div>

        {/* Order Info */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Информация о заказе</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500">Номер заказа</label>
              <p className="font-medium text-gray-900">#{orderData.order_id}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Поставщик</label>
              <p className="font-medium text-gray-900">{supplierData.name}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Contact Name */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Контактная информация</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ФИО контактного лица *
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                placeholder="Введите ваше ФИО"
                required
              />
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Товары из заказа</h2>
            <p className="text-sm text-gray-500 mb-4">
              Укажите цену, доступное количество и срок доставки для каждого товара
            </p>

            <div className="space-y-6">
              {itemResponses.map((item, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900">{item.item_name}</h3>
                      <p className="text-sm text-gray-500">
                        Запрошено: {orderData.items[index]?.qty || '-'} шт.
                      </p>
                    </div>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                      #{index + 1}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Цена за ед. (₸)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price || ''}
                        onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Количество (шт.)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={item.quantity || ''}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Срок (дней)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={item.delivery_days || ''}
                        onChange={(e) => handleItemChange(index, 'delivery_days', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alternative Offer */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Альтернативное предложение</h2>
              <button
                type="button"
                onClick={() => setShowAlternative(!showAlternative)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showAlternative
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {showAlternative ? 'Скрыть' : 'Добавить'}
              </button>
            </div>

            {showAlternative && (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-700 mb-4">
                  Если у вас есть альтернативный товар, который может заменить запрашиваемые, укажите его здесь
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Название товара
                    </label>
                    <input
                      type="text"
                      value={alternativeOffer.item_name}
                      onChange={(e) => handleAlternativeChange('item_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Введите название товара"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Цена за ед. (₸)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={alternativeOffer.price || ''}
                        onChange={(e) => handleAlternativeChange('price', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Количество (шт.)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={alternativeOffer.quantity || ''}
                        onChange={(e) => handleAlternativeChange('quantity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Срок (дней)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={alternativeOffer.delivery_days || ''}
                        onChange={(e) => handleAlternativeChange('delivery_days', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Отправка...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Отправить ответ
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SupplierFormPage;

