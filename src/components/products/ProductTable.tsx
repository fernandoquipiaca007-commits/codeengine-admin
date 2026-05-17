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
  loading?: boolean;
}

export default function ProductTable({
  products,
  categories,
  onEdit,
  onDelete,
  onCustomize,
  onSyncComplete,
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
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Search */}
        <div className="sm:col-span-1">
          <label htmlFor="search" className="sr-only">
            Buscar
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
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
              className="block w-full rounded-md border-gray-300 pl-10 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              placeholder="Buscar produtos..."
            />
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <label htmlFor="status-filter" className="sr-only">
            Status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Ativo</option>
            <option value="draft">Rascunho</option>
            <option value="archived">Arquivado</option>
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <label htmlFor="category-filter" className="sr-only">
            Category
          </label>
          <select
            id="category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="block w-full rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
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
      <div className="mb-4">
        <p className="text-sm text-gray-700">
          Mostrando <span className="font-medium">{filteredProducts.length}</span> de{' '}
          <span className="font-medium">{products.length}</span> produtos
        </p>
      </div>

      {/* Table */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
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
          <div className="space-y-3 md:hidden">
            {filteredProducts.map((product) => (
              <article key={product.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <img
                    className="h-14 w-14 rounded object-cover flex-shrink-0"
                    src={product.cover_url}
                    alt={product.title}
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-gray-900 truncate">{product.title}</h4>
                    <p className="mt-1 text-xs text-gray-500">{product.description.substring(0, 90)}...</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-gray-50 p-2">
                    <p className="text-gray-500">Categoria</p>
                    <p className="font-medium text-gray-800 truncate">{getCategoryName(product.category_id)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-2">
                    <p className="text-gray-500">Preço</p>
                    <p className="font-semibold text-gray-900">{formatPrice(product.price)}</p>
                  </div>
                </div>
                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold leading-5 ${getStatusColor(
                      product.status
                    )}`}
                  >
                    {product.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StripeSync product={product} onSyncComplete={onSyncComplete} />
                  {onCustomize && (
                    <button
                      onClick={() => onCustomize(product)}
                      className="touch-target rounded-lg border border-blue-200 px-3 py-2 text-xs font-medium text-blue-700"
                    >
                      Personalizar
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(product)}
                    className="touch-target rounded-lg border border-primary-200 px-3 py-2 text-xs font-medium text-primary-700"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => onDelete(product)}
                    className="touch-target rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700"
                  >
                    Deletar
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden md:block overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                >
                  Product
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                >
                  Categoria
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                >
                  Preço
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                >
                  Status
                </th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <img
                          className="h-10 w-10 rounded object-cover"
                          src={product.cover_url}
                          alt={product.title}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="font-medium text-gray-900">{product.title}</div>
                        <div className="text-gray-500 text-sm truncate max-w-xs">
                          {product.description.substring(0, 60)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {getCategoryName(product.category_id)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-medium">
                    {formatPrice(product.price)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(
                        product.status
                      )}`}
                    >
                      {product.status}
                    </span>
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <div className="flex items-center justify-end gap-3">
                      <StripeSync product={product} onSyncComplete={onSyncComplete} />
                      {onCustomize && (
                        <button
                          onClick={() => onCustomize(product)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Personalizar Página"
                        >
                          Customize
                        </button>
                      )}
                      <button
                        onClick={() => onEdit(product)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => onDelete(product)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Deletar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
