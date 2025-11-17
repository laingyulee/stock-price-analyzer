const axios = require('axios');
const _ = require('lodash');

class StockDataAPI {
    constructor() {
        this.baseAPIURL = process.env.API_BASE_URL;
    }

    async getStockPrice(symbol) {
        try {
            const response = await axios.get(`${this.baseAPIURL}/ticker/${symbol}/fast-info`);

            const quote = response.data;
            if (!quote || !quote.lastPrice) {
                throw new Error('No data found for symbol: ' + symbol);
            }

            return {
                symbol: symbol,
                price: quote.lastPrice,  // Current price
                previous_close: quote.previousClose || quote.lastPrice,  // Previous close
                change: quote.lastPrice - (quote.previousClose || quote.lastPrice),  // Change
                changePercent: quote.previousClose ? ((quote.lastPrice - quote.previousClose) / quote.previousClose) * 100 : 0,  // Change percent
                volume: quote.lastVolume || 0,  // Volume
                timestamp: new Date().toISOString().split('T')[0]  // Current date
            };
        } catch (error) {
            console.error('Error fetching stock price:', error.message);
            throw error;
        }
    }

    async getHistoricalData(symbol, period = '3mo') {
        try {
            // 映射旧的周期到新的API周期
            let newPeriod = '3mo';
            switch (period) {
                case '1day':
                    newPeriod = '1d';
                    break;
                case '1week':
                    newPeriod = '5d';
                    break;
                case '1month':
                    newPeriod = '1mo';
                    break;
                case '3month':
                    newPeriod = '3mo';
                    break;
                case 'year':
                    newPeriod = '1y';
                    break;
                default:
                    newPeriod = '3mo'; // Default to 3 months
            }

            const response = await axios.get(`${this.baseAPIURL}/ticker/${symbol}/history`, {
                params: {
                    period: newPeriod,
                    interval: '1d'
                }
            });

            const historical = response.data;
            if (!historical || !Array.isArray(historical) || historical.length === 0) {
                throw new Error('No historical data found for symbol: ' + symbol);
            }

            // Transform data to match expected format
            const historicalData = historical
                .filter(item => item.Close != null) // 过滤掉空数据
                .map(item => ({
                    date: new Date(item.Date).toISOString().split('T')[0], // 提取日期部分
                    open: item.Open,
                    high: item.High,
                    low: item.Low,
                    close: item.Close,
                    volume: item.Volume
                }));

            return historicalData;
        } catch (error) {
            console.error('Error fetching historical data:', error.message);
            // Return empty array if no historical data available
            return [];
        }
    }

