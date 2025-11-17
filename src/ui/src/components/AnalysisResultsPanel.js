import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  Grid
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import InfoIcon from '@mui/icons-material/Info';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const getTrendText = (trend) => {
  const trendMap = {
    'strong_uptrend': '强势上涨',
    'uptrend': '上涨',
    'downtrend': '下跌',
    'strong_downtrend': '强势下跌',
    'neutral': '中性'
  };
  return trendMap[trend] || trend;
};

const getVolatilityText = (level) => {
  const volatilityMap = {
    'high': '高',
    'medium': '中等',
    'low': '低'
  };
  return volatilityMap[level] || level;
};

const AnalysisResultsPanel = ({ analysis }) => {
  if (!analysis) {
    return <Typography color="text.secondary">暂无分析数据</Typography>;
  }

  const getConfidenceColor = (level) => {
    switch (level) {
      case 'high': return 'success';
      case 'medium': return 'warning';
      case 'low': return 'error';
      default: return 'default';
    }
  };

  const getRecommendationIcon = (action) => {
    if (action.includes('BUY')) return <TrendingUpIcon />;
    if (action.includes('SELL')) return <TrendingDownIcon />;
    return <InfoIcon />;
  };

  const getRecommendationColor = (action) => {
    if (action.includes('BUY')) return 'success';
    if (action.includes('SELL')) return 'error';
    return 'warning';
  };

  const priceChange = ((analysis.targetPrice - analysis.currentPrice) / analysis.currentPrice * 100);

  const targetPriceExplanation = (
    <React.Fragment>
      <Typography variant="h6" gutterBottom>技术分析目标价</Typography>
      <Typography variant="body2" paragraph>
        目标价是综合多种技术分析模型，通过加权平均算法得出的一个预测性价格。它并非绝对的买卖点，而是当前市场趋势和技术指标下的一个中短期价格参考。
      </Typography>
      <Typography variant="body2" paragraph>
        主要参考以下几个模型：
      </Typography>
      <ul>
        <li><Typography variant="body2"><strong>布林带 (Bollinger Bands)</strong>: 将上轨和中轨作为潜在的价格目标。</Typography></li>
        <li><Typography variant="body2"><strong>斐波那契回调 (Fibonacci Retracement)</strong>: 根据当前趋势选取关键回调位作为目标。</Typography></li>
        <li><Typography variant="body2"><strong>支撑与阻力位 (Support/Resistance)</strong>: 将历史成交密集区形成的强支撑或阻力位作为价格目标。</Typography></li>
        <li><Typography variant="body2"><strong>移动平均线趋势 (Moving Average Trend)</strong>: 基于50日移动平均线的走势进行价格延伸预测。</Typography></li>
      </ul>
      <Typography variant="body2" paragraph>
        每个模型根据当前趋势的适配度被赋予不同权重，最终计算出一个加权平均值作为目标价。如果数据不足，目标价将参考当前市价。
      </Typography>
    </React.Fragment>
  );

  const analystPriceExplanation = (
    <React.Fragment>
      <Typography variant="h6" gutterBottom>分析师目标价</Typography>
      <Typography variant="body2" paragraph>
        分析师目标价是基于多家金融机构分析师的研究报告，综合计算得出的平均目标价格。该价格反映了专业分析师对未来一段时间内股票价格的预期。
      </Typography>
      <Typography variant="body2" paragraph>
        数据包括：
        <ul>
          <li><Typography variant="body2"><strong>平均目标价:</strong> {analysis.analystTargetPrice?.toFixed(2) || 'N/A'}</Typography></li>
          <li><Typography variant="body2"><strong>最高目标价:</strong> {analysis.analystTargetPriceHigh?.toFixed(2) || 'N/A'}</Typography></li>
          <li><Typography variant="body2"><strong>最低目标价:</strong> {analysis.analystTargetPriceLow?.toFixed(2) || 'N/A'}</Typography></li>
          <li><Typography variant="body2"><strong>中位数目标价:</strong> {analysis.analystTargetPriceMedian?.toFixed(2) || 'N/A'}</Typography></li>
        </ul>
      </Typography>
    </React.Fragment>
  );

  return (
    <Box>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Tooltip title={targetPriceExplanation} arrow>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  技术分析目标价
                </Typography>
                <InfoOutlinedIcon fontSize="inherit" sx={{ ml: 0.5 }} />
              </Box>
            </Tooltip>
          </Box>
          <Typography variant="h5" color="primary">
            ${analysis.targetPrice.toFixed(2)}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, mb: 2 }}>
            <Typography
              variant="body2"
              color={priceChange >= 0 ? 'success.main' : 'error.main'}
            >
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </Typography>
            <Chip
              label={analysis.recommendation.action.replace('_', ' ')}
              color={getRecommendationColor(analysis.recommendation.action)}
              size="small"
              icon={getRecommendationIcon(analysis.recommendation.action)}
              sx={{ ml: 1 }}
            />
          </Box>
          
          <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                置信度评分
              </Typography>
              <Chip
                label={analysis.confidenceScore >= 80 ? '高' :
                       analysis.confidenceScore >= 60 ? '中' : '低'}
                color={getConfidenceColor(analysis.confidenceScore >= 80 ? 'high' :
                                        analysis.confidenceScore >= 60 ? 'medium' : 'low')}
                size="small"
              />
            </Box>
            <Typography variant="h5" gutterBottom>
              {analysis.confidenceScore}/100
            </Typography>
            <LinearProgress
              variant="determinate"
              value={analysis.confidenceScore}
              sx={{ 
                height: 8, 
                borderRadius: 4,
                mt: 1,
                mb: 1,
                color: getConfidenceColor(analysis.confidenceScore >= 80 ? 'high' :
                                        analysis.confidenceScore >= 60 ? 'medium' : 'low')
              }}
            />
            <Typography variant="caption" color="text.secondary">
              评分基于技术指标一致性、趋势明确性和数据充足性等综合因素
            </Typography>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                预测区间
              </Typography>
            </Box>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Typography variant="body2">
                  最低: <strong>${analysis.priceRange.low.toFixed(2)}</strong>
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  最高: <strong>${analysis.priceRange.high.toFixed(2)}</strong>
                </Typography>
              </Grid>
            </Grid>
            
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                目标价在区间位置
              </Typography>
              <Box sx={{ position: 'relative', height: 8, bgcolor: 'grey.200', borderRadius: 1, overflow: 'hidden', mb: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={((analysis.targetPrice - analysis.priceRange.low) /
                           (analysis.priceRange.high - analysis.priceRange.low)) * 100}
                  sx={{ 
                    height: '100%',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: 'grey.500',
                    }
                  }}
                />
                <Box 
                  sx={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: `${((analysis.targetPrice - analysis.priceRange.low) /
                              (analysis.priceRange.high - analysis.priceRange.low)) * 100}%`,
                    width: 4,
                    height: '100%',
                    backgroundColor: 'primary.main',
                    zIndex: 1
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {analysis.targetPrice.toFixed(2)} / 区间: {analysis.priceRange.low.toFixed(2)} - {analysis.priceRange.high.toFixed(2)}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {analysis.analystTargetPrice && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                分析师目标价
              </Typography>
              <Tooltip title={analystPriceExplanation} arrow>
                <InfoOutlinedIcon fontSize="inherit" sx={{ ml: 0.5 }} />
              </Tooltip>
            </Box>
            <Typography variant="h5" color="primary">
              ${analysis.analystTargetPrice.toFixed(2)}
            </Typography>
            <Box sx={{ mt: 1 }}>
              {analysis.analystTargetPriceMedian && (
                <Typography variant="body2" color="text.secondary">
                  中位数: <strong>${analysis.analystTargetPriceMedian.toFixed(2)}</strong>
                </Typography>
              )}
              {analysis.analystTargetPriceHigh && analysis.analystTargetPriceLow && (
                <Typography variant="body2" color="text.secondary">
                  区间: ${analysis.analystTargetPriceLow.toFixed(2)} - ${analysis.analystTargetPriceHigh.toFixed(2)}
                </Typography>
              )}
            </Box>
            
            {analysis.analystTargetPriceHigh && analysis.analystTargetPriceLow && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  目标价在区间位置
                </Typography>
                <Box sx={{ position: 'relative', height: 8, bgcolor: 'grey.200', borderRadius: 1, overflow: 'hidden', mb: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={analysis.analystTargetPriceHigh !== analysis.analystTargetPriceLow ? 
                           ((analysis.analystTargetPrice - analysis.analystTargetPriceLow) /
                            (analysis.analystTargetPriceHigh - analysis.analystTargetPriceLow)) * 100 : 50}
                    sx={{ 
                      height: '100%',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: 'grey.500',
                      }
                    }}
                  />
                  <Box 
                    sx={{ 
                      position: 'absolute', 
                      top: 0, 
                      left: `${analysis.analystTargetPriceHigh !== analysis.analystTargetPriceLow ? 
                              ((analysis.analystTargetPrice - analysis.analystTargetPriceLow) /
                               (analysis.analystTargetPriceHigh - analysis.analystTargetPriceLow)) * 100 : 50}%`,
                      width: 4,
                      height: '100%',
                      backgroundColor: 'error.main',
                      zIndex: 1
                    }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {analysis.analystTargetPrice.toFixed(2)} / 区间: {analysis.analystTargetPriceLow.toFixed(2)} - {analysis.analystTargetPriceHigh.toFixed(2)}
                </Typography>
              </Box>
            )}
            
            {/* 分析师推荐 */}
            {(analysis.analystRecommendationKey || analysis.analystRecommendationMean || analysis.numberOfAnalystOpinions) && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  分析师推荐
                </Typography>
                
                {analysis.analystRecommendationKey && (
                  <Chip 
                    label={
                      analysis.analystRecommendationKey === 'strong_buy' ? '强烈买入' :
                      analysis.analystRecommendationKey === 'buy' ? '买入' :
                      analysis.analystRecommendationKey === 'hold' ? '持有' :
                      analysis.analystRecommendationKey === 'sell' ? '卖出' :
                      analysis.analystRecommendationKey === 'strong_sell' ? '强烈卖出' : 
                      analysis.analystRecommendationKey
                    }
                    color={
                      analysis.analystRecommendationKey === 'strong_buy' || 
                      analysis.analystRecommendationKey === 'buy' ? 'success' : 
                      analysis.analystRecommendationKey === 'sell' || 
                      analysis.analystRecommendationKey === 'strong_sell' ? 'error' : 'warning'
                    }
                    variant="outlined"
                    size="small"
                    sx={{ mr: 1, mb: 1 }}
                  />
                )}
                
                {analysis.analystRecommendationMean && (
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    推荐均值: {analysis.analystRecommendationMean.toFixed(2)}
                  </Typography>
                )}
                
                {analysis.numberOfAnalystOpinions && (
                  <Typography variant="caption" display="block">
                    分析师数量: {analysis.numberOfAnalystOpinions}
                  </Typography>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            投资建议
          </Typography>
          <Typography variant="h6" gutterBottom>
            {analysis.recommendation.action.replace('_', ' ')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {analysis.recommendation.reasoning}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Typography variant="body2" gutterBottom>
            预期收益率: {analysis.recommendation.expectedReturn.toFixed(2)}%
          </Typography>

          {analysis.calculations && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                分析因素
              </Typography>
              <List dense>
                {analysis.calculations.trends && (
                  <ListItem disablePadding>
                    <ListItemText
                      primary={`趋势: ${getTrendText(analysis.calculations.trends.trend)}`}
                      secondary="基于移动平均线分析"
                    />
                  </ListItem>
                )}
                {analysis.calculations.volatility && (
                  <ListItem disablePadding>
                    <ListItemText
                      primary={`波动性: ${getVolatilityText(analysis.calculations.volatility.currentLevel)}`}
                      secondary="年化波动率分析"
                    />
                  </ListItem>
                )}
                {analysis.breakdown && analysis.breakdown.length > 0 && (
                  <ListItem disablePadding>
                    <ListItemText
                      primary="多重指标综合"
                      secondary={`使用了 ${analysis.breakdown.length} 种分析方法`}
                    />
                  </ListItem>
                )}
              </List>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AnalysisResultsPanel;