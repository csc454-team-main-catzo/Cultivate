import mongoose from 'mongoose';
import CFG from './config.js';

export const connectDB = async () => {
  try {
    await mongoose.connect(CFG.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
  console.error('MongoDB error:', error);
});

export default mongoose;
