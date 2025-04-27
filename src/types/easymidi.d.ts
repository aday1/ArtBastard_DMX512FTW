declare module 'easymidi' {
    export function getInputs(): string[];
    export function getOutputs(): string[];

    export interface MidiMessage {
        _type: string;
        channel: number;
        controller?: number;
        value?: number;
        note?: number;
        velocity?: number;
        number?: number;  // Added for program change messages
        source?: string;
    }

    export class Input {
        constructor(name: string);
        on(event: string, callback: (msg: MidiMessage) => void): void;
        close(): void;
    }

    export class Output {
        constructor(name: string);
    }
}