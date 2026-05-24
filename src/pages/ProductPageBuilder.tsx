import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft as LucideArrowLeft, 
  Save as LucideSave, 
  Eye as LucideEye, 
  Settings as LucideSettings, 
  Video as LucideVideo, 
  HelpCircle as LucideHelpCircle, 
  Gift as LucideGift, 
  Tag as LucideTag, 
  Megaphone as LucideMegaphone,
  Image as LucideImage,
  Layout as LucideLayout
} from 'lucide-react';

const ArrowLeft = LucideArrowLeft as any;
const Save = LucideSave as any;
const Eye = LucideEye as any;
const Settings = LucideSettings as any;
const Video = LucideVideo as any;
const HelpCircle = LucideHelpCircle as any;
const Gift = LucideGift as any;
const Tag = LucideTag as any;
const Megaphone = LucideMegaphone as any;
const Image = LucideImage as any;
const Layout = LucideLayout as any;
import { supabaseAdmin } from '../lib/supabase-admin';
import { executeWithRetry } from '../lib/supabase-request';
import { FAQManager } from '../components/products/FAQManager';
import { VideoManager } from '../components/products/VideoManager';
import { BonusesManager } from '../components/products/BonusesManager';
import { CouponsManager } from '../components/products/CouponsManager';
import { CampaignsManager } from '../components/products/CampaignsManager';
import { CustomSectionsManager } from '../components/products/CustomSectionsManager';
import { MediaGallery } from '../components/products/MediaGallery';

interface Product {
  id: string;
  title: string;
  price: number;
  page_layout_config: any;
  custom_copy: any;
}

