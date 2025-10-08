import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';

export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
    return;
  }
  next();
};

// Common validation rules
export const validateAddress = (field: string) => {
  return body(field)
    .isEthereumAddress()
    .withMessage(`${field} must be a valid Ethereum address`);
};

export const validatePositiveNumber = (field: string) => {
  return body(field)
    .isNumeric()
    .withMessage(`${field} must be a number`)
    .isFloat({ min: 0 })
    .withMessage(`${field} must be positive`);
};

export const validateUint256 = (field: string) => {
  return body(field)
    .isNumeric()
    .withMessage(`${field} must be a number`)
    .isInt({ min: 0 })
    .withMessage(`${field} must be a non-negative integer`);
};

export const validateId = (field: string) => {
  return param(field)
    .isNumeric()
    .withMessage(`${field} must be a number`)
    .isInt({ min: 1 })
    .withMessage(`${field} must be a positive integer`);
};

export const validatePagination = () => {
  return [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ];
};
