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
  Layout as LucideLayout,
  X as LucideX,
  Award as LucideAward
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
const X = LucideX as any;
const Award = LucideAward as any;
import { supabaseAdmin } from '../lib/supabase-admin';
import { executeWithRetry } from '../lib/supabase-request';
import { FAQManager } from '../components/products/FAQManager';
import { VideoManager } from '../components/products/VideoManager';
import { BonusesManager } from '../components/products/BonusesManager';
import { CouponsManager } from '../components/products/CouponsManager';
import { CampaignsManager } from '../components/products/CampaignsManager';
import { CustomSectionsManager } from '../components/products/CustomSectionsManager';
import { MediaGallery } from '../components/products/MediaGallery';
import { BenefitsManager } from '../components/products/BenefitsManager';

function getStoreUrl(): string {
  if (typeof window === 'undefined') return import.meta.env.VITE_STORE_URL || 'http://localhost:3000';
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return import.meta.env.VITE_STORE_URL || 'http://localhost:3000';
  }
  if (hostname.startsWith('admin.')) {
    return `${protocol}//${hostname.substring(6)}`;
  }
  if (hostname.includes('-admin.')) {
    return `${protocol}//${hostname.replace('-admin.', '.')}`;
  }
  if (hostname.endsWith('-admin.vercel.app')) {
    return `${protocol}//${hostname.replace('-admin.vercel.app', '.vercel.app')}`;
  }
  if (hostname.endsWith('-admin.netlify.app')) {
    return `${protocol}//${hostname.replace('-admin.netlify.app', '.netlify.app')}`;
  }
  return import.meta.env.VITE_STORE_URL || 'http://localhost:3000';
}

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
  const [editingSection, setEditingSection] = useState<string | null>(null);

  const SECTION_INFO: Record<string, { name: string; description: string }> = {
    hero: { name: 'Hero (Cabeçalho)', description: 'Seção principal com título e subtítulo de impacto.' },
    benefits: { name: 'Benefícios', description: 'Lista de tópicos sobre o que o cliente irá dominar.' },
    features: { name: 'Características (Features)', description: 'Seções extras de texto/conteúdo personalizado.' },
    bonuses: { name: 'Bônus', description: 'Lista de bônus exclusivos oferecidos na compra.' },
    faq: { name: 'Perguntas Frequentes (FAQ)', description: 'Perguntas e respostas comuns dos clientes.' },
    cta: { name: 'Chamada para Ação (CTA)', description: 'Seção final de compra com preço e botão.' },
    comparison: { name: 'Comparação', description: 'Tabela de comparação de planos ou produtos.' },
    video: { name: 'Vídeo do Produto', description: 'Vídeo adicional inserido na página.' }
  };

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
      
      // Inicializar e normalizar com valores padrão
      const defaultSectionsEnabled = {
        hero: true,
        benefits: true,
        features: true,
        bonuses: true,
        faq: true,
        cta: true,
        video: true,
        testimonials: false,
        comparison: false
      };

      const loadedLayoutConfig = data.page_layout_config || {};
      const sectionsEnabled = {
        ...defaultSectionsEnabled,
        ...(loadedLayoutConfig.sections_enabled || {})
      };

      const productData = {
        ...data,
        page_layout_config: {
          ...loadedLayoutConfig,
          sections_enabled: sectionsEnabled,
          sections_order: loadedLayoutConfig.sections_order || ["hero", "benefits", "features", "bonuses", "faq", "cta", "video", "comparison"],
          hero_style: loadedLayoutConfig.hero_style || "default",
          cta_text: loadedLayoutConfig.cta_text || "Comprar Agora",
          cta_secondary_text: loadedLayoutConfig.cta_secondary_text || "Pagamento 100% seguro"
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
      
      console.log('📦 Produto carregado no Admin (Normalizado):', productData);
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

  function renderModalContent(section: string) {
    if (!product) return null;

    switch (section) {
      case 'hero':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título Principal (Headline)
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
                Subtítulo (Subheadline)
              </label>
              <input
                type="text"
                value={product.custom_copy?.hero_subheadline || ''}
                onChange={(e) => updateCustomCopy('hero_subheadline', e.target.value)}
                placeholder="Ex: O curso mais completo do mercado"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        );

      case 'cta':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título da Chamada (Headline)
              </label>
              <input
                type="text"
                value={product.custom_copy?.cta_headline || ''}
                onChange={(e) => updateCustomCopy('cta_headline', e.target.value)}
                placeholder="Ex: Junte-se a +2.500 desenvolvedores"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Texto do Botão Principal
              </label>
              <input
                type="text"
                value={product.page_layout_config?.cta_text || ''}
                onChange={(e) => updateLayoutConfig('cta_text', e.target.value)}
                placeholder="Ex: Comprar Agora"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Texto Secundário (Abaixo do Botão)
              </label>
              <input
                type="text"
                value={product.page_layout_config?.cta_secondary_text || ''}
                onChange={(e) => updateLayoutConfig('cta_secondary_text', e.target.value)}
                placeholder="Ex: Pagamento 100% seguro"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        );

      case 'benefits':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-gray-100 pb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título da Seção
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
                  Subtítulo da Seção
                </label>
                <textarea
                  value={product.custom_copy?.benefits_subtitle || ''}
                  onChange={(e) => updateCustomCopy('benefits_subtitle', e.target.value)}
                  placeholder="Ex: Um arsenal completo para elevar sua engenharia de software"
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Itens de Benefício</h4>
              <BenefitsManager productId={product.id} />
            </div>
          </div>
        );

      case 'bonuses':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-gray-100 pb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título da Seção de Bônus
                </label>
                <input
                  type="text"
                  value={product.custom_copy?.bonuses_title || ''}
                  onChange={(e) => updateCustomCopy('bonuses_title', e.target.value)}
                  placeholder="Ex: Bônus Exclusivos"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subtítulo da Seção de Bônus
                </label>
                <textarea
                  value={product.custom_copy?.bonuses_subtitle || ''}
                  onChange={(e) => updateCustomCopy('bonuses_subtitle', e.target.value)}
                  placeholder="Ex: Complementos premium incluídos gratuitamente"
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Itens de Bônus</h4>
              <BonusesManager productId={product.id} />
            </div>
          </div>
        );

      case 'faq':
        return (
          <div className="space-y-6">
            <div className="border-b border-gray-100 pb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título da Seção FAQ
              </label>
              <input
                type="text"
                value={product.custom_copy?.faq_title || ''}
                onChange={(e) => updateCustomCopy('faq_title', e.target.value)}
                placeholder="Ex: Perguntas Frequentes"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Gerenciar Perguntas e Respostas</h4>
              <FAQManager productId={product.id} />
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Configure e gerencie os vídeos adicionais desta página de produto.
            </p>
            <VideoManager productId={product.id} />
          </div>
        );

      case 'features':
      case 'comparison':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              As seções customizadas do produto são exibidas na ordem configurada. Adicione e edite os elementos de Features ou Comparação abaixo:
            </p>
            <CustomSectionsManager productId={product.id} />
          </div>
        );

      default:
        return <p className="text-gray-500">Esta seção não possui configurações adicionais.</p>;
    }
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
    { id: 'benefits', label: 'Benefícios', icon: Award },
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
                onClick={() => window.open(`${getStoreUrl()}/product?id=${product.id}`, '_blank')}
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

              {Object.keys(sectionsEnabled).filter(s => s !== 'testimonials').map((section) => {
                const info = SECTION_INFO[section] || { name: section, description: `Seção ${section}` };
                return (
                  <div
                    key={section}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                        <Layout className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{info.name}</p>
                        <p className="text-sm text-gray-500">{info.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setEditingSection(section)}
                        className="px-3.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-lg text-sm font-semibold transition-all hover:scale-105 duration-200 cursor-pointer"
                      >
                        Editar
                      </button>
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
                  </div>
                );
              })}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observação de Compra (Alerta antes de comprar)
                </label>
                <textarea
                  value={product.custom_copy?.purchase_note || ''}
                  onChange={(e) => updateCustomCopy('purchase_note', e.target.value)}
                  placeholder="Ex: Nota: Apesar de o documento estar traduzido para português, algumas imagens podem conter textos em inglês."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Esta observação será exibida como um alerta destacado logo acima do botão de compra na página do produto.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Other tabs */}
        {activeTab === 'benefits' && product && <BenefitsManager productId={product.id} />}
        {activeTab === 'videos' && product && <VideoManager productId={product.id} />}
        {activeTab === 'faq' && product && <FAQManager productId={product.id} />}
        {activeTab === 'bonuses' && product && <BonusesManager productId={product.id} />}
        {activeTab === 'coupons' && product && <CouponsManager productId={product.id} />}
        {activeTab === 'campaigns' && product && <CampaignsManager productId={product.id} />}
        {activeTab === 'media' && product && <MediaGallery productId={product.id} />}
        {activeTab === 'sections' && product && <CustomSectionsManager productId={product.id} />}
      </div>

      {/* Dynamic Edit Modal */}
      {editingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col relative z-10 border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                Editar Seção: {SECTION_INFO[editingSection]?.name || editingSection}
              </h3>
              <button
                onClick={() => setEditingSection(null)}
                className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {renderModalContent(editingSection)}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setEditingSection(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium text-sm"
              >
                Fechar
              </button>
              {['hero', 'cta', 'benefits', 'bonuses', 'faq'].includes(editingSection) && (
                <button
                  onClick={async () => {
                    await saveProduct();
                    setEditingSection(null);
                  }}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  Salvar Seção
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
