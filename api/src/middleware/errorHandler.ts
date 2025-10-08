import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
  stack?: string;
}

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  let error: ErrorResponse = { 
    success: false,
    error: err.message || 'Server Error'
  };

  // Log error
  logger.error(err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { success: false, error: message };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { success: false, error: message };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val: any) => val.message).join(', ');
    error = { success: false, error: message };
  }

  // Ethers.js errors
  if (err.code === 'INSUFFICIENT_FUNDS') {
    const message = 'Insufficient funds for transaction';
    error = { success: false, error: message };
  }

  if (err.code === 'UNPREDICTABLE_GAS_LIMIT') {
    const message = 'Transaction would fail - check contract state';
    error = { success: false, error: message };
  }

  if (err.code === 'NETWORK_ERROR') {
    const message = 'Network error - please try again later';
    error = { success: false, error: message };
  }

  // Rate limit error
  if (err.status === 429) {
    const message = 'Too many requests, please try again later';
    error = { success: false, error: message };
  }

  res.status(err.statusCode || 500).json({
    ...error,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export default errorHandler;
