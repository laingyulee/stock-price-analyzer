import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

const StockChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <div>暂无数据</div>;
  }

  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
    close: item.close,
    high: item.high,
    low: item.low,
    volume: item.volume / 1000000
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#fff',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: '0', fontWeight: 'bold' }}>{`日期: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: '4px 0', color: entry.color }}>
              {`${entry.name}: $${entry.value.toFixed(2)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <div style={{ height: '400px', marginBottom: '20px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              yAxisId="price"
              orientation="left"
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="close"
              stroke="#8884d8"
              strokeWidth={2}
              dot={false}
              name="收盘价"
            />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="high"
              stroke="#82ca9d"
              strokeWidth={1}
              dot={false}
              name="最高价"
            />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="low"
              stroke="#ffc658"
              strokeWidth={1}
              dot={false}
              name="最低价"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ height: '200px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              yAxisId="volume"
              orientation="right"
              label={{ value: '成交量 (百万)', angle: -90, position: 'insideRight' }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div style={{
                      backgroundColor: '#fff',
                      padding: '10px',
                      border: '1px solid #ccc',
                      borderRadius: '4px'
                    }}>
                      <p style={{ margin: '0', fontWeight: 'bold' }}>{`日期: ${label}`}</p>
                      <p style={{ margin: '4px 0' }}>
                        {`成交量: ${payload[0].value.toFixed(2)}M`}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              yAxisId="volume"
              dataKey="volume"
              fill="#8884d8"
              opacity={0.6}
              name="成交量"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
};

export default StockChart;