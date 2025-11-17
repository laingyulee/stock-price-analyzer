#!/bin/bash

# Stock Price Analyzer Production Deployment Script
# This script automates the deployment of the stock price analyzer application to production
# Usage: ./deploy.sh [options]
# Options:
#   --setup: Full setup including dependencies and configuration
#   --update: Update existing deployment
#   --rollback: Rollback to previous version
#   --status: Show current deployment status

set -e  # Exit on any error

# Configuration variables
APP_NAME="stock-analyzer"
APP_DIR="/var/www/stock-analyzer"
LOG_DIR="/var/log/stock-analyzer"
BACKUP_DIR="/var/backups/stock-analyzer"
USER="nodejs"
GROUP="nodejs"
NODE_VERSION="18"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}$1${NC}"
}

warning() {
    echo -e "${YELLOW}$1${NC}"
}

error() {
    echo -e "${RED}$1${NC}"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  --setup      : Full setup including dependencies and configuration"
    echo "  --update     : Update existing deployment"
    echo "  --rollback   : Rollback to previous version"
    echo "  --status     : Show current deployment status"
    echo "  --help       : Show this help message"
}

# Check if script is run as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
        exit 1
    fi
}

# Install system dependencies
install_dependencies() {
    log "Installing system dependencies..."
    
    # Update package list
    apt update
    
    # Install Node.js via NVM
    if [ ! -d "$HOME/.nvm" ]; then
        log "Installing NVM..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    fi
    
    # Load NVM
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # Install and use Node.js
    nvm install $NODE_VERSION
    nvm use $NODE_VERSION
    
    # Install PM2 globally
    npm install -g pm2
    
    # Install Nginx
    apt install -y nginx
    
    # Install SQLite3 development headers
    apt install -y build-essential sqlite3 libsqlite3-dev
    
    success "Dependencies installed successfully"
}

# Create application user
create_app_user() {
    log "Creating application user: $USER"
    
    if ! id "$USER" &>/dev/null; then
        useradd -m -s /bin/bash $USER
        success "User $USER created"
    else
        success "User $USER already exists"
    fi
}

# Setup application directory
setup_app_dir() {
    log "Setting up application directory: $APP_DIR"
    
    mkdir -p $APP_DIR
    mkdir -p $LOG_DIR
    mkdir -p $BACKUP_DIR
    
    chown -R $USER:$GROUP $APP_DIR
    chown -R $USER:$GROUP $LOG_DIR
    chown -R $USER:$GROUP $BACKUP_DIR
    
    chmod 755 $APP_DIR
    chmod 755 $LOG_DIR
    chmod 755 $BACKUP_DIR
    
    success "Application directory setup complete"
}

# Clone or update the repository
setup_repository() {
    log "Setting up repository..."
    
    if [ -d "$APP_DIR/.git" ]; then
        log "Repository already exists, updating..."
        cd $APP_DIR
        sudo -u $USER git fetch
        sudo -u $USER git pull origin main
    else
        log "Cloning repository..."
        cd /tmp
        sudo -u $USER git clone https://github.com/your-repo/stock-price-analyzer.git $APP_DIR
        cd $APP_DIR
    fi
    
    success "Repository setup complete"
}

# Install application dependencies
install_app_dependencies() {
    log "Installing application dependencies..."
    
    cd $APP_DIR
    
    # Install backend dependencies
    sudo -u $USER npm install --production
    
    # Install frontend dependencies and build
    cd src/ui
    sudo -u $USER npm install --production
    sudo -u $USER npm run build
    
    success "Application dependencies installed"
}

# Configure environment variables
configure_env() {
    log "Configuring environment variables..."
    
    if [ ! -f "$APP_DIR/.env" ]; then
        log "Creating .env file..."
        sudo -u $USER cp $APP_DIR/.env.example $APP_DIR/.env
        warning "Please edit $APP_DIR/.env to set your production values including API_BASE_URL if needed"

    fi
    
    success "Environment configuration complete"
}

# Setup PM2 configuration
setup_pm2() {
    log "Setting up PM2 configuration..."
    
    cd $APP_DIR
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: './src/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 3000,
      DATABASE_PATH: process.env.DATABASE_PATH || './data/stocks.db',
      API_BASE_URL: process.env.API_BASE_URL'
    },
    error_file: '$LOG_DIR/err.log',
    out_file: '$LOG_DIR/out.log',
    log_file: '$LOG_DIR/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max_old_space_size=1024'
  }]
};
EOF
    
    # Start PM2 with configuration
    sudo -u $USER pm2 start ecosystem.config.js
    sudo -u $USER pm2 save
    sudo -u $USER pm2 startup
    
    success "PM2 configuration complete"
}

