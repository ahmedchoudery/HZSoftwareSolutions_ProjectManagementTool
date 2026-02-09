const mongoose = require('mongoose');

const connectDB = async () => {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/project_management_tool';
    try {
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ MongoDB Connected...');
    } catch (err) {
        console.error('❌ Error connecting to MongoDB:');
        console.error('Message:', err.message);
        console.error('URI Attempted:', mongoURI.replace(/:([^:@]+)@/, ':****@')); // Hide password if present

        console.log('\nPossible fixes:');
        console.log('1. If using localhost: Ensure MongoDB service is running (mongod).');
        console.log('2. If using Atlas: Ensure your IP address is whitelisted in Atlas Network Access.');
        console.log('3. Ensure MONGO_URI in server/.env is correct.\n');

        process.exit(1);
    }
};

module.exports = connectDB;
