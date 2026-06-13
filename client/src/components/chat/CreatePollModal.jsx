import React, { useState } from 'react';
import { X, Plus, Trash2, BarChart2 } from 'lucide-react';

export default function CreatePollModal({ onClose, onCreate }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [error, setError] = useState('');

  const handleOptionChange = (index, val) => {
    setOptions((prev) => prev.map((opt, idx) => (idx === index ? val : opt)));
  };

  const handleAddOption = () => {
    if (options.length >= 6) {
      setError('You can add up to 6 options.');
      return;
    }
    setOptions((prev) => [...prev, '']);
    setError('');
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) {
      setError('Polls must have at least 2 options.');
      return;
    }
    setOptions((prev) => prev.filter((_, idx) => idx !== index));
    setError('');
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    setError('');
    
    const cleanQuestion = question.trim();
    const cleanOptions = options.map((opt) => opt.trim()).filter(Boolean);

    if (!cleanQuestion) {
      setError('Question is required.');
      return;
    }

    if (cleanOptions.length < 2) {
      setError('At least 2 options are required.');
      return;
    }

    const poll = {
      question: cleanQuestion,
      options: cleanOptions.map((opt) => ({ text: opt, votes: [] })),
      closed: false,
    };

    onCreate(poll);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-[28px] border border-white/45 bg-white/85 p-5 text-slate-950 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/90 dark:text-white"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 shadow-md">
              <BarChart2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-700 dark:text-cyan-300">Polls & Decisions</p>
              <h2 className="text-lg font-black">Create a Group Poll</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-slate-900/10 dark:hover:bg-white/10" title="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-wider opacity-60">Question</span>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to decide?"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-medium text-slate-950 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
              required
            />
          </label>

          <div>
            <span className="mb-1.5 block text-xs font-black uppercase tracking-wider opacity-60">Options</span>
            <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-950 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                    required
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="rounded-xl p-2 text-red-500 hover:bg-red-500/10"
                      title="Remove option"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddOption}
              className="mt-2 flex items-center gap-1 text-xs font-black text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
            >
              <Plus className="h-4 w-4" />
              Add Option
            </button>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-300 py-3 text-xs font-bold hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 rounded-xl bg-slate-950 py-3 text-xs font-black text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
          >
            Launch Poll
          </button>
        </div>
      </form>
    </div>
  );
}
