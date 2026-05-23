import { useState, useEffect } from 'react';
import { Category } from '../types/admin';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../lib/categories';
import CategoryForm, { CategoryFormData } from '../components/categories/CategoryForm';
import CategoryList from '../components/categories/CategoryList';
import { useToast } from '../contexts/ToastContext';

type ViewMode = 'list' | 'create' | 'edit';

export default function Categories() {
  const { notifyError, notifySuccess } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);
    try {
      const { data, error } = await getCategories();
      if (error) {
        notifyError(error, 'load', 'categories');
      } else {
        setCategories(data || []);
      }
    } catch (error: any) {
      notifyError(error, 'load', 'categories');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCategory(formData: CategoryFormData) {
    const result = await createCategory(formData);

    if (result.success && result.category) {
      setCategories([...categories, result.category].sort((a, b) => a.display_order - b.display_order));
      setViewMode('list');
      notifySuccess('categorySaved');
    } else {
      notifyError(result.error, 'save', 'categories');
      throw new Error(result.error);
    }
  }

  async function handleUpdateCategory(formData: CategoryFormData) {
    if (!selectedCategory) return;

    const result = await updateCategory(selectedCategory.id, formData);

    if (result.success && result.category) {
      setCategories(
        categories
          .map((c) => (c.id === result.category!.id ? result.category! : c))
          .sort((a, b) => a.display_order - b.display_order)
      );
      setViewMode('list');
      setSelectedCategory(null);
      notifySuccess('categorySaved');
    } else {
      notifyError(result.error, 'save', 'categories');
      throw new Error(result.error);
    }
  }

  function handleEditClick(category: Category) {
    setSelectedCategory(category);
    setViewMode('edit');
  }

  function handleDeleteClick(category: Category) {
    setCategoryToDelete(category);
    setShowDeleteModal(true);
  }

  async function confirmDelete() {
    if (!categoryToDelete) return;

    setDeleteLoading(true);
    try {
      const result = await deleteCategory(categoryToDelete.id);

      if (result.success) {
        setCategories(categories.filter((c) => c.id !== categoryToDelete.id));
        setShowDeleteModal(false);
        setCategoryToDelete(null);
        notifySuccess('categorySaved'); // Using generic categorySaved for simplicity, or we could add categoryDeleted to SUCCESS
      } else {
        notifyError(result.error, 'delete', 'categories');
      }
    } catch (error: any) {
      notifyError(error, 'delete', 'categories');
    } finally {
      setDeleteLoading(false);
    }
  }

  function handleCancel() {
    setViewMode('list');
    setSelectedCategory(null);
  }

  // Render based on view mode
  if (viewMode === 'create') {
    return (
      <div className="p-4 sm:p-6 md:p-8 overflow-x-hidden">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Criar Categoria</h1>
          <p className="mt-2 text-sm text-gray-600">Adicione uma nova categoria de produtos</p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <CategoryForm onSubmit={handleCreateCategory} onCancel={handleCancel} />
        </div>
      </div>
    );
  }

  if (viewMode === 'edit' && selectedCategory) {
    return (
      <div className="p-4 sm:p-6 md:p-8 overflow-x-hidden">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Editar Categoria</h1>
          <p className="mt-2 text-sm text-gray-600">Atualize as informações da categoria</p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <CategoryForm
            category={selectedCategory}
            onSubmit={handleUpdateCategory}
            onCancel={handleCancel}
          />
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="p-4 sm:p-6 md:p-8 overflow-x-hidden">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Categorias</h1>
        <p className="mt-2 text-sm text-gray-600">Gerencie as categorias de produtos</p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-gray-900">Lista de Categorias</h2>
          <button
            onClick={() => setViewMode('create')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <svg
              className="mr-2 h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Adicionar Categoria
          </button>
        </div>

        <CategoryList
          categories={categories}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          loading={loading}
        />
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && categoryToDelete && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

            <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>

            <div className="relative inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg
                      className="h-6 w-6 text-red-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                      />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                      Excluir Categoria
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        ⚠️ Tem certeza que deseja excluir a categoria "{categoryToDelete.name}"?
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Esta ação não pode ser desfeita.
                      </p>
                      <p className="text-sm text-red-600 mt-2 font-medium">
                        💡 Atenção: Se houver produtos nesta categoria, a exclusão falhará.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleteLoading}
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {deleteLoading ? 'Excluindo...' : 'Excluir'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setCategoryToDelete(null);
                  }}
                  disabled={deleteLoading}
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
