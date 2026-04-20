import React from 'react';
import ReactDOM from 'react-dom';
import { VoiceCommandComponent } from './components/VoiceCommandComponent';
import { CodeEditorComponent } from './components/CodeEditorComponent';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px', backgroundColor: '#f0f0f0', borderBottom: '1px solid #ccc' }}>
        <h1>Cursorless Voice</h1>
        <p>Voice Coding Platform</p>
      </div>
      <div style={{ flex: 1, display: 'flex' }}>
        <div style={{ flex: 1, padding: '20px' }}>
          <VoiceCommandComponent />
        </div>
        <div style={{ flex: 2, padding: '20px' }}>
          <CodeEditorComponent />
        </div>
      </div>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));