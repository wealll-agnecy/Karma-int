const mongoose = require('mongoose');

const connectDB = async (retries = 5, delay = 5000) => {
    for (let i = 1; i <= retries; i++) {
        try {
            const conn = await mongoose.connect(process.env.MONGO_URI, {
                serverSelectionTimeoutMS: 5000, 
                socketTimeoutMS: 45000,
                family: 4,
                maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE) || 1000, // Enterprise scaling connection pool
                minPoolSize: 10,
                autoIndex: true, // Auto-build missing indexes for maximum query performance
            });
            console.log(`✅ [DATABASE CONNECTED]: ${conn.connection.host} / ${conn.connection.name}`);
            
            // Robust Production Event Listeners
            mongoose.connection.on('disconnected', () => {
                console.warn('⚠️ [DATABASE] Disconnected! Attempting to automatically reconnect...');
            });

            mongoose.connection.on('reconnected', () => {
                console.log('✅ [DATABASE] Successfully Reconnected!');
            });

            mongoose.connection.on('error', (err) => {
                console.error(`❌ [DATABASE ERROR]: ${err.message}`);
            });

            return;
        } catch (error) {
            console.error(`❌ [DATABASE CONNECTION ATTEMPT ${i}/${retries} FAILED]: ${error.message}`);
            if (i === retries) {
                console.error('🚨 [CRITICAL] Database connection failed after maximum retries. Exiting.');
                process.exit(1);
            }
            console.log(`Waiting ${delay / 1000}s before retrying...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

module.exports = connectDB;
