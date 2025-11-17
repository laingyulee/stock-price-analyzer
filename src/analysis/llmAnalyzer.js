const _ = require('lodash');
const axios = require('axios');
const stockDataService = require('../api/stockData');
const historyService = require('../api/historyService');
class LLMAnalyzer {
    constructor() {}
    async getAnalysis(symbol, db) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM llm_analysis WHERE stock_symbol = ?', [symbol], (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });
    }
    async generateAndSaveAnalysis(symbol, db) {
        // 1. Gather data from the database
        const overview = await this._getOverview(symbol, db);
        const analysis = await this._getLatestAnalysis(symbol, db);
        const prices = await this._getRecentPrices(symbol, db);
        // 2. Prepare the prompt for the LLM
        const prompt = this._preparePrompt(overview, analysis, prices);
        // 3. Call the LLM
        const llmResultText = await this._callLLM(prompt);
        // 4. Save the result to the database
        const resultToSave = {
            stock_symbol: symbol,
            analysis_text: llmResultText,
            model_name: process.env.LLM_MODEL_NAME,
            generated_at: new Date().toISOString(),
        };
        await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO llm_analysis (stock_symbol, analysis_text, model_name, generated_at)
                 VALUES (?, ?, ?, ?)
                 ON CONFLICT(stock_symbol) DO UPDATE SET
                    analysis_text = excluded.analysis_text,
                    model_name = excluded.model_name,
                    generated_at = excluded.generated_at`,
                [
                    resultToSave.stock_symbol,
                    resultToSave.analysis_text,
                    resultToSave.model_name,
                    resultToSave.generated_at,
                ],
                (err) => {
                    if (err) return reject(err);
                    resolve();
                }
            );
        });
        return resultToSave;
    }
    async _getOverview(symbol, db) {
        try {
            const stockData = await stockDataService.getLocalStockData(symbol, db);
            return stockData.overview || {};
        } catch (error) {
            console.error(`Error fetching overview data for ${symbol}:`, error.message);
        }
    }
    async _getLatestAnalysis(symbol, db) {
        try {
            // Set the database connection for historyService
            historyService.setDatabase(db);
            // Get analysis history with limit 1 to get the latest
            const analysisHistory = await historyService.getAnalysisHistory(symbol, 1);
            if (analysisHistory && analysisHistory.length > 0) {
                const latestAnalysis = analysisHistory[0];
                return latestAnalysis;
            } else {
                // Return empty object if no analysis found
                return {};
            }
        } catch (error) {
            console.error(`Error fetching latest analysis for ${symbol}:`, error.message);
        }
    }
    async _getRecentPrices(symbol, db, limit = 30) {
        try {
            historyService.setDatabase(db);
            // Get stock price history with the specified limit
            const priceHistory = await historyService.getStockPriceHistory(symbol, null, null, limit);
            return priceHistory;
        } catch (error) {
            console.error(`Error fetching recent prices for ${symbol}:`, error.message);
        }
    }
    _preparePrompt(overview, analysis, prices) {
        // This function would format the data into a detailed prompt for a real LLM.
        // For our mock, we just need to ensure we have the data.
        const prompt = `
Analyze the stock ${overview.symbol} (${overview.name}).
**Fundamental Data:**
- Company Description: ${overview.description || 'N/A'}
- Sector: ${overview.sector || 'N/A'}, Industry: ${overview.industry || 'N/A'}
- Market Cap: $${overview.marketCap ? (overview.marketCap / 1000000000).toFixed(2) + 'B' : 'N/A'}
- P/E Ratio: ${overview.peRatio || 'N/A'}
- P/B Ratio: ${overview.pbRatio || 'N/A'}
- Price to Sales Ratio: ${overview.priceToSalesTrailing12Months || 'N/A'}
- Book Value per Share: $${overview.bookValue || 'N/A'}
- EPS: ${overview.eps || 'N/A'}
- Dividend Rate: $${overview.dividendRate || 'N/A'}
- Dividend Yield: ${overview.dividendYield ? overview.dividendYield + '%' : 'N/A'}
- Payout Ratio: ${overview.payoutRatio ? (overview.payoutRatio * 100).toFixed(2) + '%' : 'N/A'}
- 5-Year Avg Dividend Yield: ${overview.fiveYearAvgDividendYield || 'N/A'}%
- Beta: ${overview.beta || 'N/A'}
- 52-Week High/Low: $${overview.week52High || 'N/A'} / $${overview.week52Low || 'N/A'}
- 50-Day Average: $${overview.fiftyDayAverage || 'N/A'}
- 200-Day Average: $${overview.twoHundredDayAverage || 'N/A'}
- Shares Outstanding: ${overview.shares_outstanding ? (overview.shares_outstanding / 1000000).toFixed(2) + 'M' : 'N/A'}
- Revenue Per Share: $${overview.revenuePerShare || 'N/A'}
**Profitability Metrics:**
- Return on Equity: ${overview.returnOnEquity ? (overview.returnOnEquity * 100).toFixed(2) + '%' : 'N/A'}
- Return on Assets: ${overview.returnOnAssets ? (overview.returnOnAssets * 100).toFixed(2) + '%' : 'N/A'}
- Gross Margins: ${overview.grossMargins ? (overview.grossMargins * 100).toFixed(2) + '%' : 'N/A'}
- Operating Margins: ${overview.operatingMargins ? (overview.operatingMargins * 100).toFixed(2) + '%' : 'N/A'}
- EBITDA Margins: ${overview.ebitdaMargins ? (overview.ebitdaMargins * 100).toFixed(2) + '%' : 'N/A'}
- Profit Margins: ${overview.profitMargins ? (overview.profitMargins * 100).toFixed(2) + '%' : 'N/A'}
- Total Revenue: $${overview.totalRevenue ? (overview.totalRevenue / 1000000000).toFixed(2) + 'B' : 'N/A'}
- Net Income: $${overview.netIncomeToCommon ? (overview.netIncomeToCommon / 1000000000).toFixed(2) + 'B' : 'N/A'}
- Gross Profits: $${overview.grossProfits ? (overview.grossProfits / 1000000000).toFixed(2) + 'B' : 'N/A'}
- EBITDA: $${overview.ebitda ? (overview.ebitda / 1000000000).toFixed(2) + 'B' : 'N/A'}
**Financial Health Metrics:**
- Debt to Equity: ${overview.debtToEquity ? overview.debtToEquity.toFixed(2) : 'N/A'}
- Enterprise Value: $${overview.enterpriseValue ? (overview.enterpriseValue / 1000000000).toFixed(2) + 'B' : 'N/A'}
- Enterprise to Revenue: ${overview.enterpriseToRevenue || 'N/A'}
- Enterprise to EBITDA: ${overview.enterpriseToEbitda || 'N/A'}
- Total Cash: $${overview.totalCash ? (overview.totalCash / 1000000000).toFixed(2) + 'B' : 'N/A'}
- Total Debt: $${overview.totalDebt ? (overview.totalDebt / 1000000000).toFixed(2) + 'B' : 'N/A'}
- Quick Ratio: ${overview.quickRatio || 'N/A'}
- Current Ratio: ${overview.currentRatio || 'N/A'}
- Free Cashflow: $${overview.freeCashflow ? (overview.freeCashflow / 1000000000).toFixed(2) + 'B' : 'N/A'}
- Operating Cashflow: $${overview.operatingCashflow ? (overview.operatingCashflow / 1000000000).toFixed(2) + 'B' : 'N/A'}
**Growth Metrics:**
- Earnings Growth: ${overview.earningsGrowth ? (overview.earningsGrowth * 100).toFixed(2) + '%' : 'N/A'}
- Revenue Growth: ${overview.revenueGrowth ? (overview.revenueGrowth * 100).toFixed(2) + '%' : 'N/A'}
**Analyst Metrics:**
- Analyst Target Price (Mean): $${overview.targetMeanPrice || 'N/A'}
- Analyst Target Price (Median): $${overview.targetMedianPrice || 'N/A'}
- Analyst Target Price (High): $${overview.targetHighPrice || 'N/A'}
- Analyst Target Price (Low): $${overview.targetLowPrice || 'N/A'}
- Analyst Recommendation Mean: ${overview.recommendationMean || 'N/A'}
- Analyst Recommendation Key: ${overview.recommendationKey || 'N/A'}
- Number of Analyst Opinions: ${overview.numberOfAnalystOpinions || 'N/A'}
**Company Information:**
- Full Time Employees: ${overview.fullTimeEmployees || 'N/A'}
- Website: ${overview.website || 'N/A'}
- Address: ${overview.address1 ? `${overview.address1}, ${overview.city || ''}, ${overview.state || ''} ${overview.zip || ''}, ${overview.country || ''}` : 'N/A'}
**Technical Analysis Data:**
- Current Price: $${analysis.currentPrice.toFixed(2) || 'N/A'}
- Target Price: $${analysis.targetPrice.toFixed(2) || 'N/A'}
- Price Range (Low/High): $${analysis.priceRange.low.toFixed(2) || 'N/A'} / $${analysis.priceRange.high.toFixed(2) || 'N/A'}
- Confidence Score: ${analysis.confidenceScore ? (analysis.confidenceScore * 1).toFixed(0) + '%' : 'N/A'}
- Analysis Method: ${analysis.method || 'N/A'}
- RSI (14-day): ${_.get(analysis, 'technicalIndicators.rsi', []).slice(-1)[0] || 'N/A'}
- MACD: ${JSON.stringify(_.get(analysis, 'technicalIndicators.macd', []).slice(-1)[0]) || 'N/A'}
- Bollinger Bands: ${JSON.stringify(_.get(analysis, 'technicalIndicators.bollinger', []).slice(-1)[0]) || 'N/A'}
- Price Change: ${analysis.priceChange ? '$' + analysis.priceChange.toFixed(2) : 'N/A'} (${analysis.priceChangePercent ? analysis.priceChangePercent.toFixed(2) + '%' : 'N/A'})
- Volume: ${analysis.volume ? analysis.volume.toLocaleString() : 'N/A'}
- Recent Prices (last 30 days): 
${prices.slice(-30).map(p => `  [${p.date}] high:${p.high.toFixed(2)} low:${p.low.toFixed(2)} close:${p.close.toFixed(2)} (${p.volume ? 'Vol: ' + p.volume.toLocaleString() : 'N/A'})`).join('\n')}
Provide a detailed fundamental analysis, financial analysis, technical analysis, and a final conclusion with investment recommendation.
Your response must be in Chinese.
Your response should be structured with the following markdown headers:
### 基本面分析 (Fundamental Analysis)
### 财务面分析 (Financial Analysis)
### 技术面分析 (Technical Analysis)
### 投资建议 (Investment Recommendation)
        `;
        // console.log("Generated prompt for LLM:", prompt);
        return prompt;
    }
    async _callLLM(prompt) {
        const { LLM_API_ENDPOINT, LLM_API_KEY, LLM_MODEL_NAME } = process.env;
        if (!LLM_API_ENDPOINT || !LLM_API_KEY || !LLM_MODEL_NAME) {
            throw new Error('LLM API endpoint, API key, or model name is not configured in .env file.');
        }
        const payload = {
            model: LLM_MODEL_NAME,
            messages: [
                {
                    role: 'system',
                    content: `You are a senior hedge fund manager. You are given a stock with detailed financial data and you need to provide a detailed analysis of the stock.`
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        };
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LLM_API_KEY}`,
        };
        try {
            const response = await axios.post(LLM_API_ENDPOINT, payload, { headers });
            if (response.data && response.data.choices && response.data.choices.length > 0) {
                return response.data.choices[0].message.content;
            } else {
                throw new Error('Invalid response structure from LLM API.');
            }
        } catch (error) {
            console.error('Error calling LLM API:', error.response ? error.response.data : error.message);
            throw new Error('Failed to get analysis from LLM API.');
        }
    }
    // Public method to generate prompt for external use
    generatePrompt(overview, analysis, prices) {
        return this._preparePrompt(overview, analysis, prices);
    }
}
module.exports = new LLMAnalyzer();