    async getCompanyOverview(symbol) {
        try {
            const response = await axios.get(`${this.baseAPIURL}/ticker/${symbol}/info`);

            const info = response.data;
            if (!info || !info.symbol) {
                throw new Error('No company profile found for symbol: ' + symbol);
            }

            // 尝试获取分析师价格目标
            let analystTargetPrice = null;
            try {
                const analystResponse = await axios.get(`${this.baseAPIURL}/ticker/${symbol}/analyst-price-targets`);
                if (analystResponse.data && analystResponse.data.mean) {
                    analystTargetPrice = analystResponse.data.mean;
                }
            } catch (analystError) {
                console.warn(`Could not fetch analyst price targets for ${symbol}:`, analystError.message);
            }

            return {
                symbol: info.symbol || symbol,
                name: info.longName,
                shortName: info.shortName || info.symbol,
                sector: info.sector,
                industry: info.industry,
                description: info.longBusinessSummary,
                marketCap: info.marketCap,
                peRatio: info.trailingPE || info.forwardPE,
                pbRatio: info.priceToBook,
                dividendYield: info.dividendYield,
                eps: info.eps || info.trailingEps,
                beta: info.beta,
                week52High: info.fiftyTwoWeekHigh,
                week52Low: info.fiftyTwoWeekLow,
                shares_outstanding: info.sharesOutstanding || info.sharesOutstanding,
                analystTargetPrice: analystTargetPrice,
                fiftyDayAverage: info.fiftyDayAverage,
                twoHundredDayAverage: info.twoHundredDayAverage,
                averageDailyVolume10Day: info.averageDailyVolume10Day,
                debtToEquity: info.debtToEquity,
                returnOnEquity: info.returnOnEquity,
                totalRevenue: info.totalRevenue,
                netIncomeToCommon: info.netIncomeToCommon,
                grossMargins: info.grossMargins,
                operatingMargins: info.operatingMargins,
                address1: info.address1,
                city: info.city,
                state: info.state,
                zip: info.zip,
                country: info.country,
                phone: info.phone,
                website: info.website,
                fullTimeEmployees: info.fullTimeEmployees,
                companyOfficers: info.companyOfficers || [],
                dividendRate: info.dividendRate,
                payoutRatio: info.payoutRatio,
                fiveYearAvgDividendYield: info.fiveYearAvgDividendYield,
                trailingPE: info.trailingPE,
                forwardPE: info.forwardPE,
                priceToSalesTrailing12Months: info.priceToSalesTrailing12Months,
                bookValue: info.bookValue,
                priceToBook: info.priceToBook,
                profitMargins: info.profitMargins,
                enterpriseValue: info.enterpriseValue,
                enterpriseToRevenue: info.enterpriseToRevenue,
                enterpriseToEbitda: info.enterpriseToEbitda,
                ebitda: info.ebitda,
                totalCash: info.totalCash,
                totalCashPerShare: info.totalCashPerShare,
                totalDebt: info.totalDebt,
                quickRatio: info.quickRatio,
                currentRatio: info.currentRatio,
                revenuePerShare: info.revenuePerShare,
                returnOnAssets: info.returnOnAssets,
                grossProfits: info.grossProfits,
                freeCashflow: info.freeCashflow,
                operatingCashflow: info.operatingCashflow,
                earningsGrowth: info.earningsGrowth,
                revenueGrowth: info.revenueGrowth,
                ebitdaMargins: info.ebitdaMargins,
                financialCurrency: info.financialCurrency,
                recommendationMean: info.recommendationMean,
                recommendationKey: info.recommendationKey,
                numberOfAnalystOpinions: info.numberOfAnalystOpinions,
                targetHighPrice: info.targetHighPrice,
                targetLowPrice: info.targetLowPrice,
                targetMeanPrice: info.targetMeanPrice,
                targetMedianPrice: info.targetMedianPrice,
                // 分析师评级字段
                analystRatingStrongBuy: null, // 可以从分析师评级数据获取
                analystRatingBuy: null, // 可以从分析师评级数据获取
                analystRatingHold: null, // 可以从分析师评级数据获取
                analystRatingSell: null, // 可以从分析师评级数据获取
                analystRatingStrongSell: null // 可以从分析师评级数据获取
            };
        } catch (error) {
            console.error('Error fetching company overview:', error.message);
            throw error;
        }
    }

    async getStockData(symbol, database) {
        try {
            return await this.getLocalStockData(symbol, database);
        } catch (error) {
            console.error('Error fetching comprehensive stock data from local DB:', error.message);
            throw error;
        }
    }

