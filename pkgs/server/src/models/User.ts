import mongoose, { Schema, Document } from 'mongoose';

// Define TypeScript interface
export interface IUser extends Document {
  name: string;
  email: string;
  createdAt: Date;
}

// Define Mongoose schema
const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const User = mongoose.model<IUser>('User', userSchema);