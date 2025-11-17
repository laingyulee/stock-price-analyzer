const technicalIndicators = require('technicalindicators');
const _ = require('lodash');
const stockAPI = require('../api/stockData');

const { EMA, RSI, MACD, BollingerBands } = technicalIndicators;

class PriceAnalyzer {
    constructor() {
        this.methods = ['SMA', 'EMA', 'RSI', 'MACD', 'Bollinger', 'Fibonacci', 'SupportResistance'];
    }

    async analyzeStock(symbol, database) {
        try {
            let stockData = await this.getStockDataFromDB(symbol, database);

            // Check if we have sufficient data for analysis
            if (!stockData || stockData.length === 0) {
                console.warn(`No cached data found for ${symbol}. Attempting to refresh from API.`);
                try {
                    await stockAPI.updateStockData(symbol, database);
                    stockData = await this.getStockDataFromDB(symbol, database);
                } catch (refreshError) {
                    console.error(`Failed to refresh data for ${symbol}:`, refreshError.message);
                }
            }

            if (!stockData || stockData.length === 0) {
                throw new Error('No data available for analysis');
            }

            // Get real-time price data from latest_prices table
            let realTimePrice = null;
            try {
                realTimePrice = await stockAPI.getLatestPriceFromDB(symbol, database);
            } catch (priceError) {
                console.warn(`Failed to fetch real-time price from database for ${symbol}:`, priceError.message);
                // Fallback to last historical price
                realTimePrice = {
                    price: stockData[stockData.length - 1].close,
                    change: 0,
                    changePercent: 0,
                    volume: 0
                };
            }

            // If we have very limited data (less than 50 points), provide a warning but continue
            if (stockData.length < 50) {
                console.warn('Limited data available for analysis. Results may be less accurate.');
            }

            const calculations = {
                technical: stockData.length >= 50 ? await this.calculateTechnicalIndicators(stockData) : null,
                fibonacci: stockData.length >= 50 ? this.calculateFibonacciLevels(stockData) : null,
                supportResistance: stockData.length >= 50 ? this.findSupportResistanceLevels(stockData) : { support: [], resistance: [] },
                trends: stockData.length >= 200 ? this.analyzeTrends(stockData) : { trend: 'neutral', movingAverages: null },
                volatility: stockData.length >= 20 ? this.calculateVolatility(stockData) : { standardDeviation: 0, annualizedVolatility: 0, currentLevel: 'low' }
            };

            const targetPrice = this.calculateTargetPrice(calculations, stockData);
            const confidence = this.calculateConfidenceScore(calculations, stockData);

            // 获取分析师目标价和推荐信息
            let analystData = {};
            try {
                // 直接从API获取分析师信息
                const overview = await stockAPI.getCompanyOverview(symbol);
                if (overview) {
                    analystData = {
                        analystTargetPrice: overview.targetMeanPrice,
                        analystTargetPriceHigh: overview.targetHighPrice,
                        analystTargetPriceLow: overview.targetLowPrice,
                        analystTargetPriceMedian: overview.targetMedianPrice,
                        analystRecommendationKey: overview.recommendationKey,
                        analystRecommendationMean: overview.recommendationMean,
                        numberOfAnalystOpinions: overview.numberOfAnalystOpinions
                    };
                }
            } catch (analystError) {
                console.warn(`Could not fetch analyst data for ${symbol}:`, analystError.message);
            }

            const analysis = {
                symbol,
                analysisDate: new Date().toISOString().split('T')[0],
                currentPrice: realTimePrice.price,
                priceChange: realTimePrice.change,
                priceChangePercent: realTimePrice.changePercent,
                volume: realTimePrice.volume,
                targetPrice: targetPrice.price,
                confidenceScore: confidence.score,
                analysisMethod: targetPrice.method,
                priceRange: {
                    low: targetPrice.rangeLow,
                    high: targetPrice.rangeHigh
                },
                technicalIndicators: calculations.technical,
                calculations: calculations,
                recommendation: this.getRecommendation(targetPrice.price, realTimePrice.price, confidence.score),
                ...analystData
            };

            await this.saveAnalysisToDatabase(analysis, database);
            return analysis;
        } catch (error) {
            console.error('Error analyzing stock:', error.message);
            throw error;
        }
    }

