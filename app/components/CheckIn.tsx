// @ts-nocheck
'use client'
import { useState, useEffect } from 'react';

const CheckIn = () => {
  const [email, setEmail] = useState('');
  const [checkins, setCheckins] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingEmail, setEditingEmail] = useState('');
  const [copied, setCopied] = useState(null);

  // Load from localStorage on component mount
  useEffect(() => {
    const savedCheckins = localStorage.getItem('checkins');
    if (savedCheckins) {
      setCheckins(JSON.parse(savedCheckins));
    }
  }, []);

  // Save to localStorage whenever checkins change
  useEffect(() => {
    localStorage.setItem('checkins', JSON.stringify(checkins));
  }, [checkins]);

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const addCheckin = () => {
    if (email.trim() && isValidEmail(email)) {
      const newCheckin = {
        id: Date.now(),
        email: email.trim(),
        timestamp: new Date().toLocaleString()
      };
      setCheckins([newCheckin, ...checkins]);
      setEmail('');
    }
  };

  const deleteCheckin = (id) => {
    setCheckins(checkins.filter(c => c.id !== id));
  };

  const startEdit = (id, currentEmail) => {
    setEditingId(id);
    setEditingEmail(currentEmail);
  };

  const saveEdit = () => {
    if (editingEmail.trim() && isValidEmail(editingEmail)) {
      setCheckins(checkins.map(c => 
        c.id === editingId ? { ...c, email: editingEmail.trim() } : c
      ));
      setEditingId(null);
      setEditingEmail('');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingEmail('');
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div className="max-w-sm mx-auto p-4 mt-32">
      <div className="flex gap-2 mb-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addCheckin()}
          placeholder="Enter email"
          className="flex-1 p-2 border-2 border-gray-500 rounded focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={addCheckin}
          disabled={!email.trim() || !isValidEmail(email)}
          className="px-3 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300 hover:bg-blue-600 cursor-pointer disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      </div>

      <div className="space-y-2">
        {checkins.map((checkin) => (
          <div key={checkin.id} className="flex items-center gap-2 p-2 bg-gray-50 border-2 border-gray-400 rounded">
            {editingId === checkin.id ? (
              <>
                <input
                  type="email"
                  value={editingEmail}
                  onChange={(e) => setEditingEmail(e.target.value)}
                  className="flex-1 p-1 border-2 border-gray-500 rounded text-sm focus:border-blue-500 focus:outline-none"
                />
                <button 
                  onClick={saveEdit} 
                  className="p-1 bg-green-500 text-white rounded hover:bg-green-600 cursor-pointer transition-colors"
                  title="Save"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button 
                  onClick={cancelEdit} 
                  className="p-1 bg-gray-500 text-white rounded hover:bg-gray-600 cursor-pointer transition-colors"
                  title="Cancel"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <div className="text-sm">{checkin.email}</div>
                  <div className="text-xs text-gray-500">{checkin.timestamp}</div>
                </div>
                <button 
                  onClick={() => copyToClipboard(checkin.email, checkin.id)} 
                  className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded cursor-pointer transition-colors"
                  title="Copy email"
                >
                  {copied === checkin.id ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
                <button 
                  onClick={() => startEdit(checkin.id, checkin.email)} 
                  className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded cursor-pointer transition-colors"
                  title="Edit email"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button 
                  onClick={() => deleteCheckin(checkin.id)} 
                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded cursor-pointer transition-colors"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CheckIn;