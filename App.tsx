import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Note, GeolocationCoordinates } from './types';
import NoteCard from './components/NoteCard';
import { summarizeNote } from './services/geminiService';
import { MicrophoneIcon, StopIcon } from './components/icons';

// FIX: Define a minimal interface for the non-standard SpeechRecognition API
// to provide type-safety for the ref. The built-in TypeScript DOM libraries
// do not include this experimental API, leading to type errors.
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

// For cross-browser compatibility with the Web Speech API
// FIX: Cast `window` to `any` to access vendor-prefixed/non-standard SpeechRecognition properties.
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const isSpeechRecognitionSupported = !!SpeechRecognition;

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  // FIX: Use the custom interface for the SpeechRecognition instance ref to fix the type error.
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Load notes from local storage on initial render
  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem('voice-notes');
      if (savedNotes) {
        setNotes(JSON.parse(savedNotes));
      }
    } catch (err) {
      console.error("Failed to load notes from localStorage", err);
      setError("Could not load saved notes.");
    }
  }, []);

  // Save notes to local storage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('voice-notes', JSON.stringify(notes));
    } catch (err) {
      console.error("Failed to save notes to localStorage", err);
      setError("Could not save new note.");
    }
  }, [notes]);

  const getCurrentLocation = (): Promise<GeolocationCoordinates | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position.coords),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const handleStartRecording = useCallback(() => {
    if (!isSpeechRecognitionSupported) {
      setError("Speech recognition is not supported in your browser.");
      return;
    }
    if (isRecording || recognitionRef.current) {
        return;
    }

    setError(null);
    setCurrentTranscript('');
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setCurrentTranscript(finalTranscript + interimTranscript);
    };

    recognition.onerror = (event) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setError('Microphone access denied. Please allow microphone access in your browser settings.');
        } else {
            setError(`Speech recognition error: ${event.error}`);
        }
        setIsRecording(false);
        recognitionRef.current = null;
    };

    recognition.onend = () => {
        // This can fire prematurely, so we only nullify the ref
        // if we are not in a recording state.
        if (!isRecording) {
            recognitionRef.current = null;
        }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  }, [isRecording]);

  const handleStopRecording = useCallback(async () => {
    if (!recognitionRef.current) return;
    
    recognitionRef.current.stop();
    setIsRecording(false);

    // Give a moment for final results to process.
    setTimeout(async () => {
        if (currentTranscript.trim()) {
            const location = await getCurrentLocation();
            const newNote: Note = {
                id: crypto.randomUUID(),
                text: currentTranscript.trim(),
                timestamp: Date.now(),
                location,
            };
            setNotes(prevNotes => [newNote, ...prevNotes]);
        }
        setCurrentTranscript('');
        recognitionRef.current = null;
    }, 500);
  }, [currentTranscript]);

  const handleSummarize = async (noteId: string) => {
    setNotes(notes => notes.map(n => n.id === noteId ? { ...n, isSummarizing: true } : n));
    const noteToSummarize = notes.find(n => n.id === noteId);

    if (noteToSummarize) {
      try {
        const summary = await summarizeNote(noteToSummarize.text);
        setNotes(notes => notes.map(n => n.id === noteId ? { ...n, summary, isSummarizing: false } : n));
      } catch (err) {
        setError((err as Error).message);
        setNotes(notes => notes.map(n => n.id === noteId ? { ...n, isSummarizing: false } : n));
      }
    }
  };

  const handleShare = async (note: Note) => {
    if (!navigator.share) {
      setError("Sharing is not supported on your browser.");
      return;
    }

    let shareText = `Voice Note (${new Date(note.timestamp).toLocaleString()}):\n\n${note.text}`;
    
    if (note.location) {
      shareText += `\n\nLocation: https://www.google.com/maps/search/?api=1&query=${note.location.latitude},${note.location.longitude}`;
    }

    if (note.summary) {
      shareText += `\n\nAI Summary:\n${note.summary}`;
    }

    try {
      await navigator.share({
        title: 'Voice Note',
        text: shareText,
      });
    } catch (err) {
      // Avoid showing an error if the user cancels the share dialog
      if ((err as Error).name !== 'AbortError') {
        console.error("Share failed:", err);
        setError("An error occurred while trying to share the note.");
      }
    }
  };
  
  const renderContent = () => {
    if (!isSpeechRecognitionSupported) {
        return <div className="text-center p-8 text-red-400">Sorry, your browser does not support speech recognition. Please try Chrome or Safari.</div>
    }
    
    if (isRecording) {
        return (
             <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-50">
                <div className="w-full max-w-2xl flex-grow flex flex-col justify-center">
                    <p className="text-gray-300 text-lg min-h-[12rem]">{currentTranscript || 'Listening...'}</p>
                </div>
                <button
                    onClick={handleStopRecording}
                    className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
                    aria-label="Stop recording"
                >
                    <StopIcon className="w-10 h-10 text-white" />
                </button>
            </div>
        )
    }

    return (
        <>
            <div className="space-y-4 p-4">
                {notes.length > 0 ? (
                    notes.map(note => <NoteCard key={note.id} note={note} onSummarize={handleSummarize} onShare={handleShare} />)
                ) : (
                    <div className="text-center py-16 text-gray-500">
                        <p className="text-lg">No notes yet.</p>
                        <p>Tap the microphone to start your first note.</p>
                    </div>
                )}
            </div>
            <button
                onClick={handleStartRecording}
                className="fixed bottom-6 right-6 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-xl transition-transform hover:scale-110 active:scale-100"
                aria-label="Start recording"
            >
                <MicrophoneIcon className="w-8 h-8 text-white" />
            </button>
        </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 font-sans">
      <header className="bg-gray-800/80 backdrop-blur-md sticky top-0 z-10 shadow-md">
        <div className="max-w-4xl mx-auto p-4">
          <h1 className="text-2xl font-bold text-center text-white">Voice Notes AI</h1>
        </div>
      </header>
      <main className="max-w-4xl mx-auto pb-24">
        {error && (
            <div className="m-4 p-4 bg-red-900/50 border border-red-700 text-red-300 rounded-lg" role="alert">
                <p><span className="font-bold">Error:</span> {error}</p>
            </div>
        )}
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
