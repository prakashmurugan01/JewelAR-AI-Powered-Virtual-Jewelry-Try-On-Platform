import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { HiTrendingUp, HiUsers, HiSparkles, HiCheckCircle } from 'react-icons/hi';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AnalyticsCharts({ data }) {
  if (!data) {
    return (
      <div className="glass-card p-16 text-center">
        <div className="inline-block">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-blue-400"></div>
        </div>
        <p className="text-white/50 mt-2">Loading analytics...</p>
      </div>
    );
  }

  // Memoized chart options for performance
  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: {
            color: 'rgba(255,255,255,0.7)',
            font: { size: 12 },
            padding: 15,
            usePointStyle: true,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(15,23,42,0.95)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ${context.parsed.y || context.parsed}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 } },
          grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
        },
        y: {
          ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 } },
          grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
        },
      },
    }),
    []
  );

  // Top jewelry bar chart
  const topJewelry = useMemo(() => data.top_jewelry || [], [data]);

  const barData = useMemo(
    () => ({
      labels: topJewelry.map((j) => j.name?.substring(0, 20) || 'Item'),
      datasets: [
        {
          label: 'Try-on Count',
          data: topJewelry.map((j) => j.try_count || 0),
          backgroundColor: 'rgba(168, 85, 247, 0.6)',
          borderColor: 'rgba(168, 85, 247, 1)',
          borderWidth: 1,
          borderRadius: 6,
          hoverBackgroundColor: 'rgba(168, 85, 247, 0.8)',
        },
      ],
    }),
    [topJewelry]
  );

  // Category pie chart
  const catStats = useMemo(() => data.category_stats || [], [data]);
  const colors = ['#d946ef', '#f97316', '#8b5cf6', '#06b6d4', '#10b981', '#f43f5e', '#ec4899', '#f59e0b'];

  const pieData = useMemo(
    () => ({
      labels: catStats.map((c) => c.name),
      datasets: [
        {
          data: catStats.map((c) => c.total_tries || c.item_count || 0),
          backgroundColor: colors.slice(0, catStats.length),
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          hoverBackgroundColor: colors.slice(0, catStats.length).map((c) => c + 'dd'),
        },
      ],
    }),
    [catStats]
  );

  // Daily try-ons line chart
  const dailyData = useMemo(() => data.daily_tryons || [], [data]);

  const lineData = useMemo(
    () => ({
      labels: dailyData.map((d) =>
        new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })
      ),
      datasets: [
        {
          label: 'Daily Try-ons',
          data: dailyData.map((d) => d.count || 0),
          borderColor: 'rgba(249, 115, 22, 1)',
          backgroundColor: 'rgba(249, 115, 22, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: 'rgba(249, 115, 22, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 6,
        },
      ],
    }),
    [dailyData]
  );

  // Calculate stats
  const stats = useMemo(
    () => [
      {
        label: 'Total Users',
        value: data.users?.total || 0,
        icon: HiUsers,
        color: 'from-blue-500 to-purple-600',
        change: `+${data.users?.new_this_week || 0} this week`,
      },
      {
        label: 'Pending Approval',
        value: data.users?.pending || 0,
        icon: HiCheckCircle,
        color: 'from-amber-500 to-orange-600',
        change: data.users?.pending > 5 ? '⚠️ Action needed' : 'All caught up',
      },
      {
        label: 'Total Jewelry',
        value: data.jewelry?.total_items || 0,
        icon: HiSparkles,
        color: 'from-cyan-500 to-blue-600',
        change: `${data.jewelry?.featured_items || 0} featured`,
      },
      {
        label: 'Total Try-ons',
        value: data.tryons?.total || 0,
        icon: HiTrendingUp,
        color: 'from-emerald-500 to-green-600',
        change: `${data.tryons?.this_month || 0} this month`,
      },
    ],
    [data]
  );

  const pieChartOptions = useMemo(
    () => ({
      ...chartOptions,
      scales: undefined,
      plugins: {
        ...chartOptions.plugins,
        legend: {
          ...chartOptions.plugins.legend,
          position: 'bottom',
        },
      },
    }),
    [chartOptions]
  );

  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="glass-card overflow-hidden hover:border-blue-500/50 transition-colors">
              <div className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs font-medium text-white/50 uppercase tracking-wide">{stat.label}</p>
                    <p className="text-3xl font-bold text-white mt-2">{stat.value.toLocaleString()}</p>
                  </div>
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${stat.color}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-xs text-white/40 mt-3">{stat.change}</p>
                <div className={`h-0.5 rounded-full mt-3 bg-gradient-to-r ${stat.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Jewelry Bar Chart */}
        <div className="glass-card p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">Top Jewelry Items</h3>
            <p className="text-xs text-white/40 mt-1">Most tried-on items</p>
          </div>
          {topJewelry.length > 0 ? (
            <div className="h-80">
              <Bar data={barData} options={chartOptions} />
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-white/40">
              No data available
            </div>
          )}
        </div>

        {/* Category Pie Chart */}
        <div className="glass-card p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">Category Distribution</h3>
            <p className="text-xs text-white/40 mt-1">Try-ons by category</p>
          </div>
          {catStats.length > 0 ? (
            <div className="flex justify-center h-80">
              <Pie data={pieData} options={pieChartOptions} />
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-white/40">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Daily Try-On Sessions Line Chart */}
      <div className="glass-card p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white">Try-On Sessions (30 Days)</h3>
          <p className="text-xs text-white/40 mt-1">Daily active try-on sessions</p>
        </div>
        {dailyData.length > 0 ? (
          <div className="h-96">
            <Line data={lineData} options={chartOptions} />
          </div>
        ) : (
          <div className="h-96 flex items-center justify-center text-white/40">
            No data available
          </div>
        )}
      </div>

      {/* Footer Statistics */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs text-white/50 uppercase tracking-wide">Avg. Try-ons/Day</p>
          <p className="text-2xl font-bold text-white mt-2">
            {dailyData.length > 0
              ? (dailyData.reduce((sum, d) => sum + (d.count || 0), 0) / dailyData.length).toFixed(1)
              : '0'}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-white/50 uppercase tracking-wide">Conversion Rate</p>
          <p className="text-2xl font-bold text-emerald-400 mt-2">
            {data.tryons?.conversion_rate ? `${data.tryons.conversion_rate.toFixed(1)}%` : 'N/A'}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-white/50 uppercase tracking-wide">Active Users (7d)</p>
          <p className="text-2xl font-bold text-blue-400 mt-2">{data.users?.active_this_week || 0}</p>
        </div>
      </div>
    </div>
  );
}