    async _fetchRemoteStockData(symbol) {
        try {
            const currentPrice = await this.getStockPrice(symbol);
            const overview = await this.getCompanyOverview(symbol);
            
            let historicalData = [];
            try {
                historicalData = await this.getHistoricalData(symbol);
            } catch (histError) {
                console.warn(`Could not fetch historical data for ${symbol}:`, histError.message);
                historicalData = [];
            }

            return {
                symbol,
                currentPrice,
                historicalData,
                overview,
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error fetching comprehensive stock data from remote API:', error.message);
            throw error;
        }
    }

    async getLocalStockData(symbol, database) {
        const db = database;
        if (!db) {
            throw new Error('Database connection is not provided.');
        }
        const overview = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM stocks WHERE symbol = ?', [symbol], (err, row) => {
                if (err) return reject(err);
                if (!row) return reject(new Error('Stock not found in local database.'));
                resolve({
            symbol: row.symbol,
            name: row.name,
            sector: row.sector,
            industry: row.industry,
            description: row.description,
            marketCap: row.market_cap,
            peRatio: row.pe_ratio,
            pbRatio: row.pb_ratio,
            dividendYield: row.dividend_yield,
            eps: row.eps,
            beta: row.beta,
            week52High: row.week_52_high,
            week52Low: row.week_52_low,
            shares_outstanding: row.shares_outstanding,
            fiftyDayAverage: row.fifty_day_average,
            twoHundredDayAverage: row.two_hundred_day_average,
            averageDailyVolume10Day: row.average_daily_volume_10day,
            debtToEquity: row.debt_to_equity,
            returnOnEquity: row.return_on_equity,
            totalRevenue: row.total_revenue,
            netIncomeToCommon: row.net_income_to_common,
            grossMargins: row.gross_margins,
            operatingMargins: row.operating_margins,
            address1: row.address1,
            city: row.city,
            state: row.state,
            zip: row.zip,
            country: row.country,
            phone: row.phone,
            website: row.website,
            fullTimeEmployees: row.full_time_employees,
            companyOfficers: row.company_officers ? JSON.parse(row.company_officers) : [],
            dividendRate: row.dividend_rate,
            payoutRatio: row.payout_ratio,
            fiveYearAvgDividendYield: row.five_year_avg_dividend_yield,
            trailingPE: row.trailing_pe,
            forwardPE: row.forward_pe,
            priceToSalesTrailing12Months: row.price_to_sales_trailing_12months,
            bookValue: row.book_value,
            priceToBook: row.price_to_book,
            profitMargins: row.profit_margins,
            enterpriseValue: row.enterprise_value,
            enterpriseToRevenue: row.enterprise_to_revenue,
            enterpriseToEbitda: row.enterprise_to_ebitda,
            ebitda: row.ebitda,
            totalCash: row.total_cash,
            totalCashPerShare: row.total_cash_per_share,
            totalDebt: row.total_debt,
            quickRatio: row.quick_ratio,
            currentRatio: row.current_ratio,
            revenuePerShare: row.revenue_per_share,
            returnOnAssets: row.return_on_assets,
            grossProfits: row.gross_profits,
            freeCashflow: row.free_cashflow,
            operatingCashflow: row.operating_cashflow,
            earningsGrowth: row.earnings_growth,
            revenueGrowth: row.revenue_growth,
            ebitdaMargins: row.ebitda_margins,
            financialCurrency: row.financial_currency,
            recommendationMean: row.recommendation_mean,
            recommendationKey: row.recommendation_key,
            numberOfAnalystOpinions: row.number_of_analyst_opinions,
            targetHighPrice: row.target_high_price,
            targetLowPrice: row.target_low_price,
            targetMeanPrice: row.target_mean_price,
            targetMedianPrice: row.target_median_price
        });
            });
        });

        const currentPrice = await this.getLatestPriceFromDB(symbol, database);
        
        const historicalData = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM daily_prices WHERE stock_symbol = ? ORDER BY date DESC LIMIT 200', [symbol], (err, rows) => {
                if (err) return reject(err);
                resolve(rows.map(item => ({
                    date: item.date,
                    open: item.open_price,
                    high: item.high_price,
                    low: item.low_price,
                    close: item.close_price,
                    volume: item.volume
                })).reverse()); // Reverse to have oldest first
            });
        });

        return {
            symbol,
            currentPrice,
            historicalData,
            overview,
            lastUpdated: overview.updated_at || new Date().toISOString()
        };
    }

    async updateStockData(symbol, database) {
        try {
            const stockData = await this._fetchRemoteStockData(symbol);

            await this.saveStockToDatabase(stockData, database);

            console.log(`Successfully updated data for ${symbol}`);
            return stockData;
        } catch (error) {
            console.error(`Error updating stock data for ${symbol}:`, error.message);
            throw error;
        }
    }

    async getLatestPriceFromDB(symbol, database) {
        return new Promise((resolve, reject) => {
            const db = database;
            const query = `
                SELECT stock_symbol, current_price, previous_close, price_change, price_change_percent, volume, last_updated
                FROM latest_prices
                WHERE stock_symbol = ?
            `;

            db.get(query, [symbol], (err, row) => {
                if (err) {
                    console.error('Error fetching latest price from database:', err.message);
                    reject(err);
                    return;
                }

                if (row) {
                    resolve({
                        symbol: row.stock_symbol,
                        price: row.current_price,
                        previous_close: row.previous_close,
                        change: row.price_change,
                        changePercent: row.price_change_percent,
                        volume: row.volume,
                        timestamp: row.last_updated
                    });
                } else {
                    // No data found in the latest_prices table
                    resolve(null);
                }
            });
        });
    }

    async getAnalystPriceTargets(symbol) {
        try {
            const response = await axios.get(`${this.baseAPIURL}/ticker/${symbol}/analyst-price-targets`);
            return response.data;
        } catch (error) {
            console.error('Error fetching analyst price targets:', error.message);
            throw error;
        }
    }

    async saveStockToDatabase(stockData, database) {
        const { symbol, currentPrice, historicalData, overview } = stockData;
        const db = database;

        return new Promise((resolve, reject) => {
            // Ensure overview data exists
            const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

            // For stocks table, use ON CONFLICT for DuckDB with new table structure
            db.run(
                `INSERT INTO stocks (
                    symbol, name, sector, industry, description, market_cap, pe_ratio, pb_ratio, 
                    dividend_yield, eps, beta, week_52_high, week_52_low, shares_outstanding,
                    fifty_day_average, two_hundred_day_average, average_daily_volume_10day,
                    debt_to_equity, return_on_equity, total_revenue, net_income_to_common,
                    gross_margins, operating_margins, address1, city, state, zip, country,
                    phone, website, full_time_employees, company_officers, updated_at,
                    dividend_rate, payout_ratio, five_year_avg_dividend_yield, trailing_pe,
                    forward_pe, price_to_sales_trailing_12months, book_value, price_to_book,
                    profit_margins, enterprise_value, enterprise_to_revenue, enterprise_to_ebitda,
                    ebitda, total_cash, total_cash_per_share, total_debt, quick_ratio, current_ratio,
                    revenue_per_share, return_on_assets, gross_profits, free_cashflow, operating_cashflow,
                    earnings_growth, revenue_growth, ebitda_margins, financial_currency,
                    recommendation_mean, recommendation_key, number_of_analyst_opinions,
                    target_high_price, target_low_price, target_mean_price, target_median_price
                 ) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(symbol) DO UPDATE SET
                     name = excluded.name,
                     sector = excluded.sector,
                     industry = excluded.industry,
                     description = excluded.description,
                     market_cap = excluded.market_cap,
                     pe_ratio = excluded.pe_ratio,
                     pb_ratio = excluded.pb_ratio,
                     dividend_yield = excluded.dividend_yield,
                     eps = excluded.eps,
                     beta = excluded.beta,
                     week_52_high = excluded.week_52_high,
                     week_52_low = excluded.week_52_low,
                     shares_outstanding = excluded.shares_outstanding,
                     fifty_day_average = excluded.fifty_day_average,
                     two_hundred_day_average = excluded.two_hundred_day_average,
                     average_daily_volume_10day = excluded.average_daily_volume_10day,
                     debt_to_equity = excluded.debt_to_equity,
                     return_on_equity = excluded.return_on_equity,
                     total_revenue = excluded.total_revenue,
                     net_income_to_common = excluded.net_income_to_common,
                     gross_margins = excluded.gross_margins,
                     operating_margins = excluded.operating_margins,
                     address1 = excluded.address1,
                     city = excluded.city,
                     state = excluded.state,
                     zip = excluded.zip,
                     country = excluded.country,
                     phone = excluded.phone,
                     website = excluded.website,
                     full_time_employees = excluded.full_time_employees,
                     company_officers = excluded.company_officers,
                     updated_at = excluded.updated_at,
                     dividend_rate = excluded.dividend_rate,
                     payout_ratio = excluded.payout_ratio,
                     five_year_avg_dividend_yield = excluded.five_year_avg_dividend_yield,
                     trailing_pe = excluded.trailing_pe,
                     forward_pe = excluded.forward_pe,
                     price_to_sales_trailing_12months = excluded.price_to_sales_trailing_12months,
                     book_value = excluded.book_value,
                     price_to_book = excluded.price_to_book,
                     profit_margins = excluded.profit_margins,
                     enterprise_value = excluded.enterprise_value,
                     enterprise_to_revenue = excluded.enterprise_to_revenue,
                     enterprise_to_ebitda = excluded.enterprise_to_ebitda,
                     ebitda = excluded.ebitda,
                     total_cash = excluded.total_cash,
                     total_cash_per_share = excluded.total_cash_per_share,
                     total_debt = excluded.total_debt,
                     quick_ratio = excluded.quick_ratio,
                     current_ratio = excluded.current_ratio,
                     revenue_per_share = excluded.revenue_per_share,
                     return_on_assets = excluded.return_on_assets,
                     gross_profits = excluded.gross_profits,
                     free_cashflow = excluded.free_cashflow,
                     operating_cashflow = excluded.operating_cashflow,
                     earnings_growth = excluded.earnings_growth,
                     revenue_growth = excluded.revenue_growth,
                     ebitda_margins = excluded.ebitda_margins,
                     financial_currency = excluded.financial_currency,
                     recommendation_mean = excluded.recommendation_mean,
                     recommendation_key = excluded.recommendation_key,
                     number_of_analyst_opinions = excluded.number_of_analyst_opinions,
                     target_high_price = excluded.target_high_price,
                     target_low_price = excluded.target_low_price,
                     target_mean_price = excluded.target_mean_price,
                     target_median_price = excluded.target_median_price`,
                [
                    symbol,
                    overview.name || '',
                    overview.sector || '',
                    overview.industry || '',
                    overview.description || '',
                    overview.marketCap || null,
                    overview.peRatio || null,
                    overview.pbRatio || null,
                    overview.dividendYield || null,
                    overview.eps || null,
                    overview.beta || null,
                    overview.week52High || null,
                    overview.week52Low || null,
                    overview.shares_outstanding || null,
                    overview.fiftyDayAverage || null,
                    overview.twoHundredDayAverage || null,
                    overview.averageDailyVolume10Day || null,
                    overview.debtToEquity || null,
                    overview.returnOnEquity || null,
                    overview.totalRevenue || null,
                    overview.netIncomeToCommon || null,
                    overview.grossMargins || null,
                    overview.operatingMargins || null,
                    overview.address1 || null,
                    overview.city || null,
                    overview.state || null,
                    overview.zip || null,
                    overview.country || null,
                    overview.phone || null,
                    overview.website || null,
                    overview.fullTimeEmployees || null,
                    JSON.stringify(overview.companyOfficers || []) || null,
                    now,
                    overview.dividendRate || null,
                    overview.payoutRatio || null,
                    overview.fiveYearAvgDividendYield || null,
                    overview.trailingPE || null,
                    overview.forwardPE || null,
                    overview.priceToSalesTrailing12Months || null,
                    overview.bookValue || null,
                    overview.priceToBook || null,
                    overview.profitMargins || null,
                    overview.enterpriseValue || null,
                    overview.enterpriseToRevenue || null,
                    overview.enterpriseToEbitda || null,
                    overview.ebitda || null,
                    overview.totalCash || null,
                    overview.totalCashPerShare || null,
                    overview.totalDebt || null,
                    overview.quickRatio || null,
                    overview.currentRatio || null,
                    overview.revenuePerShare || null,
                    overview.returnOnAssets || null,
                    overview.grossProfits || null,
                    overview.freeCashflow || null,
                    overview.operatingCashflow || null,
                    overview.earningsGrowth || null,
                    overview.revenueGrowth || null,
                    overview.ebitdaMargins || null,
                    overview.financialCurrency || null,
                    overview.recommendationMean || null,
                    overview.recommendationKey || null,
                    overview.numberOfAnalystOpinions || null,
                    overview.targetHighPrice || null,
                    overview.targetLowPrice || null,
                    overview.targetMeanPrice || null,
                    overview.targetMedianPrice || null
                ],
                (err) => {
                    if (err) {
                        console.error('Error inserting stock data:', err.message);
                        reject(err);
                        return;
                    }

                    // For daily_prices, insert new data
                    let completed = 0;
                    const total = historicalData.length;

                    if (total === 0) {
                        console.log(`No historical data to save for ${symbol}`);
                        // Also update the latest price if currentPrice is available
                        if (currentPrice) {
                            const priceChange = currentPrice.price - currentPrice.previous_close;
                            const priceChangePercent = ((currentPrice.price - currentPrice.previous_close) / currentPrice.previous_close) * 100;
                            
                            db.run(
                                `INSERT INTO latest_prices (stock_symbol, current_price, previous_close, price_change, price_change_percent, volume, last_updated)
                                 VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                                 ON CONFLICT(stock_symbol) DO UPDATE SET
                                 current_price = excluded.current_price,
                                 previous_close = excluded.previous_close,
                                 price_change = excluded.price_change,
                                 price_change_percent = excluded.price_change_percent,
                                 volume = excluded.volume,
                                 last_updated = excluded.last_updated`,
                                [
                                    symbol,
                                    currentPrice.price,
                                    currentPrice.previous_close,
                                    priceChange,
                                    priceChangePercent,
                                    currentPrice.volume || 0
                                ],
                                (updateErr) => {
                                    if (updateErr) {
                                        console.error('Error updating latest price:', updateErr.message);
                                    }
                                    resolve();
                                }
                            );
                        } else {
                            resolve();
                        }
                        return;
                    }

                    historicalData.forEach(data => {
                        // Check if all required data fields exist
                        if (data && data.date && (data.open !== undefined && data.open !== null) && 
                            (data.high !== undefined && data.high !== null) && 
                            (data.low !== undefined && data.low !== null)) {
                            db.run(
                                `INSERT INTO daily_prices (stock_symbol, date, open_price, high_price, low_price, close_price, volume)
                                 VALUES (?, ?, ?, ?, ?, ?, ?)
                                 ON CONFLICT(stock_symbol, date) DO UPDATE SET
                                 open_price = excluded.open_price,
                                 high_price = excluded.high_price,
                                 low_price = excluded.low_price,
                                 close_price = excluded.close_price,
                                 volume = excluded.volume`,
                                [
                                    symbol, 
                                    data.date, 
                                    data.open, 
                                    data.high, 
                                    data.low, 
                                    data.close || data.open, // Use open price if close is not available
                                    data.volume || 0
                                ],
                                (err) => {
                                    if (err) {
                                        console.error('Error saving price data to daily_prices:', err.message);
                                        reject(err);
                                        return;
                                    }
                                    completed++;
                                    if (completed === total) {
                                        // Also update the latest price if currentPrice is available
                                        if (currentPrice) {
                                            db.run(
                                                `INSERT INTO latest_prices (stock_symbol, current_price, previous_close, price_change, price_change_percent, volume, last_updated)
                                                 VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                                                 ON CONFLICT(stock_symbol) DO UPDATE SET
                                                 current_price = excluded.current_price,
                                                 previous_close = excluded.previous_close,
                                                 price_change = excluded.price_change,
                                                 price_change_percent = excluded.price_change_percent,
                                                 volume = excluded.volume,
                                                 last_updated = excluded.last_updated`,
                                                [
                                                    symbol,
                                                    currentPrice.price,
                                                    currentPrice.previous_close,
                                                    currentPrice.change,
                                                    currentPrice.changePercent,
                                                    currentPrice.volume || 0
                                                ],
                                                (updateErr) => {
                                                    if (updateErr) {
                                                        console.error('Error updating latest price:', updateErr.message);
                                                    }
                                                    resolve();
                                                }
                                            );
                                        } else {
                                            // If no currentPrice, use the latest historical data
                                            const latestData = historicalData[historicalData.length - 1];
                                            const priceChange = latestData.close - latestData.open;
                                            const priceChangePercent = ((latestData.close - latestData.open) / latestData.open) * 100;
                                            
                                            db.run(
                                                `INSERT INTO latest_prices (stock_symbol, current_price, previous_close, price_change, price_change_percent, volume, last_updated)
                                                 VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                                                 ON CONFLICT(stock_symbol) DO UPDATE SET
                                                 current_price = excluded.current_price,
                                                 previous_close = excluded.previous_close,
                                                 price_change = excluded.price_change,
                                                 price_change_percent = excluded.price_change_percent,
                                                 volume = excluded.volume,
                                                 last_updated = excluded.last_updated`,
                                                [
                                                    symbol,
                                                    latestData.close || latestData.open,
                                                    latestData.open,
                                                    priceChange,
                                                    priceChangePercent,
                                                    latestData.volume || 0
                                                ],
                                                (updateErr) => {
                                                    if (updateErr) {
                                                        console.error('Error updating latest price:', updateErr.message);
                                                    }
                                                    resolve();
                                                }
                                            );
                                        }
                                    }
                                }
                            );
                        } else {
                            console.warn(`Skipping incomplete data point for ${symbol} on ${data ? data.date : 'unknown date'}`);
                            completed++;
                            if (completed === total) {
                                resolve();
                            }
                        }
                    });
                }
            );
        });
    }
}

module.exports = new StockDataAPI();