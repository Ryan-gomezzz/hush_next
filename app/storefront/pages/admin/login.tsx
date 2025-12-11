import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [supabaseNotConfigured, setSupabaseNotConfigured] = useState(false);

  useEffect(() => {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      setSupabaseNotConfigured(true);
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    
    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // Check if it's a network error
        if (authError.message.includes('Failed to fetch') || authError.message.includes('NetworkError')) {
          throw new Error('Cannot connect to Supabase. Please check your NEXT_PUBLIC_SUPABASE_URL and ensure your Supabase project is active.');
        }
        throw authError;
      }

      if (!data.user) {
        throw new Error('Login failed');
      }

      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile || profile.role !== 'admin') {
        await supabase.auth.signOut();
        setError('Access denied. Admin privileges required.');
        setLoading(false);
        return;
      }

      router.push('/admin');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  // Show setup message if Supabase is not configured
  if (supabaseNotConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-center mb-6 text-primary-600">Setup Required</h1>
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-4">
            <p className="font-semibold mb-2">Supabase is not configured yet.</p>
            <p className="text-sm mb-4">To use this application, you need to:</p>
            <ol className="list-decimal list-inside text-sm space-y-2">
              <li>Create a Supabase project at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">supabase.com</a></li>
              <li>Run the database schema from <code className="bg-gray-200 px-1 rounded">supabase/schema.sql</code></li>
              <li>Set environment variables:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li><code className="bg-gray-200 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code></li>
                  <li><code className="bg-gray-200 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
                </ul>
              </li>
              <li>Run the seed script: <code className="bg-gray-200 px-1 rounded">npm run seed</code></li>
            </ol>
            <p className="text-sm mt-4">
              See <a href="https://github.com/Ryan-gomezzz/hush_next/blob/main/README.md" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">README.md</a> for detailed setup instructions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-center mb-6 text-primary-600">Admin Login</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

