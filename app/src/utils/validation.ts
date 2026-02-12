import { z } from 'zod';

// Login validation schema
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

export type LoginSchema = z.infer<typeof loginSchema>;

// Signup validation schema
export const signupSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type SignupSchema = z.infer<typeof signupSchema>;

// Forgot password validation schema
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;

// Join meeting validation schema
export const joinMeetingSchema = z.object({
  code: z
    .string()
    .min(1, 'Meeting code is required')
    .regex(/^[a-zA-Z0-9\-]+$/, 'Invalid meeting code format'),
});

export type JoinMeetingSchema = z.infer<typeof joinMeetingSchema>;

// Create meeting validation schema
export const createMeetingSchema = z.object({
  title: z
    .string()
    .min(1, 'Meeting title is required')
    .max(100, 'Title must be less than 100 characters'),
});

export type CreateMeetingSchema = z.infer<typeof createMeetingSchema>;

// Profile update validation schema
export const profileSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

export type ProfileSchema = z.infer<typeof profileSchema>;

// Chat message validation schema
export const chatMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(500, 'Message must be less than 500 characters'),
});

export type ChatMessageSchema = z.infer<typeof chatMessageSchema>;

// Rename participant validation schema
export const renameSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(30, 'Name must be less than 30 characters'),
});

export type RenameSchema = z.infer<typeof renameSchema>;
