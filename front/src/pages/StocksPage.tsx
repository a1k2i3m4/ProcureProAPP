import { useState, useEffect, useRef } from "react";
import {
    Package, Search, Upload, Plus, Trash2, Download,
    AlertTriangle, ChevronUp, ChevronDown, X, Save, Loader
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
    out:      { label: 'Нет',       bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500' },
    critical: { label: 'Критично',  bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
    low:      { label: 'Мало',      bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
    ok:       { label: 'В норме',   bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' },
    unknown:  { label: '—',         bg: 'bg-gray-100',   text: 'text-gray-500',   dot: 'bg-gray-400' },
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
        const matchSearch = !q || item.name.toLowerCase().includes(q) || item.gs_code.includes(q) || item.group_name.toLowerCase().includes(q);
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
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
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
            setUploadMsg('❌ Ошибка импорта');
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const handleExport = async () => {
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Package className="w-7 h-7 text-purple-600" />
                        Остатки товаров
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Контроль МЗП РЦ и текущих остатков</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleUpload} />
                    <button onClick={() => fileRef.current?.click()} disabled={uploading}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50">
                        {uploading ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        Импорт Excel
                    </button>
                    <button onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                        <Download className="w-4 h-4" /> Экспорт CSV
                    </button>
                    <button onClick={() => setAddOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">
                        <Plus className="w-4 h-4" /> Добавить позицию
                    </button>
                </div>
            </div>

            {uploadMsg && (
                <div className={`px-4 py-2 rounded-lg text-sm font-medium ${uploadMsg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {uploadMsg}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Всего позиций', value: stats.total, color: 'text-gray-900', bg: 'bg-white' },
                    { label: 'Нет в наличии', value: stats.out, color: 'text-red-600', bg: 'bg-red-50' },
                    { label: 'Критический', value: stats.critical, color: 'text-orange-600', bg: 'bg-orange-50' },
                    { label: 'Мало осталось', value: stats.low, color: 'text-yellow-600', bg: 'bg-yellow-50' },
                ].map(s => (
                    <div key={s.label} className={`${s.bg} rounded-xl border border-gray-100 p-4`}>
                        <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="Поиск по названию, коду..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                    <option value="">Все группы</option>
                    {groups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                    <option value="">Все статусы</option>
                    <option value="out">Нет в наличии</option>
                    <option value="critical">Критический</option>
                    <option value="low">Мало</option>
                    <option value="ok">В норме</option>
                </select>
                {(search || groupFilter || statusFilter) && (
                    <button onClick={() => { setSearch(''); setGroupFilter(''); setStatusFilter(''); }}
                        className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-red-500 border border-gray-200 rounded-lg">
                        <X className="w-4 h-4" /> Сбросить
                    </button>
                )}
                <span className="self-center text-sm text-gray-400 ml-auto">
                    Показано: <b className="text-gray-700">{filtered.length}</b> из {items.length}
                </span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-16 flex flex-col items-center text-gray-400">
                        <Loader className="w-8 h-8 animate-spin mb-3 text-purple-500" />
                        Загрузка...
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-16 text-center text-gray-400">
                        <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>Нет данных</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-gray-500 font-medium w-8">№</th>
                                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Код GS</th>
                                    <th className="px-4 py-3 text-left text-gray-500 font-medium cursor-pointer hover:text-gray-700 select-none"
                                        onClick={() => toggleSort('group_name')}>
                                        <div className="flex items-center gap-1">Группа <SortIcon field="group_name" /></div>
                                    </th>
                                    <th className="px-4 py-3 text-left text-gray-500 font-medium cursor-pointer hover:text-gray-700 select-none"
                                        onClick={() => toggleSort('name')}>
                                        <div className="flex items-center gap-1">Наименование <SortIcon field="name" /></div>
                                    </th>
                                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Договор</th>
                                    <th className="px-4 py-3 text-right text-gray-500 font-medium cursor-pointer hover:text-gray-700 select-none"
                                        onClick={() => toggleSort('min_stock')}>
                                        <div className="flex items-center justify-end gap-1">МЗП РЦ <SortIcon field="min_stock" /></div>
                                    </th>
                                    <th className="px-4 py-3 text-right text-gray-500 font-medium cursor-pointer hover:text-gray-700 select-none"
                                        onClick={() => toggleSort('stock_qty')}>
                                        <div className="flex items-center justify-end gap-1">Остаток <SortIcon field="stock_qty" /></div>
                                    </th>
                                    <th className="px-4 py-3 text-center text-gray-500 font-medium">Статус</th>
                                    <th className="px-4 py-3 w-24"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtered.map((item, idx) => {
                                    const st = stockStatus(item);
                                    const cfg = STATUS_CONFIG[st];
                                    const isEditing = editingId === item.id;

                                    return (
                                        <tr key={item.id}
                                            className={`hover:bg-gray-50 transition-colors ${st === 'out' ? 'bg-red-50/30' : st === 'critical' ? 'bg-orange-50/20' : ''}`}>
                                            <td className="px-4 py-2.5 text-gray-400 text-xs">{idx + 1}</td>
                                            <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{item.gs_code || '—'}</td>
                                            <td className="px-4 py-2.5">
                                                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-medium">
                                                    {item.group_name}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 font-medium text-gray-900 max-w-xs">
                                                <div className="flex items-center gap-1.5">
                                                    {(st === 'out' || st === 'critical') && (
                                                        <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 ${st === 'out' ? 'text-red-500' : 'text-orange-500'}`} />
                                                    )}
                                                    <span className="truncate" title={item.name}>{item.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-gray-500 text-xs">{item.contract_company || '—'}</td>

                                            {/* МЗП РЦ — editable */}
                                            <td className="px-4 py-2.5 text-right">
                                                {isEditing ? (
                                                    <input type="number" min={0}
                                                        value={editValues.min_stock ?? ''}
                                                        onChange={e => setEditValues(v => ({ ...v, min_stock: Number(e.target.value) }))}
                                                        className="w-24 border border-purple-300 rounded px-2 py-0.5 text-right text-sm focus:outline-none focus:ring-1 focus:ring-purple-400" />
                                                ) : (
                                                    <span className="text-gray-700">{item.min_stock?.toLocaleString('ru') ?? '—'}</span>
                                                )}
                                            </td>

                                            {/* Остаток — editable */}
                                            <td className="px-4 py-2.5 text-right">
                                                {isEditing ? (
                                                    <input type="number" min={0}
                                                        value={editValues.stock_qty ?? ''}
                                                        onChange={e => setEditValues(v => ({ ...v, stock_qty: Number(e.target.value) }))}
                                                        className="w-24 border border-purple-300 rounded px-2 py-0.5 text-right text-sm focus:outline-none focus:ring-1 focus:ring-purple-400" />
                                                ) : (
                                                    <span className={`font-semibold ${st === 'out' ? 'text-red-600' : st === 'critical' ? 'text-orange-600' : st === 'low' ? 'text-yellow-600' : 'text-gray-900'}`}>
                                                        {item.stock_qty?.toLocaleString('ru') ?? '—'}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Статус */}
                                            <td className="px-4 py-2.5 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
                                                    {cfg.label}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center justify-end gap-1">
                                                    {isEditing ? (
                                                        <>
                                                            <button onClick={() => saveEdit(item)} disabled={saving}
                                                                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors" title="Сохранить">
                                                                {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                            </button>
                                                            <button onClick={cancelEdit}
                                                                className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors" title="Отмена">
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => startEdit(item)}
                                                                className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors text-xs font-medium"
                                                                title="Редактировать остаток">
                                                                ✏️
                                                            </button>
                                                            <button onClick={() => deleteItem(item.id)}
                                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Удалить">
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
            </div>

            {/* Add Modal */}
            {addOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Новая позиция</h3>
                            <button onClick={() => setAddOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { key: 'gs_code', label: 'Код GS', placeholder: '2210000003279' },
                                { key: 'contract_company', label: 'Договор с компанией', placeholder: 'Леверанс' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                                    <input type="text" placeholder={f.placeholder}
                                        value={(addForm as Record<string, string>)[f.key]}
                                        onChange={e => setAddForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                                </div>
                            ))}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Группа</label>
                                <input list="groups-list" type="text" placeholder="Расходники хоз."
                                    value={addForm.group_name}
                                    onChange={e => setAddForm(prev => ({ ...prev, group_name: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                                <datalist id="groups-list">{groups.map(g => <option key={g} value={g} />)}</datalist>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Наименование <span className="text-red-500">*</span></label>
                                <input type="text" placeholder="Название товара"
                                    value={addForm.name}
                                    onChange={e => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">МЗП РЦ</label>
                                <input type="number" min={0} placeholder="78"
                                    value={addForm.min_stock}
                                    onChange={e => setAddForm(prev => ({ ...prev, min_stock: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Остаток</label>
                                <input type="number" min={0} placeholder="0"
                                    value={addForm.stock_qty}
                                    onChange={e => setAddForm(prev => ({ ...prev, stock_qty: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                            </div>
                        </div>
                        {addError && <p className="text-red-600 text-sm">{addError}</p>}
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setAddOpen(false)}
                                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                                Отмена
                            </button>
                            <button onClick={handleAdd} disabled={adding}
                                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                                {adding ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {adding ? 'Сохранение...' : 'Добавить'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

