import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      toast.success('Logged in');
      navigate('/leads', { replace: true });
    } catch (err: any) {
      toast.error(err?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Sign in</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500">Username</label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Password</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" />
          </div>

          <div className="flex items-center justify-between">
            <Button className="bg-green-600 hover:bg-green-700 text-white" type="submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </div>
        </form>
        <p className="text-xs text-gray-400 mt-3">Use your ERP username and password.</p>
      </div>
    </div>
  );
};

export default LoginPage;