    async getStockDataFromDB(symbol, database) {
        return new Promise((resolve, reject) => {
            const db = database;
            const query = `
                SELECT date, open_price, high_price, low_price, close_price, volume
                FROM daily_prices
                WHERE stock_symbol = ?
                ORDER BY date ASC
                LIMIT 200
            `;

            db.all(query, [symbol], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                const formattedData = rows.map(row => ({
                    date: row.date,
                    open: row.open_price,
                    high: row.high_price,
                    low: row.low_price,
                    close: row.close_price,
                    volume: row.volume
                }));

                resolve(formattedData);
            });
        });
    }

    async calculateTechnicalIndicators(stockData) {
        // Check if we have sufficient data
        if (!stockData || stockData.length < 20) {
            return null;
        }

        const closes = stockData.map(d => d.close);
        const highs = stockData.map(d => d.high);
        const lows = stockData.map(d => d.low);

        try {
            return {
                sma20: stockData.length >= 20 ? this.calculateSMA(closes, 20) : null,
                sma50: stockData.length >= 50 ? this.calculateSMA(closes, 50) : null,
                sma200: stockData.length >= 200 ? this.calculateSMA(closes, 200) : null,
                ema12: stockData.length >= 12 && EMA ? EMA.calculate({ period: 12, values: closes }) : null,
                ema26: stockData.length >= 26 && EMA ? EMA.calculate({ period: 26, values: closes }) : null,
                rsi: stockData.length >= 14 && RSI ? RSI.calculate({ period: 14, values: closes }) : null,
                macd: stockData.length >= 26 && MACD ? MACD.calculate({
                    fastPeriod: 12,
                    slowPeriod: 26,
                    signalPeriod: 9,
                    values: closes
                }) : null,
                bollinger: stockData.length >= 20 && BollingerBands
                    ? BollingerBands.calculate({
                        period: 20,
                        stdDev: 2,
                        values: closes
                    }).map(entry => ({
                        upperBand: entry.upper,
                        middleBand: entry.middle,
                        lowerBand: entry.lower,
                        pb: entry.pb
                    }))
                    : null,
                adx: stockData.length >= 14 ? this.calculateADX(highs, lows, closes) : null
            };
        } catch (error) {
            console.error('Error calculating technical indicators:', error.message);
            return null;
        }
    }

    calculateSMA(data, period) {
        const result = [];
        for (let i = period - 1; i < data.length; i++) {
            const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            result.push(sum / period);
        }
        return result;
    }

    calculateADX(highs, lows, closes, period = 14) {
        const trueRange = [];
        const plusDM = [];
        const minusDM = [];

        for (let i = 1; i < highs.length; i++) {
            const tr1 = Math.abs(highs[i] - lows[i]);
            const tr2 = Math.abs(highs[i] - closes[i - 1]);
            const tr3 = Math.abs(lows[i] - closes[i - 1]);
            trueRange.push(Math.max(tr1, tr2, tr3));

            const upMove = highs[i] - highs[i - 1];
            const downMove = lows[i - 1] - lows[i];

            if (upMove > downMove && upMove > 0) {
                plusDM.push(upMove);
            } else {
                plusDM.push(0);
            }

            if (downMove > upMove && downMove > 0) {
                minusDM.push(downMove);
            } else {
                minusDM.push(0);
            }
        }

        const atr = this.calculateSMA(trueRange, period);
        const plusDI = this.calculateSMA(plusDM, period).map((dm, i) => (dm * 100) / atr[i]);
        const minusDI = this.calculateSMA(minusDM, period).map((dm, i) => (dm * 100) / atr[i]);

        const dx = plusDI.map((plus, i) => Math.abs(plus - minusDI[i]) / (plus + minusDI[i]) * 100);
        return this.calculateSMA(dx, period);
    }

    calculateFibonacciLevels(stockData) {
        // Handle empty or insufficient data
        if (!stockData || stockData.length < 2) {
            return {
                high: 0,
                low: 0,
                levels: {
                    '0%': 0,
                    '23.6%': 0,
                    '38.2%': 0,
                    '50%': 0,
                    '61.8%': 0,
                    '100%': 0
                }
            };
        }

        const prices = stockData.map(d => d.close);
        const high = Math.max(...prices);
        const low = Math.min(...prices);
        const diff = high - low;

        return {
            high: high,
            low: low,
            levels: {
                '0%': high,
                '23.6%': high - (diff * 0.236),
                '38.2%': high - (diff * 0.382),
                '50%': high - (diff * 0.5),
                '61.8%': high - (diff * 0.618),
                '100%': low
            }
        };
    }

    findSupportResistanceLevels(stockData) {
        // Handle empty or insufficient data
        if (!stockData || stockData.length < 5) {
            return {
                support: [],
                resistance: []
            };
        }

        const closes = stockData.map(d => d.close);
        const highs = stockData.map(d => d.high);
        const lows = stockData.map(d => d.low);

        const supportLevels = this.findLevels(lows, 2);
        const resistanceLevels = this.findLevels(highs, 2);

        return {
            support: supportLevels,
            resistance: resistanceLevels
        };
    }

    findLevels(data, minTouches) {
        // Handle empty or insufficient data
        if (!data || data.length < 5) {
            return [];
        }

        const levels = [];
        const tolerance = 0.02;

        for (let i = 2; i < data.length - 2; i++) {
            const current = data[i];

            let isLevel = true;
            if (i > 0 && current > data[i - 1] * (1 + tolerance)) isLevel = false;
            if (i < data.length - 1 && current > data[i + 1] * (1 + tolerance)) isLevel = false;

            if (isLevel) {
                let touches = 1;
                for (let j = 0; j < data.length; j++) {
                    if (i !== j && Math.abs(data[j] - current) < current * tolerance) {
                        touches++;
                    }
                }

                if (touches >= minTouches) {
                    levels.push({ price: current, touches, index: i });
                }
            }
        }

        return levels.sort((a, b) => b.touches - a.touches).slice(0, 5);
    }

    analyzeTrends(stockData) {
        // Check if we have sufficient data for trend analysis
        if (!stockData || stockData.length < 200) {
            return { trend: 'neutral', movingAverages: null };
        }

        const closes = stockData.map(d => d.close);
        
        // Check if we have sufficient data for each moving average
        const sma20 = this.calculateSMA(closes, 20);
        const sma50 = this.calculateSMA(closes, 50);
        const sma200 = this.calculateSMA(closes, 200);
        
        if (sma20.length === 0 || sma50.length === 0 || sma200.length === 0) {
            return { trend: 'neutral', movingAverages: null };
        }

        const movingAverages = {
            short: sma20[sma20.length - 1],
            medium: sma50[sma50.length - 1],
            long: sma200[sma200.length - 1]
        };

        const currentPrice = closes[closes.length - 1];

        let trend = 'neutral';
        if (currentPrice > movingAverages.short && movingAverages.short > movingAverages.medium && movingAverages.medium > movingAverages.long) {
            trend = 'strong_uptrend';
        } else if (currentPrice > movingAverages.short && movingAverages.short > movingAverages.medium) {
            trend = 'uptrend';
        } else if (currentPrice < movingAverages.short && movingAverages.short < movingAverages.medium && movingAverages.medium < movingAverages.long) {
            trend = 'strong_downtrend';
        } else if (currentPrice < movingAverages.short && movingAverages.short < movingAverages.medium) {
            trend = 'downtrend';
        }

        return { trend, movingAverages };
    }

    calculateVolatility(stockData, period = 20) {
        // Handle empty or insufficient data
        if (!stockData || stockData.length < 2) {
            return {
                standardDeviation: 0,
                annualizedVolatility: 0,
                currentLevel: 'low'
            };
        }

        // Use available data if less than requested period
        const actualPeriod = Math.min(period, stockData.length);
        const closes = stockData.slice(-actualPeriod).map(d => d.close);
        
        // Need at least 2 data points to calculate returns
        if (closes.length < 2) {
            return {
                standardDeviation: 0,
                annualizedVolatility: 0,
                currentLevel: 'low'
            };
        }

        const returns = [];

        for (let i = 1; i < closes.length; i++) {
            returns.push(Math.log(closes[i] / closes[i - 1]));
        }

        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
        const volatility = Math.sqrt(variance) * Math.sqrt(252);

        return {
            standardDeviation: Math.sqrt(variance),
            annualizedVolatility: volatility,
            currentLevel: volatility > 0.25 ? 'high' : volatility > 0.15 ? 'medium' : 'low'
        };
    }

    calculateTargetPrice(calculations, stockData) {
        const currentPrice = stockData[stockData.length - 1].close;
        const { technical, fibonacci, supportResistance, trends, volatility } = calculations;

        let targetPrice = currentPrice;
        let method = 'weighted_average';
        let weights = [];

        const priceTargets = [];

        if (technical && technical.bollinger && technical.bollinger.length > 0) {
            const bb = technical.bollinger[technical.bollinger.length - 1];
            if (bb.upperBand) priceTargets.push({ price: bb.upperBand, weight: 0.15, source: 'bollinger_upper' });
            if (bb.middleBand) priceTargets.push({ price: bb.middleBand, weight: 0.10, source: 'bollinger_middle' });
        }

        if (fibonacci && trends && trends.trend.includes('uptrend')) {
            if (fibonacci.levels && fibonacci.levels['61.8%']) {
                priceTargets.push({ price: fibonacci.levels['61.8%'], weight: 0.20, source: 'fibonacci_up' });
            }
        } else if (fibonacci && trends && trends.trend.includes('downtrend')) {
            if (fibonacci.levels && fibonacci.levels['38.2%']) {
                priceTargets.push({ price: fibonacci.levels['38.2%'], weight: 0.20, source: 'fibonacci_down' });
            }
        }

        if (supportResistance && supportResistance.resistance && supportResistance.resistance.length > 0 && trends && trends.trend.includes('uptrend')) {
            const nearestResistance = supportResistance.resistance[0];
            if (nearestResistance && nearestResistance.price) {
                priceTargets.push({ price: nearestResistance.price, weight: 0.15, source: 'resistance' });
            }
        }

        if (supportResistance && supportResistance.support && supportResistance.support.length > 0 && trends && trends.trend.includes('downtrend')) {
            const nearestSupport = supportResistance.support[0];
            if (nearestSupport && nearestSupport.price) {
                priceTargets.push({ price: nearestSupport.price, weight: 0.15, source: 'support' });
            }
        }

        if (trends && trends.movingAverages) {
            if (trends.trend.includes('uptrend') && trends.movingAverages.medium) {
                priceTargets.push({ price: trends.movingAverages.medium * 1.05, weight: 0.15, source: 'ma_projection_up' });
            } else if (trends.trend.includes('downtrend') && trends.movingAverages.medium) {
                priceTargets.push({ price: trends.movingAverages.medium * 0.95, weight: 0.15, source: 'ma_projection_down' });
            }
        }

        // If we have no price targets from technical analysis, use a simple approach based on current price
        if (priceTargets.length === 0) {
            // For limited data, return current price as target with wider range
            const rangeAdjustment = (volatility && volatility.annualizedVolatility) ? 
                volatility.annualizedVolatility * currentPrice * 0.5 : currentPrice * 0.1;
            return {
                price: currentPrice,
                method: 'current_price',
                rangeLow: currentPrice - rangeAdjustment,
                rangeHigh: currentPrice + rangeAdjustment,
                breakdown: []
            };
        }

        const totalWeight = priceTargets.reduce((sum, target) => sum + target.weight, 0);

        if (totalWeight > 0) {
            targetPrice = priceTargets.reduce((sum, target) => sum + target.price * target.weight, 0) / totalWeight;
        }

        const rangeAdjustment = (volatility && volatility.annualizedVolatility) ? 
            volatility.annualizedVolatility * targetPrice * 0.5 : targetPrice * 0.1;

        return {
            price: targetPrice,
            method: method,
            rangeLow: targetPrice - rangeAdjustment,
            rangeHigh: targetPrice + rangeAdjustment,
            breakdown: priceTargets
        };
    }

    calculateConfidenceScore(calculations, stockData) {
        let score = 50;

        // Adjust score based on available data
        if (calculations.technical && calculations.technical.rsi && calculations.technical.rsi.length > 0) {
            const rsi = calculations.technical.rsi[calculations.technical.rsi.length - 1];
            if (rsi >= 30 && rsi <= 70) {
                score += 10;
            }
        } else {
            // Reduce score if RSI is not available
            score -= 10;
        }

        if (calculations.trends && calculations.trends.trend && calculations.trends.trend !== 'neutral') {
            score += 15;
        } else {
            // Reduce score if trend analysis is not available
            score -= 15;
        }

        if (calculations.volatility && calculations.volatility.currentLevel) {
            if (calculations.volatility.currentLevel === 'low') {
                score += 10;
            } else if (calculations.volatility.currentLevel === 'medium') {
                score += 5;
            }
        } else {
            // Reduce score if volatility analysis is not available
            score -= 10;
        }

        if (calculations.supportResistance &&
           (calculations.supportResistance.support.length >= 2 || calculations.supportResistance.resistance.length >= 2)) {
            score += 10;
        } else {
            // Reduce score if support/resistance analysis is not available
            score -= 10;
        }

        // Adjust score based on data quantity
        if (stockData.length >= 200) {
            score += 15;
        } else if (stockData.length >= 100) {
            score += 5;
        } else if (stockData.length >= 50) {
            // No change for 50-99 data points
        } else if (stockData.length > 0) {
            // Reduce score for limited data
            score -= 20;
        } else {
            // No data available
            score = 0;
        }

        return {
            score: Math.min(100, Math.max(0, score)),
            level: score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low'
        };
    }

    getRecommendation(targetPrice, currentPrice, confidenceScore) {
        const priceChange = (targetPrice - currentPrice) / currentPrice * 100;

        let recommendation = 'HOLD';
        let reasoning = 'Target price close to current price';

        if (priceChange > 10 && confidenceScore >= 60) {
            recommendation = 'BUY';
            reasoning = `Target price indicates ${priceChange.toFixed(1)}% upside potential`;
        } else if (priceChange > 20 && confidenceScore >= 40) {
            recommendation = 'STRONG BUY';
            reasoning = `Strong upside potential of ${priceChange.toFixed(1)}%`;
        } else if (priceChange < -10 && confidenceScore >= 60) {
            recommendation = 'SELL';
            reasoning = `Target price indicates ${Math.abs(priceChange).toFixed(1)}% downside risk`;
        } else if (priceChange < -20 && confidenceScore >= 40) {
            recommendation = 'STRONG SELL';
            reasoning = `Significant downside risk of ${Math.abs(priceChange).toFixed(1)}%`;
        }

        return {
            action: recommendation,
            reasoning,
            expectedReturn: priceChange
        };
    }

    async saveAnalysisToDatabase(analysis, database) {
        return new Promise((resolve, reject) => {
            const db = database;
            const query = `
                INSERT INTO price_analysis
                (stock_symbol, analysis_date, target_price, confidence_score, analysis_method,
                 price_range_low, price_range_high, technical_indicators, current_price, price_change, price_change_percent, volume)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(stock_symbol) DO UPDATE SET
                    analysis_date = excluded.analysis_date,
                    target_price = excluded.target_price,
                    confidence_score = excluded.confidence_score,
                    analysis_method = excluded.analysis_method,
                    price_range_low = excluded.price_range_low,
                    price_range_high = excluded.price_range_high,
                    technical_indicators = excluded.technical_indicators,
                    current_price = excluded.current_price,
                    price_change = excluded.price_change,
                    price_change_percent = excluded.price_change_percent,
                    volume = excluded.volume
            `;

            db.run(query, [
                analysis.symbol,
                analysis.analysisDate,
                analysis.targetPrice,
                analysis.confidenceScore,
                analysis.analysisMethod,
                analysis.priceRange.low,
                analysis.priceRange.high,
                JSON.stringify(analysis.technicalIndicators),
                analysis.currentPrice,
                analysis.priceChange,
                analysis.priceChangePercent,
                analysis.volume
            ], function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }
}

module.exports = new PriceAnalyzer();