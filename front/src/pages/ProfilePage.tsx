import React, { useMemo, useState } from 'react';
import { User, Mail, Shield, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { resolveAuthLoginUrl } from '../utils/authRedirect';

const APP_META: Record<string, { icon: string; name: string; desc: string }> = {
    managers: { icon: '👥', name: 'Менеджеры', desc: 'Магазины и сотрудники' },
    supervisors: { icon: '📋', name: 'Супервайзеры', desc: 'Проверки и аналитика' },
    heads: { icon: '👔', name: 'Руководители', desc: 'Управление отделами' },
    commercial: { icon: '💼', name: 'Коммерческий', desc: 'Коммерческий отдел' },
    floorplan: { icon: '🏬', name: 'FloorPlan', desc: 'Планы магазинов' },
    heatpoint: { icon: '🗺️', name: 'HeatPoint', desc: 'Аналитика локаций' },
    warehouse: { icon: '🏭', name: 'Склад', desc: 'Логистика РЦ' },
    procurepro: { icon: '🛒', name: 'ProcurePro', desc: 'Закупки и поставщики' },
};

const CURRENT_APP = 'procurepro';

export default function ProfilePage(): React.JSX.Element {
    const { user, logout } = useAuth();
    const isPreview = !!(user as any)?.preview;
    const [switchingApp, setSwitchingApp] = useState<string | null>(null);
    const [switchError, setSwitchError] = useState<string | null>(null);

    const userName = useMemo(() => {
        return String((user as any)?.name || user?.username || user?.email || 'Пользователь');
    }, [user]);

    const userEmail = useMemo(() => String(user?.email || '').trim(), [user]);
    const userRole = useMemo(() => String((user as any)?.role || 'user').trim(), [user]);
    const initials = useMemo(() => userName.slice(0, 2).toUpperCase(), [userName]);

    const handleLogout = async () => {
        await logout();
        window.location.href = resolveAuthLoginUrl();
    };

    const handleSwitchApp = async (targetApp: string) => {
        const token = localStorage.getItem('token');
        if (!token || switchingApp || targetApp === CURRENT_APP) return;

        setSwitchError(null);
        setSwitchingApp(targetApp);

        try {
            const resp = await fetch('/api/auth/preview-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                credentials: 'include',
                body: JSON.stringify({ targetApp }),
            });

            if (!resp.ok) {
                const data = await resp.json().catch(() => ({}));
                throw new Error(data?.message || 'Ошибка переключения');
            }

            const data = await resp.json();
            if (data?.redirectUrl) {
                window.location.href = data.redirectUrl;
                return;
            }

            throw new Error('Нет URL для перенаправления');
        } catch (error: any) {
            setSwitchError(error?.message || 'Ошибка');
            setSwitchingApp(null);
        }
    };

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-10 pt-2 sm:px-6">
            <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-xl font-semibold text-white shadow-lg shadow-violet-200">
                        {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-semibold text-gray-900">{userName}</h1>
                            {isPreview && (
                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">Preview</span>
                            )}
                        </div>
                        <p className="mt-1 text-sm text-gray-500">Профиль пользователя ProcurePro</p>
                    </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                        <div className="rounded-xl bg-white p-2 text-violet-600 shadow-sm">
                            <User size={18} />
                        </div>
                        <div>
                            <div className="text-xs uppercase tracking-wide text-gray-400">Пользователь</div>
                            <div className="text-sm font-medium text-gray-900">{userName}</div>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                        <div className="rounded-xl bg-white p-2 text-blue-600 shadow-sm">
                            <Mail size={18} />
                        </div>
                        <div>
                            <div className="text-xs uppercase tracking-wide text-gray-400">Email</div>
                            <div className="text-sm font-medium text-gray-900">{userEmail || 'Не указан'}</div>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 sm:col-span-2">
                        <div className="rounded-xl bg-white p-2 text-emerald-600 shadow-sm">
                            <Shield size={18} />
                        </div>
                        <div>
                            <div className="text-xs uppercase tracking-wide text-gray-400">Роль</div>
                            <div className="text-sm font-medium text-gray-900">{userRole || 'user'}</div>
                        </div>
                    </div>
                </div>
            </section>

            {isPreview && (
                <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
                    <div className="mb-1 flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-gray-900">Переключить приложение</h2>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">Preview</span>
                    </div>
                    <p className="mb-4 text-sm text-gray-500">Доступен полный список приложений превью, кроме Маркетинга.</p>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {Object.entries(APP_META).map(([key, meta]) => {
                            const isCurrent = key === CURRENT_APP;
                            const isLoading = switchingApp === key;

                            return (
                                <button
                                    key={key}
                                    disabled={isCurrent || !!switchingApp}
                                    onClick={() => handleSwitchApp(key)}
                                    className={
                                        'flex flex-col items-center gap-1 rounded-2xl border p-4 text-center transition-all ' +
                                        (isCurrent
                                            ? 'cursor-default border-violet-200 bg-violet-50 opacity-60'
                                            : 'border-gray-200 bg-white hover:border-violet-300 hover:shadow-md') +
                                        (switchingApp && !isLoading && !isCurrent ? ' opacity-40' : '')
                                    }
                                >
                                    <span className="text-2xl">{meta.icon}</span>
                                    <span className="text-sm font-medium text-gray-900">{meta.name}</span>
                                    <span className="text-xs text-gray-500">{meta.desc}</span>
                                    {isCurrent && <span className="text-[10px] font-medium text-violet-600">Текущее</span>}
                                    {isLoading && <span className="text-[10px] font-medium text-violet-600">Переключение...</span>}
                                </button>
                            );
                        })}
                    </div>

                    {switchError && (
                        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {switchError}
                        </div>
                    )}
                </section>
            )}

            <button
                type="button"
                onClick={handleLogout}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-red-200 bg-white px-6 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
                <LogOut size={16} className="mr-2" />
                Выйти
            </button>
        </div>
    );
}