# Setup Nginx configuration
setup_nginx() {
    log "Setting up Nginx configuration..."
    
    # Create Nginx config
    cat > /etc/nginx/sites-available/$APP_NAME << EOF
server {
    listen 80;
    server_name _;

    # Frontend static files
    location / {
        root $APP_DIR/src/ui/build;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static files
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:\$env{PORT:-3000};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Increase timeouts for API calls
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
}
EOF
    
    # Enable the site
    ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    
    # Test and reload Nginx
    nginx -t
    systemctl reload nginx
    
    success "Nginx configuration complete"
}

# Setup SSL (optional)
setup_ssl() {
    read -p "Would you like to set up SSL with Let's Encrypt? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "Setting up SSL with Let's Encrypt..."
        
        apt install -y certbot python3-certbot-nginx
        
        # Get domain name
        read -p "Enter your domain name: " domain
        
        certbot --nginx -d $domain
        
        success "SSL setup complete"
    else
        warning "Skipping SSL setup"
    fi
}

# Setup cron jobs for cleanup
setup_cron() {
    log "Setting up cron jobs..."
    
    # Create cleanup script
    cat > /usr/local/bin/cleanup_stock_data.sh << EOF
#!/bin/bash
cd $APP_DIR
sudo -u $USER node -e "
const { db, initialize } = require('./src/database/init');
initialize((err) => {
  if (err) {
    console.error('Database initialization error:', err);
    process.exit(1);
  }

  // Clean up old data (older than 30 days)
  db.run('DELETE FROM daily_prices WHERE date < date(\"now\", \"-30 days\")', (err) => {
    if (err) {
      console.error('Error cleaning up old data:', err);
    } else {
      console.log('Old data cleaned up successfully');
    }
  });
  
  // Clean up old analysis (older than 30 days)
  db.run('DELETE FROM price_analysis WHERE analysis_date < date(\"now\", \"-30 days\")', (err) => {
    if (err) {
      console.error('Error cleaning up old analysis:', err);
    } else {
      console.log('Old analysis cleaned up successfully');
    }
  });
  
  db.close();
});
"
EOF
    
    chmod +x /usr/local/bin/cleanup_stock_data.sh
    
    # Add to crontab
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/cleanup_stock_data.sh >> $LOG_DIR/cleanup.log 2>&1") | crontab -
    
    success "Cron jobs setup complete"
}

# Full setup function
full_setup() {
    log "Starting full setup..."
    
    check_root
    install_dependencies
    create_app_user
    setup_app_dir
    setup_repository
    install_app_dependencies
    configure_env
    setup_pm2
    setup_nginx
    setup_ssl
    setup_cron
    
    success "Full setup completed successfully!"
    echo
    success "Application is now running with PM2 and accessible via Nginx"
    echo "  - PM2 status: sudo -u $USER pm2 status"
    echo "  - Application logs: $LOG_DIR/"
    echo "  - You can access the application at http://your-server-ip"
}

# Update function
update_app() {
    log "Updating application..."
    
    if [ ! -d "$APP_DIR/.git" ]; then
        error "Application directory not found, please run --setup first"
        exit 1
    fi
    
    cd $APP_DIR
    
    # Backup current version
    log "Creating backup of current version..."
    timestamp=$(date +%Y%m%d_%H%M%S)
    cp -r $APP_DIR $BACKUP_DIR/$APP_NAME-$timestamp
    
    # Pull latest changes
    sudo -u $USER git fetch
    sudo -u $USER git pull origin main
    
    # Install updated dependencies
    sudo -u $USER npm install --production
    cd src/ui
    sudo -u $USER npm install --production
    sudo -u $USER npm run build
    
    # Restart PM2
    sudo -u $USER pm2 reload $APP_NAME
    
    success "Application updated successfully"
}

# Rollback function
rollback_app() {
    log "Rolling back to previous version..."
    
    if [ -z "$(ls -A $BACKUP_DIR)" ]; then
        error "No backups found"
        exit 1
    fi
    
    # Get latest backup
    latest_backup=$(ls -t $BACKUP_DIR | head -n 1)
    
    log "Restoring from backup: $latest_backup"
    
    # Stop application
    sudo -u $USER pm2 stop $APP_NAME
    
    # Remove current version
    rm -rf $APP_DIR/*
    
    # Restore from backup
    cp -r $BACKUP_DIR/$latest_backup/* $APP_DIR/
    
    # Install dependencies
    sudo -u $USER npm install --production
    
    # Restart application
    sudo -u $USER pm2 start $APP_NAME
    
    success "Rollback completed"
}

# Status function
show_status() {
    log "Application Status:"
    echo
    
    log "PM2 Status:"
    sudo -u $USER pm2 status
    
    echo
    log "Nginx Status:"
    systemctl status nginx
    
    echo
    log "Application Directory: $APP_DIR"
    log "Log Directory: $LOG_DIR"
    log "Backup Directory: $BACKUP_DIR"
    
    echo
    log "Disk Usage:"
    df -h $APP_DIR
    
    echo
    log "Recent Application Logs:"
    if [ -f "$LOG_DIR/combined.log" ]; then
        tail -n 10 $LOG_DIR/combined.log
    else
        echo "No application logs found"
    fi
}

# Parse command line arguments
case "$1" in
    --setup)
        full_setup
        ;;
    --update)
        update_app
        ;;
    --rollback)
        rollback_app
        ;;
    --status)
        show_status
        ;;
    --help|*)
        show_usage
        ;;
esac