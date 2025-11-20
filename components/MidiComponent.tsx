import React from 'react';
import { useDevice } from '../contexts/DeviceContext';
import './MidiComponent.css';

export const MidiComponent: React.FC = () => {
  const { midiInputs, selectedMidiInputId, setSelectedMidiInputId } = useDevice();
  
  return (
    <div className="midi-controls">
      <label htmlFor="midi-select">MIDI IN:</label>
      <select
        id="midi-select"
        value={selectedMidiInputId}
        onChange={(e) => setSelectedMidiInputId(e.target.value)}
        disabled={midiInputs.length === 0}
      >
        <option value="" disabled>
          {midiInputs.length === 0 ? 'No devices' : 'Select Device'}
        </option>
        {midiInputs.map((input) => (
          <option key={input.id} value={input.id}>
            {input.name}
          </option>
        ))}
      </select>
    </div>
  );
};