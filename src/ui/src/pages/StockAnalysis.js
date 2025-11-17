import React, { useState, useEffect, useCallback } from 'react';
import {
  useParams,
  useNavigate
} from 'react-router-dom';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Tooltip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import StockChart from '../components/StockChart';
import TechnicalIndicatorsPanel from '../components/TechnicalIndicatorsPanel';
import AnalysisResultsPanel from '../components/AnalysisResultsPanel';
import LlmAnalysisPanel from '../components/LlmAnalysisPanel';
import stockService from '../services/stockService';

function StockAnalysis() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [stockData, setStockData] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFullCompanyInfo, setShowFullCompanyInfo] = useState(false);
  const [llmAnalysis, setLlmAnalysis] = useState(null);
  const [isLlmLoading, setIsLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch all data in parallel
      const [stock, analysis, llm] = await Promise.all([
        stockService.getStockData(symbol),
        stockService.getStockAnalysis(symbol),
        stockService.getLlmAnalysis(symbol)
      ]);

      setStockData(stock);
      setAnalysisData(analysis);
      setLlmAnalysis(llm);

    } catch (err) {
      if (err.response?.status === 404 || (err.message && err.message.includes('local database'))) {
        setError('未找到该股票的本地数据，请点击刷新按钮从远程获取。');
      } else {
        setError(err.response?.data?.error || '获取数据失败');
      }
    } finally {
      setLoading(false);
    }
  }, [symbol]);
  
  const handleExportPrompt = async () => {
    try {
      const promptData = await stockService.getLlmPrompt(symbol);
      if (promptData && promptData.prompt) {
        // Create a markdown content with the prompt
        const markdownContent = `${promptData.prompt}\n`;
        
        // Create a Blob with the markdown content
        const blob = new Blob([markdownContent], { type: 'text/markdown' });
        
        // Create a download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${symbol}_llm_prompt.md`;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('导出Prompt失败:', err);
      alert('导出Prompt失败: ' + (err.response?.data?.error || '未知错误'));
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError('');
    try {
      // 触发后端从远程API刷新数据
      await stockService.refreshStockData(symbol);
      // 重新加载数据（此时会从已更新的本地数据库获取）
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || '刷新数据失败');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefreshLlmAnalysis = async () => {
    setIsLlmLoading(true);
    setLlmError('');
    try {
      const result = await stockService.refreshLlmAnalysis(symbol);
      setLlmAnalysis(result);
    } catch (err) {
      setLlmError(err.response?.data?.error || '生成智能分析失败');
    } finally {
      setIsLlmLoading(false);
    }
  };

  const getRecommendationColor = (recommendation) => {
    switch (recommendation?.action) {
      case 'STRONG_BUY':
      case 'BUY':
        return 'success';
      case 'STRONG_SELL':
      case 'SELL':
        return 'error';
      default:
        return 'warning';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !stockData) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          sx={{ mb: 2 }}
        >
          返回首页
        </Button>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          startIcon={refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? '刷新中...' : '刷新数据'}
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/')}
          >
            返回主页
          </Button>
          <Typography variant="h4" component="h1">
            {symbol} - {stockData?.overview?.name || '股票分析'}
          </Typography>
          {analysisData?.recommendation && (
            <Chip
              label={analysisData.recommendation.action.replace('_', ' ')}
              color={getRecommendationColor(analysisData.recommendation)}
              variant="outlined"
              size="medium"
            />
          )}
        </Box>
        <Button
          variant="outlined"
          startIcon={refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? '刷新中...' : '刷新数据'}
        </Button>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {(stockData?.currentPrice || analysisData) && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography color="text.secondary" gutterBottom>
                  当前价格
                </Typography>
                <Typography variant="h5">
                  ${(analysisData?.currentPrice || stockData?.currentPrice?.price).toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography color="text.secondary" gutterBottom>
                  今日涨跌
                </Typography>
                <Typography
                  variant="h5"
                  color={(analysisData?.priceChange || stockData?.currentPrice?.change) >= 0 ? 'success.main' : 'error.main'}
                >
                  {(analysisData?.priceChange || stockData?.currentPrice?.change) >= 0 ? '+' : ''}
                  {(analysisData?.priceChange || stockData?.currentPrice?.change).toFixed(2)}
                  ({(analysisData?.priceChangePercent || stockData?.currentPrice?.changePercent).toFixed(2)}%)
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography color="text.secondary" gutterBottom>
                  成交量
                </Typography>
                <Typography variant="h6">
                  {((analysisData?.volume || stockData?.currentPrice?.volume) / 1000000).toFixed(2)}M
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography color="text.secondary" gutterBottom>
                  最后更新
                </Typography>
                <Typography variant="body2">
                  {stockData?.lastUpdated || analysisData?.analysisDate}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                股价走势图
              </Typography>
              {stockData?.historicalData ? (
                <StockChart data={stockData.historicalData} />
              ) : (
                <Typography color="text.secondary">
                  暂无历史数据
                </Typography>
              )}
            </CardContent>
          </Card>

          {analysisData && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  技术指标分析
                </Typography>
                <TechnicalIndicatorsPanel indicators={analysisData.technicalIndicators} />
              </CardContent>
            </Card>
          )}

          {stockData?.overview && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    公司信息
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography color="text.secondary" gutterBottom>
                    {stockData.overview.sector} - {stockData.overview.industry}
                  </Typography>

                  <Grid item xs={12}>
                    {stockData.overview.address1 && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>地址:</strong> {stockData.overview.address1}, {stockData.overview.city}, {stockData.overview.state} {stockData.overview.zip}, {stockData.overview.country}
                      </Typography>
                    )}
                    {stockData.overview.phone && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>电话:</strong> {stockData.overview.phone}
                      </Typography>
                    )}
                    {stockData.overview.website && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>网站:</strong> <a href={stockData.overview.website} target="_blank" rel="noopener noreferrer">{stockData.overview.website}</a>
                      </Typography>
                    )}
                    {stockData.overview.fullTimeEmployees && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>全职员工:</strong> {stockData.overview.fullTimeEmployees?.toLocaleString()}
                      </Typography>
                    )}
                  </Grid>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  {showFullCompanyInfo && (
                    <>
                      <Grid container spacing={2}>
                        
                        <Grid item xs={12}>
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            <strong>公司描述:</strong> {stockData.overview.description}
                          </Typography>
                        </Grid>
                        
                        {stockData.overview.companyOfficers && stockData.overview.companyOfficers.length > 0 && (
                          <Grid item xs={12}>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="h7" gutterBottom sx={{ fontWeight: 'bold' }}>
                              高管信息
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
                              {stockData.overview.companyOfficers.slice(0, 5).map((officer, index) => (
                                <Box key={index} sx={{ 
                                  flex: '1 1 300px', 
                                  padding: 1, 
                                  border: '1px solid #e0e0e0', 
                                  borderRadius: 1,
                                  backgroundColor: '#fafafa'
                                }}>
                                  <Typography variant="body2">
                                    <strong>姓名:</strong> {officer.name}
                                  </Typography>
                                  <Typography variant="body2">
                                    <strong>职位:</strong> {officer.title}
                                  </Typography>
                                  {officer.age && (
                                    <Typography variant="body2">
                                      <strong>年龄:</strong> {officer.age}
                                    </Typography>
                                  )}
                                  {officer.totalPay && (
                                    <Typography variant="body2">
                                      <strong>薪酬:</strong> ${(officer.totalPay / 1000000).toFixed(2)}M
                                    </Typography>
                                  )}
                                </Box>
                              ))}
                            </Box>
                          </Grid>
                        )}
                      </Grid>
                    </>
                  )}
                </Box>
                <Button 
                  size="small" 
                  onClick={() => setShowFullCompanyInfo(!showFullCompanyInfo)}
                  variant="outlined"
                >
                  {showFullCompanyInfo ? '收起详细信息' : '查看详细信息'}
                </Button>
              </CardContent>
            </Card>
          )}

          <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h3">
                  智能分析
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="导出Prompt">
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={handleExportPrompt}
                      startIcon={<ContentCopyIcon />}
                    >
                      导出Prompt
                    </Button>
                  </Tooltip>
                  {llmAnalysis && !isLlmLoading && (
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={handleRefreshLlmAnalysis}
                      startIcon={<RefreshIcon />}
                      disabled={isLlmLoading}
                    >
                      重新分析
                    </Button>
                  )}
                </Box>
              </Box>

              {isLlmLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                  <CircularProgress />
                </Box>
              )}
              {llmError && !isLlmLoading && <Alert severity="error" sx={{ mb: 2 }}>{llmError}</Alert>}
              
              {llmAnalysis && !isLlmLoading && (
                <LlmAnalysisPanel
                  analysis={llmAnalysis.analysis_text}
                  generatedAt={llmAnalysis.generated_at}
                />
              )}

              {!llmAnalysis && !isLlmLoading && !llmError && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleRefreshLlmAnalysis}
                    startIcon={isLlmLoading ? <CircularProgress size={20} /> : null}
                    disabled={isLlmLoading}
                  >
                    {isLlmLoading ? '生成中...' : '生成智能分析'}
                  </Button>
                </Box>
              )}
            </CardContent>
        </Grid>

        <Grid item xs={12} lg={4}>
          {analysisData && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  分析结果
                </Typography>
                <AnalysisResultsPanel analysis={analysisData} />
              </CardContent>
            </Card>
          )}
          
                    {stockData?.overview && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  财务指标
                </Typography>
                
                {/* 估值指标 */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
                    估值指标
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>市值:</strong> ${(stockData.overview.marketCap / 1000000000).toFixed(2)}B
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>市盈率:</strong> {stockData.overview.peRatio ? stockData.overview.peRatio.toFixed(2) : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>PB比率:</strong> {stockData.overview.pbRatio ? stockData.overview.pbRatio.toFixed(2) : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>市销率:</strong> {stockData.overview.priceToSalesTrailing12Months ? stockData.overview.priceToSalesTrailing12Months.toFixed(2) : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>每股账面价值:</strong> {stockData.overview.bookValue ? `${stockData.overview.bookValue.toFixed(2)}` : 'N/A'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                {/* 盈利能力指标 */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
                    盈利能力
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>EPS:</strong> {stockData.overview.eps || 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>股息率:</strong> {stockData.overview.dividendRate ? `${stockData.overview.dividendRate * 1}%` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>净资产收益率:</strong> {stockData.overview.returnOnEquity ? `${(stockData.overview.returnOnEquity * 100).toFixed(2)}%` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>资产回报率:</strong> {stockData.overview.returnOnAssets ? `${(stockData.overview.returnOnAssets * 100).toFixed(2)}%` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>毛利率:</strong> {stockData.overview.grossMargins ? `${(stockData.overview.grossMargins * 100).toFixed(2)}%` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>运营利润率:</strong> {stockData.overview.operatingMargins ? `${(stockData.overview.operatingMargins * 100).toFixed(2)}%` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>EBITDA利润率:</strong> {stockData.overview.ebitdaMargins ? `${(stockData.overview.ebitdaMargins * 100).toFixed(2)}%` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>利润率:</strong> {stockData.overview.profitMargins ? `${(stockData.overview.profitMargins * 100).toFixed(2)}%` : 'N/A'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                {/* 价格技术指标 */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
                    价格技术指标
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>52周最高:</strong> ${stockData.overview.week52High ? stockData.overview.week52High.toFixed(2) : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>52周最低:</strong> ${stockData.overview.week52Low ? stockData.overview.week52Low.toFixed(2) : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>50日均价:</strong> {stockData.overview.fiftyDayAverage ? `${stockData.overview.fiftyDayAverage.toFixed(2)}` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>200日均价:</strong> {stockData.overview.twoHundredDayAverage ? `${stockData.overview.twoHundredDayAverage.toFixed(2)}` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>Beta系数:</strong> {stockData.overview.beta ? stockData.overview.beta.toFixed(2) : 'N/A'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                {/* 运营与财务健康指标 */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
                    运营与财务健康
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>流通股:</strong> {stockData.overview.shares_outstanding ? `${(stockData.overview.shares_outstanding / 1000000).toFixed(2)}M` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>平均成交量(10日):</strong> {stockData.overview.averageDailyVolume10Day ? `${(stockData.overview.averageDailyVolume10Day / 1000000).toFixed(2)}M` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>总收入:</strong> {stockData.overview.totalRevenue ? `${(stockData.overview.totalRevenue / 1000000000).toFixed(2)}B` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>净利润:</strong> {stockData.overview.netIncomeToCommon ? `${(stockData.overview.netIncomeToCommon / 1000000000).toFixed(2)}B` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>毛利润:</strong> {stockData.overview.grossProfits ? `${(stockData.overview.grossProfits / 1000000000).toFixed(2)}B` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>EBITDA:</strong> {stockData.overview.ebitda ? `${(stockData.overview.ebitda / 1000000000).toFixed(2)}B` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>债务权益比:</strong> {stockData.overview.debtToEquity ? `${(stockData.overview.debtToEquity).toFixed(2)}` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>企业价值:</strong> {stockData.overview.enterpriseValue ? `${(stockData.overview.enterpriseValue / 1000000000).toFixed(2)}B` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>企收比:</strong> {stockData.overview.enterpriseToRevenue ? stockData.overview.enterpriseToRevenue.toFixed(2) : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>企业价值倍数:</strong> {stockData.overview.enterpriseToEbitda ? stockData.overview.enterpriseToEbitda.toFixed(2) : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>总现金:</strong> {stockData.overview.totalCash ? `${(stockData.overview.totalCash / 1000000000).toFixed(2)}B` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>总债务:</strong> {stockData.overview.totalDebt ? `${(stockData.overview.totalDebt / 1000000000).toFixed(2)}B` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>速动比率:</strong> {stockData.overview.quickRatio ? stockData.overview.quickRatio.toFixed(2) : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>流动比率:</strong> {stockData.overview.currentRatio ? stockData.overview.currentRatio.toFixed(2) : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>自由现金流:</strong> {stockData.overview.freeCashflow ? `${(stockData.overview.freeCashflow / 1000000000).toFixed(2)}B` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>经营现金流:</strong> {stockData.overview.operatingCashflow ? `${(stockData.overview.operatingCashflow / 1000000000).toFixed(2)}B` : 'N/A'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                {/* 增长指标 */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
                    增长指标
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>盈利增长:</strong> {stockData.overview.earningsGrowth ? `${(stockData.overview.earningsGrowth * 100).toFixed(2)}%` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>收入增长:</strong> {stockData.overview.revenueGrowth ? `${(stockData.overview.revenueGrowth * 100).toFixed(2)}%` : 'N/A'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                {/* 股息指标 */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
                    股息指标
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>股息率:</strong> {stockData.overview.dividendRate ? `${stockData.overview.dividendRate.toFixed(2)}` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>派息率:</strong> {stockData.overview.payoutRatio ? `${(stockData.overview.payoutRatio * 100).toFixed(2)}%` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>5年平均股息率:</strong> {stockData.overview.fiveYearAvgDividendYield ? `${stockData.overview.fiveYearAvgDividendYield}%` : 'N/A'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
                
                
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

export default StockAnalysis;