export function ProductPageBuilder() {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('id');
  
  const [product, setProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<string>('layout');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (productId) {
      loadProduct();
    }
  }, [productId]);

  async function loadProduct() {
    try {
      setLoading(true);
      const data = await executeWithRetry<Product>(
        async () =>
          supabaseAdmin.from('products').select('*').eq('id', productId!).single(),
        { context: 'load-product-builder' }
      );
      
      // Inicializar com valores padrão se não existirem
      const productData = {
        ...data,
        page_layout_config: data.page_layout_config || {
          sections_enabled: {
            hero: true,
            benefits: true,
            features: true,
            bonuses: true,
            faq: true,
            cta: true,
            testimonials: false,
            comparison: false
          },
          sections_order: ["hero", "benefits", "features", "bonuses", "faq", "cta"],
          hero_style: "default",
          cta_text: "Comprar Agora",
          cta_secondary_text: "Pagamento 100% seguro"
        },
        custom_copy: data.custom_copy || {
          hero_headline: '',
          hero_subheadline: '',
          benefits_title: 'O que você vai dominar',
          benefits_subtitle: 'Um arsenal completo para elevar sua engenharia de software.',
          bonuses_title: 'Bônus Exclusivos',
          bonuses_subtitle: 'Complementos premium incluídos gratuitamente nesta oferta.',
          faq_title: 'Perguntas Frequentes',
          cta_headline: 'Junte-se a +2.500 desenvolvedores'
        }
      };
      
      console.log('📦 Produto carregado no Admin:', productData);
      setProduct(productData);
    } catch (error: any) {
      console.error('Error loading product:', error);
      showMessage('error', 'Erro ao carregar produto');
    } finally {
      setLoading(false);
    }
  }

  async function saveProduct() {
    if (!product) return;

    try {
      setSaving(true);
      
      console.log('💾 Salvando produto:', {
        id: product.id,
        page_layout_config: product.page_layout_config,
        custom_copy: product.custom_copy
      });
      
      const data = await executeWithRetry<Product[]>(
        async () =>
          supabaseAdmin
            .from('products')
            .update({
              page_layout_config: product.page_layout_config,
              custom_copy: product.custom_copy,
              updated_at: new Date().toISOString(),
            })
            .eq('id', product.id)
            .select(),
        { context: 'save-product-builder' }
      );

      if (!data?.length) {
        console.error('⚠️ Nenhum dado retornado após update');
        showMessage('error', 'Produto não foi atualizado. Verifique as permissões.');
        return;
      }
      
      console.log('✅ Produto salvo com sucesso:', data);
      showMessage('success', 'Produto atualizado com sucesso!');
    } catch (error: any) {
      console.error('❌ Error saving product:', error);
      showMessage('error', `Erro ao salvar produto: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  function updateLayoutConfig(key: string, value: any) {
    if (!product) return;
    setProduct({
      ...product,
      page_layout_config: {
        ...product.page_layout_config,
        [key]: value
      }
    });
  }

  function updateCustomCopy(key: string, value: any) {
    if (!product) return;
    console.log('✏️ Atualizando custom_copy:', key, '=', value);
    setProduct({
      ...product,
      custom_copy: {
        ...product.custom_copy,
        [key]: value
      }
    });
  }

  function toggleSection(section: string) {
    if (!product) return;
    const sectionsEnabled = product.page_layout_config?.sections_enabled || {};
    updateLayoutConfig('sections_enabled', {
      ...sectionsEnabled,
      [section]: !sectionsEnabled[section]
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando produto...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-4 sm:p-6 md:p-8 overflow-x-hidden">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Produto não encontrado</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'layout', label: 'Layout', icon: Layout },
    { id: 'copy', label: 'Textos', icon: Settings },
    { id: 'videos', label: 'Vídeos', icon: Video },
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
    { id: 'bonuses', label: 'Bônus', icon: Gift },
    { id: 'coupons', label: 'Cupons', icon: Tag },
    { id: 'campaigns', label: 'Campanhas', icon: Megaphone },
    { id: 'media', label: 'Mídia', icon: Image },
    { id: 'sections', label: 'Secções', icon: Settings },
  ];

  const sectionsEnabled = product.page_layout_config?.sections_enabled || {};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <button
                onClick={() => window.history.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{product.title}</h1>
                <p className="text-sm text-gray-500">Personalize a página do produto</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
              <button
                onClick={() => window.open(`http://localhost:3000/product?id=${product.id}`, '_blank')}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors touch-target"
              >
                <Eye className="w-4 h-4" />
                Visualizar
              </button>
              <button
                onClick={saveProduct}
                disabled={saving}
                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 touch-target"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <div className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
        {/* Layout Tab */}
        {activeTab === 'layout' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Configuração de Layout</h2>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Ative ou desative seções da página do produto. Arraste para reordenar.
              </p>

              {Object.keys(sectionsEnabled).filter(s => s !== 'testimonials').map((section) => (
                <div
                  key={section}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                      <Layout className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 capitalize">{section}</p>
                      <p className="text-sm text-gray-500">Seção {section}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sectionsEnabled[section]}
                      onChange={() => toggleSection(section)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Copy Tab */}
        {activeTab === 'copy' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Textos Personalizados</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título Principal (Hero)
                </label>
                <input
                  type="text"
                  value={product.custom_copy?.hero_headline || ''}
                  onChange={(e) => updateCustomCopy('hero_headline', e.target.value)}
                  placeholder="Ex: Domine a Arte do Desenvolvimento"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subtítulo (Hero)
                </label>
                <input
                  type="text"
                  value={product.custom_copy?.hero_subheadline || ''}
                  onChange={(e) => updateCustomCopy('hero_subheadline', e.target.value)}
                  placeholder="Ex: O curso mais completo do mercado"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título da Seção de Benefícios
                </label>
                <input
                  type="text"
                  value={product.custom_copy?.benefits_title || ''}
                  onChange={(e) => updateCustomCopy('benefits_title', e.target.value)}
                  placeholder="Ex: O que você vai dominar"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subtítulo da Seção de Benefícios
                </label>
                <textarea
                  value={product.custom_copy?.benefits_subtitle || ''}
                  onChange={(e) => updateCustomCopy('benefits_subtitle', e.target.value)}
                  placeholder="Ex: Um arsenal completo para elevar sua engenharia de software"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Texto do Botão CTA
                </label>
                <input
                  type="text"
                  value={product.page_layout_config?.cta_text || ''}
                  onChange={(e) => updateLayoutConfig('cta_text', e.target.value)}
                  placeholder="Ex: Comprar Agora"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {/* Other tabs */}
        {activeTab === 'videos' && product && <VideoManager productId={product.id} />}
        {activeTab === 'faq' && product && <FAQManager productId={product.id} />}
        {activeTab === 'bonuses' && product && <BonusesManager productId={product.id} />}
        {activeTab === 'coupons' && product && <CouponsManager productId={product.id} />}
        {activeTab === 'campaigns' && product && <CampaignsManager productId={product.id} />}
        {activeTab === 'media' && product && <MediaGallery productId={product.id} />}
        {activeTab === 'sections' && product && <CustomSectionsManager productId={product.id} />}
      </div>
    </div>
  );
}
