# Session 1.5: Voice Input Feature Guide

## What's New

I've added voice input functionality to your dashboard so you can create tasks by speaking. Here's what each part does:

---

## How It Works: The Web Speech API

**What is it?**
The Web Speech API is a browser feature that converts spoken words into text. Think of it like a microphone that understands speech.

**How it processes audio:**
- On iOS (iPhone): Audio is sent to Apple's servers for processing
- On Android: Audio is sent to Google's servers for processing
- On Desktop (Chrome): Audio is sent to Google's servers for processing
- All processing happens in the browser (you don't need to do anything special)

**Browser compatibility:**
- ✅ Chrome (desktop & mobile)
- ✅ Safari (iOS 14.5+)
- ✅ Edge (desktop & mobile)
- ❌ Firefox (not supported)

---

## Code Changes Explained

### 1. **Imports** (Top of file)
```javascript
import { RefreshCw, AlertCircle, CheckCircle2, Clock, Plus, LogOut, Mic, MicOff, Send, X } from 'lucide-react';
import { useRef } from 'react';
```

**What this does:**
- `Mic` and `MicOff` are icons for the microphone button
- `Send` and `X` are icons for confirm/cancel buttons
- `useRef` is a React hook that helps us keep track of the speech recognition object

### 2. **State Variables** (Inside the Dashboard component)
```javascript
const [isListening, setIsListening] = useState(false);      // Is the mic currently recording?
const [voiceTranscript, setVoiceTranscript] = useState(''); // The text that was transcribed
const [voiceError, setVoiceError] = useState(null);         // Any errors that occurred
const recognitionRef = useRef(null);                        // Reference to the speech recognizer
```

**What these do:**
- Track whether the microphone is active
- Store the text from speech-to-text conversion
- Show error messages if something goes wrong
- Keep a reference to the speech recognition object so we can control it

### 3. **Initialize Web Speech API** (useEffect hook)
This code runs once when the page loads and sets up the speech recognition:

```javascript
useEffect(() => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognition) {
    recognitionRef.current = new SpeechRecognition();

    recognitionRef.current.onresult = (event) => {
      // When speech is detected, this captures the text
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setVoiceTranscript(transcript);
    };

    recognitionRef.current.onerror = (event) => {
      // If there's an error (e.g., no microphone), show it
      setVoiceError(`Microphone error: ${event.error}`);
    };

    recognitionRef.current.onend = () => {
      // When recording stops, update the state
      setIsListening(false);
    };
  }
}, []);
```

**What this does step by step:**
1. Check if the browser supports Web Speech API
2. Create a new speech recognizer object
3. Set up a listener for when speech is recognized → update the transcript
4. Set up a listener for errors → show error message
5. Set up a listener for when recording stops → update listening state

### 4. **Handle Microphone Button Click**
```javascript
const handleMicrophoneClick = () => {
  if (!recognitionRef.current) {
    setVoiceError('Web Speech API not supported in this browser');
    return;
  }

  if (isListening) {
    recognitionRef.current.stop();  // Stop listening
    setIsListening(false);
  } else {
    setVoiceError(null);             // Clear any previous errors
    setVoiceTranscript('');          // Clear old transcript
    setIsListening(true);
    recognitionRef.current.start();  // Start listening
  }
};
```

**What this does:**
- If you tap the microphone button and it's NOT recording → start recording
- If you tap it and it IS recording → stop recording
- Clear old transcripts and errors each time you start a new recording

### 5. **Handle Voice Task Submission**
```javascript
const handleVoiceTaskSubmit = async () => {
  if (!voiceTranscript.trim()) {
    setVoiceError('Please speak a task description');
    return;
  }

  // Send the transcribed text to the backend API to save as a task
  const response = await fetch('/api/add-task', {
    method: 'POST',
    body: JSON.stringify({
      title: voiceTranscript,  // Use the speech-to-text as the task title
      category: 'personal',
      priority: 'medium',
      due_date: '',
      description: 'Created via voice input',
    }),
  });
  // ... handle the response
};
```

**What this does:**
- Takes the transcribed text and sends it to your Vercel API route
- The Vercel route then sends it to your Google Apps Script backend
- Creates a new task with the voice text as the title
- Sets default values for category, priority, etc.

### 6. **The UI Components**

**Microphone button in the header:**
When you're NOT in the voice input interface, you'll see a small microphone button next to "Add New Task".

**Voice input card:**
When recording or after recording, a card appears with:
- A large, animated microphone button (red when recording)
- "Listening..." message (animated) when the mic is active
- A text area showing the transcribed text (you can edit it)
- "Confirm & Save" button to submit the task
- "Cancel" button to discard and try again

---

## How to Use It

### On iPhone:
1. **Set up back-tap shortcut** (optional but cool):
   - Go to Settings → Accessibility → Touch → Back Tap
   - Set "Double Tap" or "Triple Tap" to open Safari and go to `https://life-admin-assistant.vercel.app/`
   
2. **Create a task by voice:**
   - Double-tap (or triple-tap) the back of your phone
   - App opens (or tap to bring to foreground)
   - Tap the microphone button
   - Speak clearly: "Call the dentist" or "Buy milk"
   - Tap the microphone button again (or it stops automatically after ~5 seconds)
   - Review the text that appeared
   - Tap "Confirm & Save"
   - Task appears in your dashboard!

### On Android or Desktop:
1. **Create a task by voice:**
   - Open the app in Chrome
   - Tap the microphone button
   - Speak clearly
   - Tap the microphone button to stop (or it stops automatically)
   - Review the text
   - Tap "Confirm & Save"
   - Done!

---

## Important Notes

### Web Speech Quality
- **Works best with:**
  - Short, clear speech: "Email John about the project"
  - Normal speaking pace
  - Quiet background (less background noise = better accuracy)

- **Struggles with:**
  - Mumbling or very fast speech
  - Unusual words or names (e.g., "Xeriscape" might be heard as "zero scape")
  - Heavy accents (varies by browser)
  - Lots of background noise

### Internet Required
- iOS requires internet connection (audio sent to Apple's servers)
- Android requires internet connection (audio sent to Google's servers)
- This is a limitation of the Web Speech API, not your app

### If Quality Is Poor
In a future session, we can switch to Claude's Whisper API for transcription:
- More accurate
- Works with longer recordings
- Costs a few pence per task (vs free with Web Speech API)
- Doesn't require specific background service setup

---

## Testing Checklist

- [ ] Desktop (Chrome): Tap mic button, speak, text appears
- [ ] Desktop (Chrome): Edit text, confirm, task is created
- [ ] iPhone (Safari): Tap mic button, speak, text appears
- [ ] iPhone (Safari): Confirm task, appears in dashboard
- [ ] iPhone: Test back-tap shortcut (Settings → Accessibility → Touch → Back Tap)
- [ ] Check error handling: Deny microphone permission, see error message
- [ ] Check that voice tasks are indistinguishable from typed tasks in the database

---

## Deploying to Production

Your code is already in the correct GitHub repository. You just need to:

1. **Commit and push the updated Dashboard.jsx:**
   ```bash
   git add src/Dashboard.jsx
   git commit -m "Session 1.5: Add voice input feature"
   git push origin main
   ```

2. **Vercel will automatically redeploy** your app when you push to the main branch.

3. **Test on your phone:**
   - Open https://life-admin-assistant.vercel.app/
   - The new microphone button should be visible

---

## Troubleshooting

**"Web Speech API not supported in this browser"**
- Make sure you're using Chrome, Safari, or Edge
- Firefox doesn't support Web Speech API yet

**Microphone permission denied**
- On iPhone: Settings → Safari → Microphone → Allow
- On Android: Grant microphone permission when prompted
- On Desktop: Allow microphone access when prompted by Chrome

**Text isn't appearing**
- Check your internet connection (Web Speech API needs it)
- Speak more clearly and not too fast
- Try a quieter environment

**Task isn't saving**
- Check that you have internet connection
- Check browser console for error messages (press F12)
- Verify your Vercel API routes are working

---

## What's Next (Session 1.6)

After testing voice input, the next session will add:
- **Subscriptions view** - see all your tracked subscriptions
- **Flagged emails view** - important messages Claude thinks you should read
- **Task history view** - completed and dismissed tasks
- **Navigation tabs** - switch between Dashboard, Subscriptions, Emails, History

This completes the frontend for Phase 1. After that, Phase 2 adds the intelligence layer (automatic email scanning).
