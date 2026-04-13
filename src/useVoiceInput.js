import { useState, useCallback, useRef } from 'react';

/**
 * Custom Hook: useVoiceInput
 *
 * This hook handles speech-to-text conversion using the browser's Web Speech API.
 * It provides methods to start/stop recording and returns the transcribed text.
 *
 * Why a custom hook? Instead of putting all this code in Dashboard.jsx,
 * we separate it into its own "hook" so we can reuse it elsewhere and keep
 * Dashboard.jsx clean and readable.
 *
 * Usage:
 *   const { isListening, transcript, startListening, stopListening } = useVoiceInput();
 */

export const useVoiceInput = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  // Initialize the Web Speech API (handles browser compatibility)
  const initializeRecognition = useCallback(() => {
    // Check browser support (webkit prefix for Safari on iOS)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in your browser');
      return null;
    }

    const recognition = new SpeechRecognition();

    // Configuration
    recognition.continuous = false; // Stop after user stops talking
    recognition.interimResults = false; // Don't show results while talking
    recognition.lang = 'en-US'; // English (US)

    // When speech is recognized (final result)
    recognition.onresult = (event) => {
      let finalTranscript = '';

      // Combine all recognized words into one string
      for (let i = event.resultIndex; i < event.results.length; i++) {
        finalTranscript += event.results[i][0].transcript;
      }

      setTranscript(finalTranscript.trim());
      setError(null);
    };

    // When recording starts
    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setTranscript('');
    };

    // When recording stops
    recognition.onend = () => {
      setIsListening(false);
    };

    // Handle errors
    recognition.onerror = (event) => {
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    return recognition;
  }, []);

  // Start listening for voice input
  const startListening = useCallback(() => {
    if (isListening) return; // Already listening

    const recognition = recognitionRef.current || initializeRecognition();
    if (recognition) {
      recognition.start();
    }
  }, [isListening, initializeRecognition]);

  // Stop listening and return the transcript
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  // Clear the transcript
  const clearTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    clearTranscript,
  };
};
