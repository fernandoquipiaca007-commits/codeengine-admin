import { Category } from '../../types/admin';

interface CategoryListProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onManageSubcategories: (category: Category) => void;
  loading: boolean;
}

export default function CategoryList({
  categories,
  onEdit,
  onDelete,
  onManageSubcategories,
  loading,
}: CategoryListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma categoria</h3>
        <p className="mt-1 text-sm text-gray-500">Comece criando uma nova categoria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-4">
        {categories.map((category) => (
          <div key={category.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Ordem #{category.display_order}
                </div>
                <h3 className="text-lg font-black text-gray-900">{category.name}</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(category)}
                  className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                  title="Editar"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => onDelete(category)}
                  className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                  title="Deletar"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h14" />
                  </svg>
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-500 line-clamp-2 mb-5">
              {category.description || 'Sem descrição definida.'}
            </p>

            <button
              onClick={() => onManageSubcategories(category)}
              className="w-full py-3 bg-gray-50 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-100 transition-all active:scale-[0.98] border border-gray-100 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
              Gerenciar Subcategorias
            </button>
          </div>
        ))}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden md:block bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Ordem</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Produtos</th>
              <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.map((category) => (
              <tr key={category.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-4 text-sm font-bold text-gray-400">{category.display_order}</td>
                <td className="px-6 py-4 text-sm font-black text-gray-900 group-hover:text-primary-600 transition-colors">
                  {category.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate">
                  {category.description || '—'}
                </td>
                <td className="px-6 py-4 text-sm font-bold text-gray-400">-</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onManageSubcategories(category)}
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      Subcategorias
                    </button>
                    <button
                      onClick={() => onEdit(category)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Editar"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDelete(category)}
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
  );
}
