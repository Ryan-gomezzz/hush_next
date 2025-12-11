import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';

export default function AdminChatbot() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [docContent, setDocContent] = useState('');
  const [docType, setDocType] = useState('product');
  const [docId, setDocId] = useState('');
  const [ingesting, setIngesting] = useState(false);

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch('/.netlify/functions/chatbot-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          session_id: 'admin-session',
        }),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (error: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error: ' + error.message }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleIngest() {
    if (!docContent.trim() || !docId || ingesting) return;

    setIngesting(true);
    try {
      const response = await fetch('/.netlify/functions/ingest-embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await fetch('/api/auth/token').then(r => r.json())).token}`,
        },
        body: JSON.stringify({
          doc_type: docType,
          doc_id: docId,
          content: docContent,
        }),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      alert('Document ingested successfully!');
      setDocContent('');
      setDocId('');
    } catch (error: any) {
      alert('Error ingesting document: ' + error.message);
    } finally {
      setIngesting(false);
    }
  }

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold mb-8">Chatbot Management</h1>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Chat Interface</h2>
          <div className="h-96 overflow-y-auto border border-gray-200 rounded p-4 mb-4 space-y-4">
            {messages.length === 0 ? (
              <p className="text-gray-500 text-center">Start a conversation...</p>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded ${
                    msg.role === 'user' ? 'bg-primary-100 ml-8' : 'bg-gray-100 mr-8'
                  }`}
                >
                  <p className="text-sm font-medium mb-1">{msg.role === 'user' ? 'You' : 'Assistant'}</p>
                  <p>{msg.content}</p>
                </div>
              ))
            )}
            {loading && (
              <div className="bg-gray-100 mr-8 p-3 rounded">
                <p className="text-sm">Thinking...</p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
            />
            <button
              onClick={handleSend}
              disabled={loading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Ingest Document</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Document Type</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="product">Product</option>
                <option value="faq">FAQ</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Document ID</label>
              <input
                type="text"
                value={docId}
                onChange={(e) => setDocId(e.target.value)}
                placeholder="Product ID or document identifier"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Content</label>
              <textarea
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                rows={10}
                placeholder="Paste document content here..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <button
              onClick={handleIngest}
              disabled={ingesting || !docContent.trim() || !docId}
              className="w-full px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {ingesting ? 'Ingesting...' : 'Ingest Document'}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

