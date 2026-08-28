export type MidiMessageHandler = (cc: number, value: number, channel: number) => void;

class MidiEngine {
  private midiAccess: MIDIAccess | null = null;
  private listeners: Set<MidiMessageHandler> = new Set();
  public isSupported: boolean = false;

  constructor() {
    this.isSupported = 'requestMIDIAccess' in navigator;
  }

  private midiAccessPromise: Promise<MIDIAccess> | null = null;

  public async init() {
    if (!this.isSupported) return false;
    
    try {
      if (!this.midiAccess) {
        if (!this.midiAccessPromise) {
          this.midiAccessPromise = navigator.requestMIDIAccess();
        }
        this.midiAccess = await this.midiAccessPromise;
        this.setupInputs();
        this.midiAccess.onstatechange = () => this.setupInputs();
      }
      return true;
    } catch (err) {
      console.warn('MIDI access denied or failed', err);
      return false;
    }
  }

  private setupInputs() {
    if (!this.midiAccess) return;
    const inputs = this.midiAccess.inputs.values();
    for (const input of inputs) {
      input.onmidimessage = this.handleMidiMessage.bind(this);
    }
  }

  private handleMidiMessage(message: MIDIMessageEvent) {
    const data = message.data;
    if (!data || data.length < 3) return;

    const command = data[0] >> 4;
    const channel = data[0] & 0xf;
    const cc = data[1];
    const value = data[2];

    // Command 11 (0xB) is Control Change
    if (command === 11) {
      this.listeners.forEach((listener) => listener(cc, value, channel));
    }
  }

  public addListener(listener: MidiMessageHandler) {
    this.listeners.add(listener);
  }

  public removeListener(listener: MidiMessageHandler) {
    this.listeners.delete(listener);
  }
}

export const midiEngine = new MidiEngine();
