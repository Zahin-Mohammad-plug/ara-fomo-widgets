import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Zap } from 'lucide-react';

const ENERGY_LEVELS = ['low', 'medium', 'high'];

export function VoiceInputBox({ onSubmit, isLoading }) {
  const [inputValue, setInputValue] = useState('');
  const [energyLevel, setEnergyLevel] = useState('medium');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Two injection paths for Ara:
  // 1. window.__fomoWidgetSetInput — direct JS call from a browser extension
  //    or any same-process script (useful during dev/testing).
  // 2. window.electronAPI.onAraTranscript — the IPC path used in production:
  //    Ara sends text to the TCP socket → main.js broadcasts 'ara-transcript'
  //    → preload relays it to the renderer → this handler appends it here.
  // Both append rather than overwrite so multiple Ara utterances accumulate
  // into a single intent string.
  useEffect(() => {
    window.__fomoWidgetSetInput = (text) =>
      setInputValue(prev => (prev ? prev + ' ' + text : text).trim());

    if (typeof window !== 'undefined' && window.electronAPI?.onAraTranscript) {
      window.electronAPI.onAraTranscript((text) =>
        setInputValue(prev => (prev ? prev + ' ' + text : text).trim())
      );
    }

    return () => { delete window.__fomoWidgetSetInput; };
  }, []);

  function toggleSpeechRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(r => r[0].transcript)
        .join('');
      setInputValue(transcript);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    onSubmit(inputValue.trim(), energyLevel);
  }

  const energyColors = { low: '#60a5fa', medium: '#a78bfa', high: '#f472b6' };

  return (
    <div className="voice-input-box">
      <div className="voice-header">
        <span className="voice-label">What are your goals tonight?</span>
        <div className="energy-selector">
          {ENERGY_LEVELS.map(level => (
            <button
              key={level}
              className={`energy-btn ${energyLevel === level ? 'active' : ''}`}
              onClick={() => setEnergyLevel(level)}
              style={energyLevel === level ? { borderColor: energyColors[level], color: energyColors[level] } : {}}
            >
              <Zap size={12} /> {level}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="voice-form">
        <div className="textarea-wrapper">
          <textarea
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="I'm in SoMa, free 7pm to midnight, high energy, AI and crypto events, want to meet investors..."
            rows={3}
            disabled={isLoading}
            className="voice-textarea"
          />
          <button
            type="button"
            onClick={toggleSpeechRecognition}
            className={`mic-btn ${isListening ? 'listening' : ''}`}
            title={isListening ? 'Stop listening' : 'Start voice input'}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        </div>

        <button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          className="submit-btn"
        >
          {isLoading ? (
            <span className="loading-text">
              <span className="spinner" /> Routing with Claude Code...
            </span>
          ) : (
            'Find My Route →'
          )}
        </button>
      </form>

      <p className="ara-hint">
        Tip: Say <em>"nc localhost 9876 &lt;&lt;&lt; 'your goals'"</em> to inject via Ara
      </p>
    </div>
  );
}
