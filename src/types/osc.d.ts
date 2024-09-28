declare module 'osc' {
    export interface OscMessage {
        address: string;
        args: any[];
    }

    export interface UDPPortOptions {
        localAddress: string;
        localPort: number;
        remoteAddress: string;
        remotePort: number;
    }

    export class UDPPort {
        constructor(options: UDPPortOptions);
        on(event: string, listener: (msg: OscMessage) => void): this;
        on(event: 'error', listener: (error: Error) => void): this;
        close(): void;
        open(): void;
        send(msg: { address: string; args: { type: string; value: number | string }[] }): void;
    }
}