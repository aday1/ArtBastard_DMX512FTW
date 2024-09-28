declare module 'easymidi' {
    export function getInputs(): string[];
    export function getOutputs(): string[];

    export interface MidiMessage {
        _type: string;
        channel: number;
        controller: number;
        value: number;
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