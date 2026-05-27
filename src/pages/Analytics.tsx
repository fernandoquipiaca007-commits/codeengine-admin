import type { ReactNode } from 'react';
import { useAdminAnalytics } from '../hooks/useAdminAnalytics';
import { formatCurrency, formatKwanza } from '../lib/analytics';

function StatCard({
  label,
  value,
  loading,
  icon,
}: {
  label: string;
  value: string;
  loading: boolean;
  icon: ReactNode;
}) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0 text-primary-600">{icon}</div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{label}</dt>
              <dd className="text-lg font-semibold text-gray-900">
                {loading ? '...' : value}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function RevenueChart({
  loading,
  revenueByDay,
}: {
  loading: boolean;
  revenueByDay: { month: string; revenue: number }[];
}) {
  const max = Math.max(...revenueByDay.map((d) => d.revenue), 1);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  if (revenueByDay.every((d) => d.revenue === 0)) {
    return (
      <div className="h-64 flex items-center justify-center border border-dashed border-gray-200 rounded-lg">
        <p className="text-gray-500 text-sm">Sem receita nos últimos 30 dias</p>
      </div>
    );
  }

  return (
    <div className="h-64 flex items-end gap-1 pt-4">
      {revenueByDay.map((day) => {
        const height = Math.max(4, (day.revenue / max) * 100);
        return (
          <div
            key={day.month}
            className="flex-1 flex flex-col items-center justify-end group"
            title={`${day.month}: ${formatCurrency(day.revenue)}`}
          >
            <div
              className="w-full rounded-t bg-primary-500/80 group-hover:bg-primary-600 transition-colors"
              style={{ height: `${height}%` }}
            />
            <span className="text-[9px] text-gray-400 mt-1 rotate-0 truncate w-full text-center">
              {day.month.slice(8)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Analytics() {
  const { data, loading, error, warning, lastUpdated } = useAdminAnalytics();

  return (
    <div className="p-4 sm:p-6 lg:p-8 overflow-x-hidden">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Análises</h1>
          <p className="mt-2 text-base text-gray-500">
            Visualize análises e relatórios abrangentes da sua loja
          </p>
        </div>
        {lastUpdated && (
          <p className="text-xs text-gray-500">
            Atualizado em tempo real · {lastUpdated.toLocaleTimeString('pt-BR')}
          </p>
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {warning && !error && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {warning}
        </div>
      )}

      {/* Revenue & Sales Segmentation Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Global USD Card */}
        <div className="bg-gradient-to-br from-blue-50/30 to-white shadow-sm border border-blue-100 rounded-2xl p-6 transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2">
              <div className="w-2 h-6 bg-blue-500 rounded-full" />
              Vendas & Receita Global (USD)
            </h2>
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 uppercase tracking-wider">USD $</span>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white/50 p-4 rounded-xl border border-blue-50">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-tight">Receita Total</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{loading ? '...' : formatCurrency(data.totalRevenue)}</p>
            </div>
            <div className="bg-white/50 p-4 rounded-xl border border-blue-50">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-tight">Vendas Totais</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{loading ? '...' : data.totalSales}</p>
            </div>
            <div className="bg-white/50 p-4 rounded-xl border border-blue-50">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-tight">Receita Hoje</p>
              <p className="text-xl font-bold text-blue-600 mt-1">{loading ? '...' : formatCurrency(data.revenueToday)}</p>
            </div>
            <div className="bg-white/50 p-4 rounded-xl border border-blue-50">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-tight">Vendas Hoje</p>
              <p className="text-xl font-bold text-blue-600 mt-1">{loading ? '...' : data.salesToday}</p>
            </div>
          </div>
        </div>

        {/* Angola AOA Card */}
        <div className="bg-gradient-to-br from-orange-50/30 to-white shadow-sm border border-orange-100 rounded-2xl p-6 transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-orange-900 flex items-center gap-2">
              <div className="w-2 h-6 bg-orange-500 rounded-full" />
              Vendas & Receita Angola (AOA)
            </h2>
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-800 uppercase tracking-wider">AOA Kz</span>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white/50 p-4 rounded-xl border border-orange-50">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-tight">Receita Total</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{loading ? '...' : formatKwanza(data.aoaRevenue)}</p>
            </div>
            <div className="bg-white/50 p-4 rounded-xl border border-orange-50">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-tight">Vendas Totais</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{loading ? '...' : data.aoaSales}</p>
            </div>
            <div className="bg-white/50 p-4 rounded-xl border border-orange-50">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-tight">Receita Hoje</p>
              <p className="text-xl font-bold text-orange-600 mt-1">{loading ? '...' : formatKwanza(data.aoaRevenueToday)}</p>
            </div>
            <div className="bg-white/50 p-4 rounded-xl border border-orange-50">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-tight">Vendas Hoje</p>
              <p className="text-xl font-bold text-orange-600 mt-1">{loading ? '...' : data.aoaSalesToday}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Primary stats — existing cards wired */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        <StatCard
          label="Taxa de Conversão"
          value={`${data.conversionRate.toFixed(1)}%`}
          loading={loading}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
          }
        />
        <StatCard
          label="Total de Downloads"
          value={String(data.totalDownloads)}
          loading={loading}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          }
        />
        <StatCard
          label="Valor Médio do Pedido (USD)"
          value={formatCurrency(data.avgOrderValue)}
          loading={loading}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Extended KPIs — same design system */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Total de Membros" value={String(data.totalMembers)} loading={loading} icon={<span className="text-lg font-bold text-gray-400">@</span>} />
        <StatCard label="Visitantes Hoje" value={String(data.visitorsToday)} loading={loading} icon={<span className="text-lg font-bold text-gray-400">◎</span>} />
        <StatCard label="Favoritos" value={String(data.totalFavorites)} loading={loading} icon={<span className="text-lg font-bold text-gray-400">♥</span>} />
        <StatCard
          label="Notificações"
          value={`${data.unreadNotifications} / ${data.totalNotifications}`}
          loading={loading}
          icon={<span className="text-lg font-bold text-gray-400">!</span>}
        />
      </div>

      {data.topProductTitle && (
        <p className="mb-4 text-sm text-gray-600">
          Produto mais vendido (30 dias):{' '}
          <span className="font-semibold text-gray-900">{data.topProductTitle}</span>
        </p>
      )}

      {/* Charts — existing layout, real data */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-10">
        <div className="bg-white shadow-sm border border-gray-100 rounded-2xl p-6 lg:p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <div className="w-2 h-6 bg-indigo-500 rounded-full" />
            Receita ao Longo do Tempo
          </h2>
          <RevenueChart loading={loading} revenueByDay={data.revenueByDay} />
        </div>

        <div className="bg-white shadow-sm border border-gray-100 rounded-2xl p-6 lg:p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <div className="w-2 h-6 bg-primary-600 rounded-full" />
            Produtos Mais Vendidos
          </h2>
          {loading ? (
            <p className="text-gray-500 text-sm">Carregando...</p>
          ) : data.topProducts.length === 0 ? (
            <div className="h-64 flex items-center justify-center border border-dashed border-gray-200 rounded-lg">
              <p className="text-gray-500 text-sm">Nenhuma venda registrada</p>
            </div>
          ) : (
            <ul className="space-y-3 max-h-64 overflow-y-auto">
              {data.topProducts.map((product, index) => (
                <li
                  key={product.product_id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {index + 1}. {product.product_title}
                    </p>
                    <p className="text-xs text-gray-500">{product.sales_count} vendas</p>
                  </div>
                  <span className="text-sm font-semibold text-primary-700 whitespace-nowrap">
                    {formatCurrency(product.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl p-6 lg:p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <div className="w-2 h-6 bg-amber-500 rounded-full" />
          Últimos Pedidos
        </h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : data.recentOrders.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="text-gray-500 font-medium">Nenhum pedido encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 lg:-mx-8">
            <div className="inline-block min-w-full align-middle px-6 lg:px-8">
              <div className="overflow-hidden border border-gray-100 rounded-xl">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr>
                  <th className="py-2 text-left font-medium text-gray-500">Produto</th>
                  <th className="py-2 text-left font-medium text-gray-500">Membro</th>
                  <th className="py-2 text-left font-medium text-gray-500">Valor</th>
                  <th className="py-2 text-left font-medium text-gray-500">Status</th>
                  <th className="py-2 text-left font-medium text-gray-500">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="py-3 pr-4 text-gray-900">{order.product_title}</td>
                    <td className="py-3 pr-4 text-gray-600">{order.member_email}</td>
                    <td className="py-3 pr-4 font-medium text-gray-900">
                      {order.is_free ? (
                        <span className="text-green-600 font-semibold">Grátis</span>
                      ) : order.transaction_id?.startsWith('fastpay_') ? (
                        formatKwanza(order.amount_paid)
                      ) : (
                        formatCurrency(order.amount_paid)
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          order.payment_status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : order.payment_status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : order.payment_status === 'refunded'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {order.payment_status === 'completed' ? 'concluído'
                          : order.payment_status === 'pending' ? 'pendente'
                          : order.payment_status === 'refunded' ? 'reembolsado'
                          : order.payment_status === 'failed' ? 'falhou'
                          : order.payment_status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500">
                      {new Date(order.purchase_date).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
