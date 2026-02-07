const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/project_management_tool';
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB Connected...');
    } catch (err) {
        console.error('Error connecting to MongoDB:', err.message);

        console.log('Ensure you have MongoDB running on localhost:27017 or set MONGO_URI in .env');
        process.exit(1);
    }
};

module.exports = connectDB;
