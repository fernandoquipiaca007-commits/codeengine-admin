import { useState, useMemo } from 'react';
import { Product, Category } from '../../types/admin';
import StripeSync from './StripeSync';

interface ProductTableProps {
  products: Product[];
  categories: Category[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onCustomize?: (product: Product) => void;
  onSyncComplete?: () => void;
  onChangeStatus?: (productId: string, newStatus: 'draft' | 'active' | 'archived') => void;
  loading?: boolean;
}

export default function ProductTable({
  products,
  categories,
  onEdit,
  onDelete,
  onCustomize,
  onSyncComplete,
  onChangeStatus,
  loading = false,
}: ProductTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Filter and search products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Status filter
      if (statusFilter !== 'all' && product.status !== statusFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && product.category_id !== categoryFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          product.title.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query) ||
          product.tags.some((tag) => tag.toLowerCase().includes(query))
        );
      }

      return true;
    });
  }, [products, searchQuery, statusFilter, categoryFilter]);

  // Get category name by ID
  const getCategoryName = (categoryId: string): string => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  // Format price
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  // Get status badge color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg
          className="animate-spin h-8 w-8 text-primary-600"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div>
      {/* Filters and Search */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Search */}
        <div className="sm:col-span-1">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            </div>
            <input
              type="text"
              id="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-xl border-gray-200 bg-gray-50/50 pl-12 py-2.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-sm font-medium transition-all"
              placeholder="Buscar produtos..."
            />
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full rounded-xl border-gray-200 bg-gray-50/50 py-2.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-sm font-bold transition-all"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Ativo</option>
            <option value="draft">Rascunho</option>
            <option value="archived">Arquivado</option>
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <select
            id="category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="block w-full rounded-xl border-gray-200 bg-gray-50/50 py-2.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-sm font-bold transition-all"
          >
            <option value="all">Todas as Categorias</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-6 flex items-center gap-2">
        <div className="h-1 w-1 rounded-full bg-gray-300" />
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Encontrados: <span className="text-gray-900">{filteredProducts.length}</span> / {products.length}
        </p>
      </div>

      {/* Table */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum produto encontrado</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
              ? 'Tente ajustar seus filtros'
              : 'Comece criando um novo produto'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4 md:hidden">
            {filteredProducts.map((product) => (
              <article key={product.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-4 mb-4">
                  <img
                    className="h-16 w-16 rounded-xl object-cover flex-shrink-0 shadow-inner"
                    src={product.cover_url}
                    alt={product.title}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tight ${getStatusColor(product.status)}`}>
                        {product.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-gray-900 truncate">{product.title}</h4>
                    <p className="text-xs text-gray-400 line-clamp-1">{product.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="rounded-xl bg-gray-50/80 p-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mb-1">Categoria</p>
                    <p className="text-xs font-black text-gray-700 truncate">{getCategoryName(product.category_id)}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50/80 p-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mb-1">Preço</p>
                    <p className="text-sm font-black text-primary-600">{formatPrice(product.price)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-50">
                  <div className="w-full mb-2">
                    <StripeSync product={product} onSyncComplete={onSyncComplete} />
                  </div>
                  {onCustomize && (
                    <button
                      onClick={() => onCustomize(product)}
                      className="flex-1 min-w-[120px] px-3 py-2 text-xs font-bold bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                    >
                      Personalizar
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(product)}
                    className="flex-1 px-3 py-2 text-xs font-bold bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => onDelete(product)}
                    className="px-3 py-2 text-xs font-bold bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                  >
                    Deletar
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden md:block bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Produto</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Preço</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-12 w-12 flex-shrink-0">
                        <img
                          className="h-12 w-12 rounded-xl object-cover shadow-sm ring-1 ring-gray-100"
                          src={product.cover_url}
                          alt={product.title}
                        />
                      </div>
                      <div className="ml-4 min-w-0">
                        <div className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors truncate max-w-xs">{product.title}</div>
                        <div className="text-gray-400 text-xs truncate max-w-xs font-medium">
                          {product.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold">
                      {getCategoryName(product.category_id)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-black text-gray-900">
                    {formatPrice(product.price)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${getStatusColor(product.status)}`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {onChangeStatus && (
                        <select
                          value={product.status}
                          onChange={(e) => onChangeStatus(product.id, e.target.value as any)}
                          className="rounded-lg border-gray-200 bg-gray-50 text-[10px] font-black uppercase tracking-tight focus:ring-2 focus:ring-primary-500/20 py-1 pl-2 pr-7 transition-all"
                        >
                          <option value="draft">Rascunho</option>
                          <option value="active">Publicar</option>
                          <option value="archived">Arquivar</option>
                        </select>
                      )}
                      <StripeSync product={product} onSyncComplete={onSyncComplete} />
                      {onCustomize && (
                        <button
                          onClick={() => onCustomize(product)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Personalizar Página"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => onEdit(product)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Editar"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onDelete(product)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Deletar"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h14" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
