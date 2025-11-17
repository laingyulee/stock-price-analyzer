import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Tooltip,
  IconButton
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const indicatorDescriptions = {
  rsi: '相对强弱指数 (RSI) 衡量价格上涨与下跌的平均幅度，数值高于70通常视为超买，低于30视为超卖。',
  macd: '移动平均收敛背离 (MACD) 通过快慢指数移动平均线的差值来判断趋势强弱和方向。',
  bollinger: '布林带由中轨均线及上下标准差轨道组成，可辅助判断价格的波动区间与压力支撑。',
  sma: '简单移动平均线 (SMA) 是一段时间内的平均价格，用于平滑短期波动并观察趋势。',
  ema: '指数移动平均线 (EMA) 对近期价格赋予更高权重，使均线对最新行情更敏感。',
  adx: '平均趋向指数 (ADX) 衡量趋势强度，数值越高代表趋势越明显，通常25以上被视为强趋势。'
};

const TechnicalIndicatorsPanel = ({ indicators }) => {
  if (!indicators) {
    return <Typography color="text.secondary">暂无指标数据</Typography>;
  }

  const renderTitle = (label, descKey) => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {label}
      </Typography>
      {indicatorDescriptions[descKey] && (
        <Tooltip title={indicatorDescriptions[descKey]} arrow>
          <IconButton size="small" sx={{ ml: 1 }}>
            <InfoOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );

  const getLatestValue = (indicator) => {
    if (!indicator || !Array.isArray(indicator)) return null;
    return indicator[indicator.length - 1];
  };

  const getRSISignal = (rsi) => {
    if (rsi > 70) return { label: '超买', color: 'error' };
    if (rsi < 30) return { label: '超卖', color: 'success' };
    return { label: '正常', color: 'warning' };
  };

  const getMACDSignal = (macd) => {
    if (!macd || !Array.isArray(macd) || macd.length < 1) return { label: '未知', color: 'default' };
    const last = macd[macd.length - 1];
    if (last.MACD > last.signal) {
      return { label: '看涨', color: 'success' };
    } else {
      return { label: '看跌', color: 'error' };
    }
  };

  const latestRSI = getLatestValue(indicators.rsi);
  const latestMACD = getLatestValue(indicators.macd);
  const latestBollinger = getLatestValue(indicators.bollinger);
  const latestSMA20 = getLatestValue(indicators.sma20);
  const latestSMA50 = getLatestValue(indicators.sma50);
  const latestSMA200 = getLatestValue(indicators.sma200);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={4}>
        <Card variant="outlined">
          <CardContent>
            {renderTitle('RSI (14)', 'rsi')}
            {latestRSI !== null ? (
              <>
                <Typography variant="h6">
                  {latestRSI.toFixed(2)}
                </Typography>
                <Chip
                  label={getRSISignal(latestRSI).label}
                  color={getRSISignal(latestRSI).color}
                  size="small"
                />
                <LinearProgress
                  variant="determinate"
                  value={latestRSI}
                  sx={{ mt: 1 }}
                />
              </>
            ) : (
              <Typography color="text.secondary">数据加载中</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={4}>
        <Card variant="outlined">
          <CardContent>
            {renderTitle('MACD', 'macd')}
            {latestMACD ? (
              <>
                <Typography variant="body2">
                  MACD: {latestMACD.MACD?.toFixed(4)}
                </Typography>
                <Typography variant="body2">
                  Signal: {latestMACD.signal?.toFixed(4)}
                </Typography>
                <Typography variant="body2">
                  Histogram: {latestMACD.histogram?.toFixed(4)}
                </Typography>
                <Chip
                  label={getMACDSignal(indicators.macd).label}
                  color={getMACDSignal(indicators.macd).color}
                  size="small"
                  sx={{ mt: 1 }}
                />
              </>
            ) : (
              <Typography color="text.secondary">数据加载中</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={4}>
        <Card variant="outlined">
          <CardContent>
            {renderTitle('布林带 (20/2)', 'bollinger')}
            {latestBollinger ? (
              <>
                <Typography variant="body2">
                  上轨: ${latestBollinger.upperBand?.toFixed(2)}
                </Typography>
                <Typography variant="body2">
                  中轨: ${latestBollinger.middleBand?.toFixed(2)}
                </Typography>
                <Typography variant="body2">
                  下轨: ${latestBollinger.lowerBand?.toFixed(2)}
                </Typography>
              </>
            ) : (
              <Typography color="text.secondary">数据加载中</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={4}>
        <Card variant="outlined">
          <CardContent>
            {renderTitle('移动平均线', 'sma')}
            <Box sx={{ mb: 1 }}>
              <Typography variant="body2">
                SMA 20: ${latestSMA20?.toFixed(2)}
              </Typography>
            </Box>
            <Box sx={{ mb: 1 }}>
              <Typography variant="body2">
                SMA 50: ${latestSMA50?.toFixed(2)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2">
                SMA 200: ${latestSMA200?.toFixed(2)}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={4}>
        <Card variant="outlined">
          <CardContent>
            {renderTitle('EMA', 'ema')}
            <Box sx={{ mb: 1 }}>
              <Typography variant="body2">
                EMA 12: ${getLatestValue(indicators.ema12)?.toFixed(2)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2">
                EMA 26: ${getLatestValue(indicators.ema26)?.toFixed(2)}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={4}>
        <Card variant="outlined">
          <CardContent>
            {renderTitle('ADX', 'adx')}
            {indicators.adx && indicators.adx.length > 0 ? (
              <>
                <Typography variant="h6">
                  {indicators.adx[indicators.adx.length - 1].toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {indicators.adx[indicators.adx.length - 1] > 25 ? '趋势强劲' :
                   indicators.adx[indicators.adx.length - 1] > 20 ? '趋势中等' : '趋势较弱'}
                </Typography>
              </>
            ) : (
              <Typography color="text.secondary">数据加载中</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default TechnicalIndicatorsPanel;