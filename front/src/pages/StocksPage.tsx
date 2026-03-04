import { useState, useEffect, useRef, useCallback } from "react";
import {
    Package, Search, Upload, Plus, Trash2, Download,
    AlertTriangle, ChevronUp, ChevronDown, X, Save, Loader,
    Edit3, FileSpreadsheet, BarChart3, AlertCircle, CheckCircle2, XCircle
} from "lucide-react";
import { publicApi } from "../api/apiBase";

// ─── Types ────────────────────────────────────────────────────────────────────
interface StockItem {
    id: number;
    gs_code: string;
    group_name: string;
    name: string;
    contract_company: string;
    min_stock: number | null;
    stock_qty: number | null;
    updated_at: string;
}

type SortField = 'group_name' | 'name' | 'stock_qty' | 'min_stock';
type SortDir = 'asc' | 'desc';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const stockStatus = (item: StockItem) => {
    if (item.stock_qty === null) return 'unknown';
    if (item.stock_qty === 0) return 'out';
    if (item.min_stock && item.stock_qty < item.min_stock * 0.3) return 'critical';
    if (item.min_stock && item.stock_qty < item.min_stock) return 'low';
    return 'ok';
};

const STATUS_CONFIG = {
    out:      { label: 'Нет в наличии', shortLabel: 'Нет',  bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500',    ring: 'ring-red-500/20' },
    critical: { label: 'Критично',      shortLabel: 'Крит.', bg: 'bg-orange-50',  text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500', ring: 'ring-orange-500/20' },
    low:      { label: 'Мало',          shortLabel: 'Мало',  bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-500',  ring: 'ring-amber-500/20' },
    ok:       { label: 'В норме',       shortLabel: 'Норма', bg: 'bg-emerald-50', text: 'text-emerald-700',border: 'border-emerald-200',dot: 'bg-emerald-500',ring: 'ring-emerald-500/20' },
    unknown:  { label: 'Нет данных',    shortLabel: '—',     bg: 'bg-gray-50',    text: 'text-gray-500',   border: 'border-gray-200',   dot: 'bg-gray-400',   ring: 'ring-gray-500/20' },
};

const stockPercent = (item: StockItem) => {
    if (!item.min_stock || item.min_stock === 0 || item.stock_qty === null) return null;
    return Math.min(Math.round((item.stock_qty / item.min_stock) * 100), 200);
};

const percentColor = (pct: number) => {
    if (pct === 0) return 'bg-red-500';
    if (pct < 30) return 'bg-orange-500';
    if (pct < 100) return 'bg-amber-400';
    return 'bg-emerald-500';
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function StocksPage() {
    const [items, setItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [groupFilter, setGroupFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [sortField, setSortField] = useState<SortField>('group_name');
    const [sortDir, setSortDir] = useState<SortDir>('asc');

    // Edit inline
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValues, setEditValues] = useState<Partial<StockItem>>({});
    const [saving, setSaving] = useState(false);

    // Add modal
    const [addOpen, setAddOpen] = useState(false);
    const [addForm, setAddForm] = useState({ gs_code: '', group_name: '', name: '', contract_company: '', min_stock: '', stock_qty: '' });
    const [addError, setAddError] = useState('');
    const [adding, setAdding] = useState(false);

    // Upload
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadMsg, setUploadMsg] = useState('');
    const [dragOver, setDragOver] = useState(false);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const res = await publicApi.get<StockItem[]>('/stocks');
            setItems(res.data);
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchItems(); }, []);

    // ── Filtering & Sorting ────────────────────────────────────────────────
    const groups = [...new Set(items.map(i => i.group_name).filter(Boolean))].sort();

    const filtered = items.filter(item => {
        const q = search.toLowerCase();
        const matchSearch = !q || item.name?.toLowerCase().includes(q) || item.gs_code?.includes(q) || item.group_name?.toLowerCase().includes(q);
        const matchGroup = !groupFilter || item.group_name === groupFilter;
        const matchStatus = !statusFilter || stockStatus(item) === statusFilter;
        return matchSearch && matchGroup && matchStatus;
    }).sort((a, b) => {
        let av: string | number = a[sortField] ?? '';
        let bv: string | number = b[sortField] ?? '';
        if (typeof av === 'string') av = av.toLowerCase();
        if (typeof bv === 'string') bv = bv.toLowerCase();
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });

    const toggleSort = (field: SortField) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
    };

    // ── Stats ──────────────────────────────────────────────────────────────
    const stats = {
        total: items.length,
        ok: items.filter(i => stockStatus(i) === 'ok').length,
        out: items.filter(i => stockStatus(i) === 'out').length,
        critical: items.filter(i => stockStatus(i) === 'critical').length,
        low: items.filter(i => stockStatus(i) === 'low').length,
    };

    // ── Inline Edit ────────────────────────────────────────────────────────
    const startEdit = (item: StockItem) => {
        setEditingId(item.id);
        setEditValues({ stock_qty: item.stock_qty, min_stock: item.min_stock });
    };
    const cancelEdit = () => { setEditingId(null); setEditValues({}); };
    const saveEdit = async (item: StockItem) => {
        setSaving(true);
        try {
            await publicApi.put(`/stocks/${item.id}`, {
                stock_qty: editValues.stock_qty !== undefined ? Number(editValues.stock_qty) : item.stock_qty,
                min_stock: editValues.min_stock !== undefined ? Number(editValues.min_stock) : item.min_stock,
            });
            await fetchItems();
            setEditingId(null);
        } catch {
            alert('Ошибка сохранения');
        } finally {
            setSaving(false);
        }
    };

    const deleteItem = async (id: number) => {
        if (!confirm('Удалить позицию?')) return;
        try {
            await publicApi.delete(`/stocks/${id}`);
            setItems(prev => prev.filter(i => i.id !== id));
        } catch { alert('Ошибка удаления'); }
    };

    // ── Add ────────────────────────────────────────────────────────────────
    const handleAdd = async () => {
        setAddError('');
        if (!addForm.name.trim()) { setAddError('Укажите наименование'); return; }
        setAdding(true);
        try {
            await publicApi.post('/stocks', {
                gs_code: addForm.gs_code,
                group_name: addForm.group_name,
                name: addForm.name,
                contract_company: addForm.contract_company,
                min_stock: addForm.min_stock ? Number(addForm.min_stock) : null,
                stock_qty: addForm.stock_qty ? Number(addForm.stock_qty) : null,
            });
            setAddOpen(false);
            setAddForm({ gs_code: '', group_name: '', name: '', contract_company: '', min_stock: '', stock_qty: '' });
            await fetchItems();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            setAddError(err?.response?.data?.message || 'Ошибка');
        } finally {
            setAdding(false);
        }
    };

    // ── Upload Excel ───────────────────────────────────────────────────────
    const doUpload = useCallback(async (file: File) => {
        setUploading(true);
        setUploadMsg('');
        const fd = new FormData();
        fd.append('file', file);
        try {
            const res = await publicApi.post<{ imported: number }>('/stocks/import', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUploadMsg(`✅ Импортировано ${res.data.imported} позиций`);
            await fetchItems();
        } catch {
            setUploadMsg('❌ Ошибка импорта файла');
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    }, []);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) doUpload(file);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file && /\.(xlsx|xls|csv)$/i.test(file.name)) {
            doUpload(file);
        } else {
            setUploadMsg('❌ Поддерживаются только .xlsx, .xls, .csv файлы');
        }
    }, [doUpload]);

    const handleExport = () => {
        const csvRows = [
            ['№','Код GS','Группа','Наименование','Договор','МЗП РЦ','Остаток'].join(';'),
            ...filtered.map((item, i) =>
                [i+1, item.gs_code, item.group_name, item.name, item.contract_company, item.min_stock ?? '', item.stock_qty ?? ''].join(';')
            )
        ];
        const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'stocks.csv'; a.click();
    };

    // ── Sort icon helper ───────────────────────────────────────────────────
    const SortIcon = ({ field }: { field: SortField }) => (
        sortField === field
            ? sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
            : <ChevronUp className="w-3.5 h-3.5 opacity-20" />
    );

    const problemsCount = stats.out + stats.critical + stats.low;

    return (
        <div className="space-y-6 px-6 sm:px-10 lg:px-14 xl:px-16 pt-8 pb-12 max-w-[1600px] mx-auto">
            {/* ─── Header ──────────────────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-6 sm:p-8 text-white">
                <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl">
                                <Package className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                                Остатки товаров
                            </h1>
                        </div>
                        <p className="text-purple-200 text-sm sm:text-base max-w-md">
                            Контроль минимальных запасов и текущих остатков по всем магазинам
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleUpload} />
                        <button onClick={() => fileRef.current?.click()} disabled={uploading}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50 border border-white/20">
                            {uploading ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            Импорт Excel
                        </button>
                        <button onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white rounded-xl text-sm font-medium transition-all border border-white/20">
                            <Download className="w-4 h-4" /> Экспорт
                        </button>
                        <button onClick={() => setAddOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-purple-50 text-purple-700 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-purple-900/20">
                            <Plus className="w-4 h-4" /> Добавить
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── Upload feedback / drag zone ─────────────────────────────── */}
            {uploadMsg && (
                <div className={`px-5 py-3 rounded-xl text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-2 ${
                    uploadMsg.startsWith('✅')
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                    {uploadMsg.startsWith('✅') ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {uploadMsg}
                    <button onClick={() => setUploadMsg('')} className="ml-auto p-0.5 hover:bg-black/5 rounded">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Drag & Drop zone */}
            <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-4 text-center transition-all duration-200 cursor-pointer ${
                    dragOver
                        ? 'border-purple-400 bg-purple-50 scale-[1.01]'
                        : 'border-gray-200 bg-gray-50/50 hover:border-purple-300 hover:bg-purple-50/50'
                }`}
                onClick={() => fileRef.current?.click()}
            >
                <div className="flex items-center justify-center gap-3 text-sm">
                    <FileSpreadsheet className={`w-5 h-5 ${dragOver ? 'text-purple-500' : 'text-gray-400'}`} />
                    <span className={dragOver ? 'text-purple-600 font-medium' : 'text-gray-500'}>
                        {uploading ? 'Загрузка...' : dragOver ? 'Отпустите файл для импорта' : 'Перетащите Excel-файл сюда или нажмите для выбора'}
                    </span>
                </div>
            </div>

            {/* ─── Stats Cards ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
                {[
                    { label: 'Всего позиций', value: stats.total,    icon: BarChart3,     gradient: 'from-slate-500 to-slate-600',    iconBg: 'bg-slate-100',    iconColor: 'text-slate-600' },
                    { label: 'В норме',       value: stats.ok,       icon: CheckCircle2,  gradient: 'from-emerald-500 to-emerald-600',iconBg: 'bg-emerald-100',  iconColor: 'text-emerald-600' },
                    { label: 'Мало',          value: stats.low,      icon: AlertCircle,   gradient: 'from-amber-500 to-amber-600',   iconBg: 'bg-amber-100',    iconColor: 'text-amber-600' },
                    { label: 'Критично',      value: stats.critical, icon: AlertTriangle, gradient: 'from-orange-500 to-orange-600', iconBg: 'bg-orange-100',   iconColor: 'text-orange-600' },
                    { label: 'Нет в наличии', value: stats.out,      icon: XCircle,       gradient: 'from-red-500 to-red-600',       iconBg: 'bg-red-100',      iconColor: 'text-red-600' },
                ].map(s => (
                    <button
                        key={s.label}
                        onClick={() => setStatusFilter(
                            s.label === 'Всего позиций' ? '' :
                            s.label === 'В норме' ? 'ok' :
                            s.label === 'Мало' ? 'low' :
                            s.label === 'Критично' ? 'critical' : 'out'
                        )}
                        className={`group relative overflow-hidden bg-white rounded-xl border p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${
                            (statusFilter === '' && s.label === 'Всего позиций') ||
                            (statusFilter === 'ok' && s.label === 'В норме') ||
                            (statusFilter === 'low' && s.label === 'Мало') ||
                            (statusFilter === 'critical' && s.label === 'Критично') ||
                            (statusFilter === 'out' && s.label === 'Нет в наличии')
                                ? 'border-purple-300 shadow-md ring-2 ring-purple-100' : 'border-gray-100'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className={`p-2 rounded-lg ${s.iconBg}`}>
                                <s.icon className={`w-4 h-4 ${s.iconColor}`} />
                            </div>
                            {s.value > 0 && s.label !== 'Всего позиций' && s.label !== 'В норме' && (
                                <span className={`text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full bg-gradient-to-r ${s.gradient}`}>
                                    !
                                </span>
                            )}
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{s.value.toLocaleString('ru')}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                    </button>
                ))}
            </div>

            {/* ─── Problems banner ─────────────────────────────────────────── */}
            {problemsCount > 0 && !statusFilter && (
                <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <div className="text-sm">
                        <span className="font-semibold text-amber-800">{problemsCount} позиций</span>
                        <span className="text-amber-700"> требуют внимания — </span>
                        <span className="text-amber-600">
                            {stats.out > 0 && `${stats.out} без остатка`}
                            {stats.out > 0 && stats.critical > 0 && ', '}
                            {stats.critical > 0 && `${stats.critical} критичных`}
                            {(stats.out > 0 || stats.critical > 0) && stats.low > 0 && ', '}
                            {stats.low > 0 && `${stats.low} мало`}
                        </span>
                    </div>
                </div>
            )}

            {/* ─── Filters ─────────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-3 shadow-sm">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="Поиск по названию, коду, группе..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all" />
                </div>
                <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all min-w-[160px]">
                    <option value="">📦 Все группы</option>
                    {groups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all min-w-[160px]">
                    <option value="">🔍 Все статусы</option>
                    <option value="out">🔴 Нет в наличии</option>
                    <option value="critical">🟠 Критический</option>
                    <option value="low">🟡 Мало</option>
                    <option value="ok">🟢 В норме</option>
                </select>
                {(search || groupFilter || statusFilter) && (
                    <button onClick={() => { setSearch(''); setGroupFilter(''); setStatusFilter(''); }}
                        className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 border border-red-200 rounded-xl transition-all">
                        <X className="w-4 h-4" /> Сбросить
                    </button>
                )}
                <span className="self-center text-sm text-gray-400 ml-auto whitespace-nowrap">
                    Показано <b className="text-gray-700">{filtered.length}</b> из {items.length}
                </span>
            </div>

            {/* ─── Table ───────────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-20 flex flex-col items-center text-gray-400">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full border-4 border-purple-100 border-t-purple-500 animate-spin" />
                        </div>
                        <p className="mt-4 text-sm font-medium">Загрузка данных...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-20 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-4">
                            <Package className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium">Нет данных</p>
                        <p className="text-gray-400 text-sm mt-1">Импортируйте Excel или добавьте позицию вручную</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gradient-to-r from-gray-50 to-gray-100/80 border-b border-gray-200">
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">№</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Код</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-purple-600 select-none transition-colors"
                                        onClick={() => toggleSort('group_name')}>
                                        <div className="flex items-center gap-1">Группа <SortIcon field="group_name" /></div>
                                    </th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-purple-600 select-none transition-colors"
                                        onClick={() => toggleSort('name')}>
                                        <div className="flex items-center gap-1">Наименование <SortIcon field="name" /></div>
                                    </th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Договор</th>
                                    <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-purple-600 select-none transition-colors"
                                        onClick={() => toggleSort('min_stock')}>
                                        <div className="flex items-center justify-end gap-1">МЗП <SortIcon field="min_stock" /></div>
                                    </th>
                                    <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-purple-600 select-none transition-colors"
                                        onClick={() => toggleSort('stock_qty')}>
                                        <div className="flex items-center justify-end gap-1">Остаток <SortIcon field="stock_qty" /></div>
                                    </th>
                                    <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-36">Заполн.</th>
                                    <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Статус</th>
                                    <th className="px-4 py-3.5 w-20"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map((item, idx) => {
                                    const st = stockStatus(item);
                                    const cfg = STATUS_CONFIG[st];
                                    const isEditing = editingId === item.id;
                                    const pct = stockPercent(item);

                                    return (
                                        <tr key={item.id}
                                            className={`group transition-all duration-150 ${
                                                isEditing ? 'bg-purple-50/50 ring-1 ring-inset ring-purple-200' :
                                                st === 'out' ? 'bg-red-50/40 hover:bg-red-50/70' :
                                                st === 'critical' ? 'bg-orange-50/30 hover:bg-orange-50/60' :
                                                'hover:bg-gray-50/80'
                                            }`}
                                        >
                                            <td className="px-4 py-3 text-gray-400 text-xs font-mono">{idx + 1}</td>
                                            <td className="px-4 py-3">
                                                <span className="text-gray-500 font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {item.gs_code ? item.gs_code.slice(-6) : '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium border border-purple-100">
                                                    {item.group_name || '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 max-w-xs">
                                                <div className="flex items-center gap-2">
                                                    {(st === 'out' || st === 'critical') && (
                                                        <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${st === 'out' ? 'text-red-500' : 'text-orange-500'}`} />
                                                    )}
                                                    <span className="font-medium text-gray-900 truncate" title={item.name}>{item.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 text-xs">{item.contract_company || '—'}</td>

                                            {/* МЗП */}
                                            <td className="px-4 py-3 text-right">
                                                {isEditing ? (
                                                    <input type="number" min={0}
                                                        value={editValues.min_stock ?? ''}
                                                        onChange={e => setEditValues(v => ({ ...v, min_stock: Number(e.target.value) }))}
                                                        className="w-20 border border-purple-300 rounded-lg px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white" />
                                                ) : (
                                                    <span className="text-gray-600 tabular-nums">{item.min_stock?.toLocaleString('ru') ?? '—'}</span>
                                                )}
                                            </td>

                                            {/* Остаток */}
                                            <td className="px-4 py-3 text-right">
                                                {isEditing ? (
                                                    <input type="number" min={0}
                                                        value={editValues.stock_qty ?? ''}
                                                        onChange={e => setEditValues(v => ({ ...v, stock_qty: Number(e.target.value) }))}
                                                        className="w-20 border border-purple-300 rounded-lg px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white" />
                                                ) : (
                                                    <span className={`font-bold tabular-nums ${
                                                        st === 'out' ? 'text-red-600' :
                                                        st === 'critical' ? 'text-orange-600' :
                                                        st === 'low' ? 'text-amber-600' : 'text-gray-900'
                                                    }`}>
                                                        {item.stock_qty?.toLocaleString('ru') ?? '—'}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Progress bar */}
                                            <td className="px-4 py-3">
                                                {pct !== null ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-500 ${percentColor(pct)}`}
                                                                style={{ width: `${Math.min(pct, 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className={`text-xs font-medium tabular-nums w-10 text-right ${
                                                            pct < 30 ? 'text-red-600' : pct < 100 ? 'text-amber-600' : 'text-emerald-600'
                                                        }`}>
                                                            {pct}%
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300 text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Статус */}
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                                    {cfg.shortLabel}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-3 py-3">
                                                <div className="flex items-center justify-end gap-0.5">
                                                    {isEditing ? (
                                                        <>
                                                            <button onClick={() => saveEdit(item)} disabled={saving}
                                                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Сохранить">
                                                                {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                            </button>
                                                            <button onClick={cancelEdit}
                                                                className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-all" title="Отмена">
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => startEdit(item)}
                                                                className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                                title="Редактировать">
                                                                <Edit3 className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => deleteItem(item.id)}
                                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                                title="Удалить">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Table footer */}
                {!loading && filtered.length > 0 && (
                    <div className="px-4 py-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                        <span>
                            Показано <b className="text-gray-700">{filtered.length}</b> из {items.length} позиций
                        </span>
                        <span>
                            Обновлено: {items[0]?.updated_at ? new Date(items[0].updated_at).toLocaleString('ru') : '—'}
                        </span>
                    </div>
                )}
            </div>

            {/* ─── Add Modal ───────────────────────────────────────────────── */}
            {addOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                     onClick={() => setAddOpen(false)}>
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

                    {/* Modal */}
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 fade-in duration-200"
                         onClick={e => e.stopPropagation()}>
                        {/* Modal header */}
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/15 rounded-lg">
                                        <Plus className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white">Новая позиция</h3>
                                </div>
                                <button onClick={() => setAddOpen(false)} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal body */}
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Наименование <span className="text-red-500">*</span>
                                </label>
                                <input type="text" placeholder="Введите название товара"
                                    value={addForm.name}
                                    onChange={e => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-gray-50 focus:bg-white transition-all"
                                    autoFocus />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Код GS</label>
                                    <input type="text" placeholder="2210000003279"
                                        value={addForm.gs_code}
                                        onChange={e => setAddForm(prev => ({ ...prev, gs_code: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50 focus:bg-white transition-all font-mono" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Группа</label>
                                    <input list="groups-list" type="text" placeholder="Расходники хоз."
                                        value={addForm.group_name}
                                        onChange={e => setAddForm(prev => ({ ...prev, group_name: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50 focus:bg-white transition-all" />
                                    <datalist id="groups-list">{groups.map(g => <option key={g} value={g} />)}</datalist>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Договор с компанией</label>
                                    <input type="text" placeholder="Леверанс"
                                        value={addForm.contract_company}
                                        onChange={e => setAddForm(prev => ({ ...prev, contract_company: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50 focus:bg-white transition-all" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1.5">МЗП РЦ</label>
                                    <input type="number" min={0} placeholder="78"
                                        value={addForm.min_stock}
                                        onChange={e => setAddForm(prev => ({ ...prev, min_stock: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50 focus:bg-white transition-all" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Текущий остаток</label>
                                <input type="number" min={0} placeholder="0"
                                    value={addForm.stock_qty}
                                    onChange={e => setAddForm(prev => ({ ...prev, stock_qty: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50 focus:bg-white transition-all" />
                            </div>

                            {addError && (
                                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    {addError}
                                </div>
                            )}
                        </div>

                        {/* Modal footer */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                            <button onClick={() => setAddOpen(false)}
                                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-100 transition-all">
                                Отмена
                            </button>
                            <button onClick={handleAdd} disabled={adding}
                                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-purple-200">
                                {adding ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {adding ? 'Сохранение...' : 'Добавить позицию'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

