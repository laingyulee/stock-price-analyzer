import React, { useState } from 'react';
import {
  Typography,
  TextField,
  Button,
  Box,
  Card,
  CardContent,
  Alert,
  CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import stockService from '../services/stockService';

function HomePage() {
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!symbol.trim()) {
      setError('请输入股票代码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await stockService.getStockData(symbol.toUpperCase());
      navigate(`/analysis/${symbol.toUpperCase()}`);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('未找到该股票代码，请检查后重试');
      } else {
        setError('获取股票数据失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const popularStocks = [
    { symbol: 'AAPL', name: '苹果公司' },
    { symbol: 'MSFT', name: '微软公司' },
    { symbol: 'GOOGL', name: '谷歌' },
    { symbol: 'TSLA', name: '特斯拉' },
    { symbol: 'AMZN', name: '亚马逊' }
  ];

  return (
    <Box sx={{ mt: 8, mb: 4 }}>
      <Typography
        component="h1"
        variant="h3"
        align="center"
        color="text.primary"
        gutterBottom
      >
        股票目标价分析器
      </Typography>

      <Typography variant="h5" align="center" color="text.secondary" paragraph>
        使用技术分析和算法预测股票目标价位
      </Typography>

      <Box component="form" onSubmit={handleSearch} sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 2, maxWidth: 600, mx: 'auto' }}>
          <TextField
            fullWidth
            label="股票代码"
            variant="outlined"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="例如: AAPL"
            disabled={loading}
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ minWidth: 120 }}
          >
            {loading ? <CircularProgress size={24} /> : '分析'}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
          {error}
        </Alert>
      )}

      <Typography variant="h6" align="center" color="text.primary" gutterBottom>
        热门股票
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
        {popularStocks.map((stock) => (
          <Card
            key={stock.symbol}
            sx={{ cursor: 'pointer', minWidth: 200, '&:hover': { elevation: 4 } }}
            onClick={() => navigate(`/analysis/${stock.symbol}`)}
          >
            <CardContent>
              <Typography variant="h6" component="div">
                {stock.symbol}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stock.name}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box sx={{ mt: 6, maxWidth: 800, mx: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          功能特色
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { md: '1fr 1fr' }, gap: 2 }}>
          <Card>
            <CardContent>
              <Typography variant="body1" component="div">
                🔧 技术指标分析
              </Typography>
              <Typography variant="body2" color="text.secondary">
                SMA、EMA、RSI、MACD、布林带等多种技术指标
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="body1" component="div">
                📊 智能目标价预测
              </Typography>
              <Typography variant="body2" color="text.secondary">
                基于多种算法的综合目标价预测
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="body1" component="div">
                📈 趋势分析
              </Typography>
              <Typography variant="body2" color="text.secondary">
                识别支撑位、阻力位和斐波那契回调位
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="body1" component="div">
                🎯 投资建议
              </Typography>
              <Typography variant="body2" color="text.secondary">
                提供买卖建议和置信度评估
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}

export default HomePage;