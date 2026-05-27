import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, Category } from '../types/admin';
import { supabaseAdmin } from '../lib/supabase-admin';
import { createProduct, updateProduct, deleteProduct, getProducts } from '../lib/products';
import ProductForm, { ProductFormData } from '../components/products/ProductForm';
import ProductTable from '../components/products/ProductTable';
import { useToast } from '../contexts/ToastContext';
import { mapError } from '../lib/error-messages';

type ViewMode = 'list' | 'create' | 'edit';

export default function Products() {
  const navigate = useNavigate();
  const { notifyError, notifySuccess, showError } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load products and categories on mount
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Load products
      const { data: productsData, error: productsError } = await getProducts();
      if (productsError) {
        notifyError(productsError, 'load', 'products-list');
      } else {
        setProducts(productsData || []);
      }

      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabaseAdmin
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (categoriesError) {
        notifyError(categoriesError, 'load', 'categories-list');
      } else {
        setCategories(categoriesData || []);
      }
    } catch (error: unknown) {
      notifyError(error, 'load', 'products-data');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProduct(formData: ProductFormData) {
    const result = await createProduct(formData);
    
    if (result.success && result.product) {
      setProducts([result.product, ...products]);
      setViewMode('list');
      notifySuccess('productPublished');
    } else {
      const mapped = mapError(result.error, 'save');
      showError(mapped.title, mapped.message, mapped.hint);
      throw new Error(result.error);
    }
  }

  async function handleUpdateProduct(formData: ProductFormData) {
    if (!selectedProduct) return;

    const result = await updateProduct(selectedProduct.id, formData, selectedProduct);
    
    if (result.success && result.product) {
      setProducts(products.map((p) => (p.id === result.product!.id ? result.product! : p)));
      setViewMode('list');
      setSelectedProduct(null);
      notifySuccess('productUpdated');
    } else {
      const mapped = mapError(result.error, 'save');
      showError(mapped.title, mapped.message, mapped.hint);
      throw new Error(result.error);
    }
  }

  function handleEditClick(product: Product) {
    setSelectedProduct(product);
    setViewMode('edit');
  }

  function handleDeleteClick(product: Product) {
    setProductToDelete(product);
    setShowDeleteModal(true);
  }

  async function confirmDelete() {
    if (!productToDelete) return;

    setDeleteLoading(true);
    try {
      const result = await deleteProduct(productToDelete.id);
      
      if (result.success) {
        setProducts(products.filter((p) => p.id !== productToDelete.id));
        setShowDeleteModal(false);
        setProductToDelete(null);
        notifySuccess('productDeleted');
      } else if (result.error?.includes('purchases')) {
        showError(
          'Não é possível excluir',
          'Este produto possui compras associadas.',
          'Desative o produto em vez de excluí-lo.'
        );
      } else {
        const mapped = mapError(result.error, 'delete');
        showError(mapped.title, mapped.message, mapped.hint);
      }
    } catch (error: unknown) {
      notifyError(error, 'delete', 'products-delete');
    } finally {
      setDeleteLoading(false);
    }
  }

  function handleCancel() {
    setViewMode('list');
    setSelectedProduct(null);
  }

  async function handleChangeStatus(productId: string, newStatus: 'draft' | 'active' | 'archived') {
    try {
      const { error } = await supabaseAdmin
        .from('products')
        .update({ status: newStatus })
        .eq('id', productId);

      if (error) throw error;
      
      setProducts(products.map(p => 
        p.id === productId ? { ...p, status: newStatus } : p
      ));
      notifySuccess('productUpdated');
    } catch (err: any) {
      console.error('Error changing status:', err);
      showError('Erro ao atualizar', err.message);
    }
  }

  // Render based on view mode
  if (viewMode === 'create') {
    return (
      <div className="p-4 sm:p-6 lg:p-8 overflow-x-hidden">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Criar Produto</h1>
          <p className="mt-2 text-base text-gray-500">
            Adicione um novo produto digital à sua loja
          </p>
        </div>

        <div className="bg-white shadow-sm border border-gray-100 rounded-2xl p-6 lg:p-8">
          <ProductForm onSubmit={handleCreateProduct} onCancel={handleCancel} />
        </div>
      </div>
    );
  }

  if (viewMode === 'edit' && selectedProduct) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 overflow-x-hidden">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Editar Produto</h1>
          <p className="mt-2 text-base text-gray-500">
            Atualize informações e arquivos do produto
          </p>
        </div>

        <div className="bg-white shadow-sm border border-gray-100 rounded-2xl p-6 lg:p-8">
          <ProductForm
            product={selectedProduct}
            onSubmit={handleUpdateProduct}
            onCancel={handleCancel}
          />
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="p-4 sm:p-6 lg:p-8 overflow-x-hidden">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Produtos</h1>
        <p className="mt-2 text-base text-gray-500">
          Gerencie seus produtos digitais, uploads e inventário
        </p>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <div className="w-2 h-6 bg-primary-600 rounded-full" />
            Lista de Produtos
          </h2>
          <button
            onClick={() => setViewMode('create')}
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-bold rounded-xl text-white bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all active:scale-95"
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
            Adicionar Produto
          </button>
        </div>

        <ProductTable
          products={products}
          categories={categories}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          onCustomize={(product) => navigate(`/products/builder?id=${product.id}`)}
          onSyncComplete={loadData}
          onChangeStatus={handleChangeStatus}
          loading={loading}
        />
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && productToDelete && (
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
                      Excluir Produto
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        ⚠️ Tem certeza que deseja excluir "{productToDelete.title}"?
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Esta ação não pode ser desfeita e irá:
                      </p>
                      <ul className="text-sm text-gray-500 mt-2 list-disc list-inside">
                        <li>Remover o produto da loja</li>
                        <li>Excluir todos os arquivos associados</li>
                        <li>Remover das categorias</li>
                      </ul>
                      <p className="text-sm text-red-600 mt-2 font-medium">
                        💡 Dica: Se o produto já foi vendido, considere desativá-lo ao invés de excluir.
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
                    setProductToDelete(null);
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
