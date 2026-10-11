import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resendVerificationSchema, verifyEmailSchema, ResendVerificationInput, VerifyEmailInput } from '@devflow/validation';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';
import { getErrorMessage } from '../lib/errorMessage';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const initialEmail = searchParams.get('email') || '';

  const verifyForm = useForm<VerifyEmailInput>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { email: initialEmail, code: '' }
  });
  const resendForm = useForm<ResendVerificationInput>({
    resolver: zodResolver(resendVerificationSchema),
    defaultValues: { email: initialEmail }
  });

  const verify = async (data: VerifyEmailInput) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsVerifying(true);
    try {
      await apiClient.post('/auth/verify-email', data);
      setSuccessMessage('Email verified. You can now sign in.');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to verify the code.'));
    } finally {
      setIsVerifying(false);
    }
  };

  const resend = async (data: ResendVerificationInput) => {
    setErrorMessage(null);
    setIsResending(true);
    try {
      await apiClient.post('/auth/resend-verification', data);
      setSuccessMessage('If this account needs verification, a new code has been sent.');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to resend the code.'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-6">
        <div className="space-y-1 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white">Verify your email</h2>
          <p className="text-sm text-slate-400">Enter the six-digit code sent to your inbox. It expires in 10 minutes.</p>
        </div>
        {successMessage && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm p-3 rounded-lg">{successMessage}</div>}
        {errorMessage && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg">{errorMessage}</div>}

        <form onSubmit={verifyForm.handleSubmit(verify)} className="space-y-4">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Email address
            <input type="email" {...verifyForm.register('email')} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
          </label>
          {verifyForm.formState.errors.email && <p className="text-xs text-red-400 -mt-3">{verifyForm.formState.errors.email.message}</p>}
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Verification code
            <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} {...verifyForm.register('code')} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-center tracking-[0.45em] text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg" placeholder="123456" />
          </label>
          {verifyForm.formState.errors.code && <p className="text-xs text-red-400 -mt-3">{verifyForm.formState.errors.code.message}</p>}
          <button type="submit" disabled={isVerifying} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg transition text-sm disabled:opacity-50">
            {isVerifying ? 'Verifying…' : 'Verify email'}
          </button>
        </form>

        <form onSubmit={resendForm.handleSubmit(resend)} className="border-t border-slate-800 pt-4 text-center space-y-3">
          <p className="text-xs text-slate-400">Did not receive a code?</p>
          <button type="submit" disabled={isResending} className="text-sm text-indigo-400 hover:text-indigo-300 disabled:opacity-50">
            {isResending ? 'Sending…' : 'Resend verification code'}
          </button>
        </form>
        <p className="text-center text-sm text-slate-400">Already verified? <Link to="/login" className="text-indigo-400 hover:text-indigo-300">Sign in</Link></p>
      </div>
    </div>
  );
}

export default VerifyEmailPage;
