const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Create database instance immediately
const dbPath = process.env.DATABASE_PATH || './data/stocks.db';
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to SQLite database:', err.message);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Function to run migrations
const migrateDatabase = (callback) => {
    db.all('PRAGMA table_info(stocks)', (err, columns) => {
        if (err) {
            console.error('Error getting table info:', err.message);
            return callback(err);
        }

        const existingColumns = columns.map(c => c.name);
        const newColumns = {
            'description': 'TEXT',
            'market_cap': 'INTEGER',
            'pe_ratio': 'REAL',
            'pb_ratio': 'REAL',
            'dividend_yield': 'REAL',
            'eps': 'REAL',
            'beta': 'REAL',
            'week_52_high': 'REAL',
            'week_52_low': 'REAL',
            'shares_outstanding': 'INTEGER',
            'fifty_day_average': 'REAL',
            'two_hundred_day_average': 'REAL',
            'average_daily_volume_10day': 'INTEGER',
            'debt_to_equity': 'REAL',
            'return_on_equity': 'REAL',
            'total_revenue': 'INTEGER',
            'net_income_to_common': 'INTEGER',
            'gross_margins': 'REAL',
            'operating_margins': 'REAL',
            'address1': 'TEXT',
            'city': 'TEXT',
            'state': 'TEXT',
            'zip': 'TEXT',
            'country': 'TEXT',
            'phone': 'TEXT',
            'website': 'TEXT',
            'full_time_employees': 'INTEGER',
            'company_officers': 'TEXT',
            'dividend_rate': 'REAL',
            'payout_ratio': 'REAL',
            'five_year_avg_dividend_yield': 'REAL',
            'trailing_pe': 'REAL',
            'forward_pe': 'REAL',
            'price_to_sales_trailing_12months': 'REAL',
            'book_value': 'REAL',
            'price_to_book': 'REAL',
            'profit_margins': 'REAL',
            'enterprise_value': 'INTEGER',
            'enterprise_to_revenue': 'REAL',
            'enterprise_to_ebitda': 'REAL',
            'ebitda': 'INTEGER',
            'total_cash': 'INTEGER',
            'total_cash_per_share': 'REAL',
            'total_debt': 'INTEGER',
            'quick_ratio': 'REAL',
            'current_ratio': 'REAL',
            'revenue_per_share': 'REAL',
            'return_on_assets': 'REAL',
            'gross_profits': 'INTEGER',
            'free_cashflow': 'INTEGER',
            'operating_cashflow': 'INTEGER',
            'earnings_growth': 'REAL',
            'revenue_growth': 'REAL',
            'ebitda_margins': 'REAL',
            'financial_currency': 'TEXT',
            'recommendation_mean': 'REAL',
            'recommendation_key': 'TEXT',
            'number_of_analyst_opinions': 'INTEGER',
            'target_high_price': 'REAL',
            'target_low_price': 'REAL',
            'target_mean_price': 'REAL',
            'target_median_price': 'REAL'
        };

        const columnsToAdd = Object.keys(newColumns).filter(name => !existingColumns.includes(name));

        if (columnsToAdd.length === 0) {
            console.log('Database schema is up to date.');
            return callback(null);
        }

        const migrationQueries = columnsToAdd.map(name => `ALTER TABLE stocks ADD COLUMN ${name} ${newColumns[name]}`);
        
        let completedMigrations = 0;
        migrationQueries.forEach(query => {
            db.run(query, (err) => {
                if (err) {
                    console.error(`Error running migration: ${query}`, err.message);
                    return callback(err);
                }
                completedMigrations++;
                if (completedMigrations === migrationQueries.length) {
                    console.log('Database migration completed successfully.');
                    callback(null);
                }
            });
        });
    });
};

// Initialize tables using pure callback style
const initializeDatabase = (callback) => {
    const queries = [
        `CREATE TABLE IF NOT EXISTS stocks (
            symbol TEXT PRIMARY KEY,
            name TEXT,
            sector TEXT,
            industry TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS daily_prices (
            stock_symbol TEXT NOT NULL,
            date DATE NOT NULL,
            open_price REAL,
            high_price REAL,
            low_price REAL,
            close_price REAL,
            volume INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (stock_symbol, date)
        )`,

        `CREATE TABLE IF NOT EXISTS latest_prices (
            stock_symbol TEXT PRIMARY KEY,
            current_price REAL,
            previous_close REAL,
            price_change REAL,
            price_change_percent REAL,
            volume INTEGER,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS price_analysis (
            id INTEGER PRIMARY KEY,
            stock_symbol TEXT NOT NULL UNIQUE,
            analysis_date DATE NOT NULL,
            target_price REAL,
            confidence_score REAL,
            analysis_method TEXT,
            price_range_low REAL,
            price_range_high REAL,
            technical_indicators TEXT,
            current_price REAL,
            price_change REAL,
            price_change_percent REAL,
            volume INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS llm_analysis (
            id INTEGER PRIMARY KEY,
            stock_symbol TEXT NOT NULL UNIQUE,
            analysis_text TEXT,
            model_name TEXT,
            generated_at DATETIME
        )`
    ];

    let completed = 0;
    const total = queries.length;

    const runQuery = (index) => {
        if (index >= total) {
            console.log('Database tables initialized successfully');
            // After creating tables, run migrations
            migrateDatabase(callback);
            return;
        }

        db.run(queries[index], (err) => {
            if (err) {
                console.error('Error creating table:', err.message);
                callback(err);
                return;
            }
            completed++;
            runQuery(index + 1);
        });
    };

    runQuery(0);
};

// Export the database instance and initialization function
module.exports = {
    db: db,
    initialize: initializeDatabase,
    close: () => {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            } else {
                console.log('Database connection closed');
            }
        });
    }
};