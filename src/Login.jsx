import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from './AuthContext';

const Login = () => {
  const { handleGoogleLogin } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Life Admin</h1>
          <p className="text-gray-600 mb-8">Your personal assistant</p>

          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-4">
              Sign in with your Google account to access your dashboard
            </p>
            <GoogleLogin
              onSuccess={handleGoogleLogin}
              onError={() => console.log('Login Failed')}
              useOneTap
            />
          </div>

          <p className="text-xs text-gray-400 mt-8">
            Only your Google account can access this app
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
