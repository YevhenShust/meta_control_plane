// Login page component with Blueprint form

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Card, FormGroup, InputGroup, Button, Callout, Intent } from '@blueprintjs/core';
import { hashPassword } from './hash';
import { loginRequest } from '../shared/api/authApi';
import { setSession } from './session';

interface LoginPageProps {
  onSuccess?: () => void;
}

export default function LoginPage({ onSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!username) {
      setError('Please enter username');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // DEV-ONLY: Admin bypass for local development
      // Enabled via VITE_AUTH_DEV_BYPASS=1 (or 'true')
      // NEVER enable in production builds
      const devBypass = import.meta.env.VITE_AUTH_DEV_BYPASS === '1' || 
                        import.meta.env.VITE_AUTH_DEV_BYPASS === 'true';
      
      if (devBypass && username.toLowerCase() === 'admin' && password === '') {
        // Dev-only admin login: bypass network call and use a stable dev token
        setSession('dev-admin-token', 'admin');
        
        if (onSuccess) {
          onSuccess();
        }
        return;
      }

      // Standard authentication flow
      if (!password) {
        setError('Please enter password');
        return;
      }

      const hashedPassword = await hashPassword(password);
      const response = await loginRequest(username, hashedPassword);
      
      setSession(response.access_token, username);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Login failed:', err);
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: 'var(--bp5-light-gray5)'
    }}>
      <Card elevation={2} style={{ width: 400, padding: 30 }}>
        <h2 style={{ marginTop: 0 }}>Meta Control Plane</h2>
        <h3 style={{ marginTop: 0, color: 'var(--bp5-text-color-muted)' }}>Sign In</h3>
        
        {error && (
          <Callout intent={Intent.DANGER} style={{ marginBottom: 20 }}>
            {error}
          </Callout>
        )}
        
        <form onSubmit={handleSubmit}>
          <FormGroup label="Username" labelFor="username-input">
            <InputGroup
              id="username-input"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </FormGroup>
          
          <FormGroup label="Password" labelFor="password-input">
            <InputGroup
              id="password-input"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </FormGroup>
          
          <Button
            type="submit"
            intent={Intent.PRIMARY}
            loading={loading}
            fill
            large
            style={{ marginTop: 10 }}
          >
            Login
          </Button>
        </form>
      </Card>
    </div>
  );
}
