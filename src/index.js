require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { db, initialize, close } = require('./database/init');
const stockAPI = require('./api/stockData');
const analysisEngine = require('./analysis/priceAnalyzer');
const historyService = require('./api/historyService');
const llmAnalyzer = require('./analysis/llmAnalyzer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'ui/build')));

function initializeServer() {
    initialize((err) => {
        if (err) {
            console.error('Failed to initialize server:', err);
            process.exit(1);
            return;
        }

        historyService.setDatabase(db);

        console.log('Stock Price Analyzer server initialized');

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    });
}

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/stock/:symbol', async (req, res) => {
    const { symbol } = req.params;
    try {
        let stockData;
        try {
            // 1. Try to get data from local DB
            stockData = await stockAPI.getStockData(symbol, db);
        } catch (error) {
            // 2. If not found, fetch from remote and save
            if (error.message.includes('Stock not found in local database')) {
                console.log(`Cache miss for ${symbol}. Fetching from remote API.`);
                await stockAPI.updateStockData(symbol, db);
                // 3. Try again to get data from local DB
                stockData = await stockAPI.getStockData(symbol, db);
            } else {
                // Re-throw other errors
                throw error;
            }
        }
        res.json(stockData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/analysis/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const analysis = await analysisEngine.analyzeStock(symbol, db);
        res.json(analysis);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/stock/:symbol/refresh', async (req, res) => {
    try {
        const { symbol } = req.params;
        await stockAPI.updateStockData(symbol, db);
        res.json({ message: 'Stock data refreshed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/history/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { limit = 30 } = req.query;
        const history = await historyService.getAnalysisHistory(symbol, parseInt(limit));
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/history/:symbol/prices', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { startDate, endDate, limit = 100 } = req.query;
        const priceHistory = await historyService.getStockPriceHistory(
            symbol,
            startDate,
            endDate,
            parseInt(limit)
        );
        res.json(priceHistory);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/performance/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { days = 30 } = req.query;
        const performance = await historyService.getPerformanceMetrics(symbol, parseInt(days));
        res.json(performance);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/llm-analysis/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const result = await llmAnalyzer.getAnalysis(symbol, db);
        if (result) {
            res.json(result);
        } else {
            res.status(404).json({ message: 'No analysis found for this stock yet.' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/llm-analysis/:symbol/refresh', async (req, res) => {
    try {
        const { symbol } = req.params;
        const result = await llmAnalyzer.generateAndSaveAnalysis(symbol, db);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/llm-analysis/:symbol/prompt', async (req, res) => {
    try {
        const { symbol } = req.params;
        const stockData = await stockAPI.getStockData(symbol, db);
        const analysis = await analysisEngine.analyzeStock(symbol, db);
        const prices = await llmAnalyzer._getRecentPrices(symbol, db, 30);
        
        // Generate the prompt using the public method from the LLM analyzer
        const prompt = llmAnalyzer.generatePrompt(stockData.overview, analysis, prices);
        res.json({ prompt });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/watchlist', async (req, res) => {
    try {
        const watchlist = await historyService.getWatchlist();
        res.json(watchlist);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/sector-comparison', async (req, res) => {
    try {
        const comparison = await historyService.getSectorComparison();
        res.json(comparison);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'ui/build', 'index.html'));
});

process.on('SIGINT', async () => {
    console.log('\nShutting down gracefully...');
    close();
    process.exit(0);
});

initializeServer();