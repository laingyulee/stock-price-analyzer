class HistoryService {
    constructor() {
        this.db = null;
    }

    setDatabase(database) {
        this.db = database;
    }

    async getAnalysisHistory(symbol, limit = 30) {
        return new Promise((resolve, reject) => {
            const db = this.db;
            const query = `
                SELECT *
                FROM price_analysis
                WHERE stock_symbol = ?
                ORDER BY analysis_date DESC
                LIMIT ?
            `;

            db.all(query, [symbol, limit], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                const formattedRows = rows.map(row => ({
                    id: row.id,
                    symbol: row.stock_symbol,
                    date: row.analysis_date,
                    targetPrice: row.target_price,
                    confidenceScore: row.confidence_score,
                    method: row.analysis_method,
                    priceRange: {
                        low: row.price_range_low,
                        high: row.price_range_high
                    },
                    technicalIndicators: JSON.parse(row.technical_indicators || '{}'),
                    createdAt: row.created_at
                }));

                resolve(formattedRows);
            });
        });
    }

    async getStockPriceHistory(symbol, startDate = null, endDate = null, limit = 100) {
        return new Promise((resolve, reject) => {
            const db = this.db.db;
            let query = `
                SELECT *
                FROM daily_prices
                WHERE stock_symbol = ?
            `;
            const params = [symbol];

            if (startDate) {
                query += ` AND date >= ?`;
                params.push(startDate);
            }

            if (endDate) {
                query += ` AND date <= ?`;
                params.push(endDate);
            }

            query += ` ORDER BY date DESC LIMIT ?`;
            params.push(limit);

            db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                const formattedRows = rows.map(row => ({
                    symbol: row.stock_symbol,
                    date: row.date,
                    open: row.open_price,
                    high: row.high_price,
                    low: row.low_price,
                    close: row.close_price,
                    volume: row.volume,
                    createdAt: row.created_at
                })).reverse();

                resolve(formattedRows);
            });
        });
    }

    async getWatchlist() {
        return new Promise((resolve, reject) => {
            const db = this.db.db;
            const query = `
                SELECT s.*
                FROM stocks s
                JOIN daily_prices sp ON s.symbol = sp.stock_symbol
                WHERE sp.date = (
                    SELECT MAX(date) FROM daily_prices
                )
                ORDER BY s.updated_at DESC
                LIMIT 50
            `;

            db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(rows);
            });
        });
    }

    async getPerformanceMetrics(symbol, days = 30) {
        return new Promise((resolve, reject) => {
            const db = this.db.db;
            // DuckDB uses CURRENT_DATE instead of date('now')
            const query = `
                SELECT date, close_price
                FROM daily_prices
                WHERE stock_symbol = ? AND date >= CURRENT_DATE - INTERVAL '${days} days'
                ORDER BY date ASC
            `;

            db.all(query, [symbol], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (rows.length < 2) {
                    resolve(null);
                    return;
                }

                const prices = rows.map(r => r.close_price);
                const firstPrice = prices[0];
                const lastPrice = prices[prices.length - 1];

                const returns = [];
                for (let i = 1; i < prices.length; i++) {
                    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
                }

                const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
                const variance = returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length;
                const volatility = Math.sqrt(variance) * Math.sqrt(252);

                const highs = rows.map(r => r.close_price);
                const lows = rows.map(r => r.close_price);
                const maxPrice = Math.max(...highs);
                const minPrice = Math.min(...lows);

                resolve({
                    period: `${days} 天`,
                    startPrice: firstPrice,
                    endPrice: lastPrice,
                    totalReturn: ((lastPrice - firstPrice) / firstPrice * 100).toFixed(2),
                    volatility: (volatility * 100).toFixed(2),
                    maxPrice,
                    minPrice,
                    avgPrice: (prices.reduce((a, b) => a + b, 0) / prices.length),
                    dataPoints: rows.length
                });
            });
        });
    }

    async getSectorComparison() {
        return new Promise((resolve, reject) => {
            const db = this.db.db;
            // DuckDB uses CURRENT_DATE and INTERVAL syntax
            const query = `
                SELECT
                    s.sector,
                    COUNT(s.symbol) as stock_count,
                    AVG(sp.close_price) as avg_price,
                    AVG(
                        (
                            SELECT sp2.close_price
                            FROM daily_prices sp2
                            WHERE sp2.stock_symbol = s.symbol
                            AND sp2.date >= CURRENT_DATE - INTERVAL '30 days'
                            ORDER BY sp2.date ASC LIMIT 1
                        )
                    ) as avg_price_30d_ago
                FROM stocks s
                JOIN daily_prices sp ON s.symbol = sp.stock_symbol
                WHERE s.sector IS NOT NULL
                AND s.sector != ''
                AND sp.date = (SELECT MAX(date) FROM daily_prices)
                GROUP BY s.sector
                HAVING stock_count >= 2
                ORDER BY stock_count DESC
            `;

            db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                const comparison = rows.map(row => ({
                    sector: row.sector,
                    stockCount: row.stock_count,
                    currentAvgPrice: row.avg_price,
                    avgPrice30DaysAgo: row.avg_price_30d_ago,
                    performance: row.avg_price_30d_ago ?
                        ((row.avg_price - row.avg_price_30d_ago) / row.avg_price_30d_ago * 100).toFixed(2) : null
                }));

                resolve(comparison);
            });
        });
    }

    async cleanupOldData(daysToKeep = 365) {
        return new Promise((resolve, reject) => {
            const db = this.db.db;
            // DuckDB uses CURRENT_DATE and INTERVAL syntax
            const queries = [
                `DELETE FROM daily_prices WHERE date < CURRENT_DATE - INTERVAL '${daysToKeep} days'`,
                `DELETE FROM price_analysis WHERE analysis_date < CURRENT_DATE - INTERVAL '${daysToKeep} days'`
            ];

            let completed = 0;
            const total = queries.length;

            queries.forEach((query, index) => {
                db.run(query, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    completed++;
                    if (completed === total) {
                        resolve({ deletedQueries: total });
                    }
                });
            });
        });
    }
}

module.exports = new HistoryService();