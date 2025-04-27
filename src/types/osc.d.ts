declare module 'osc' {
    export interface OscArgument {
        type: string;
        value: any;
    }

    export interface OscMessage {
        address: string;
        args: OscArgument[];
    }

    export interface OscBundle {
        packets: any[];
    }

    export interface UDPPortOptions {
        localAddress: string;
        localPort: number;
        remoteAddress?: string;
        remotePort?: number;
        metadata?: boolean;
    }

    export interface TimeTag {
        raw: [number, number];
    }

    export interface MessageInfo {
        address: string;
        port: number;
        size: number;
        family: string;
    }

    export class UDPPort {
        constructor(options: UDPPortOptions);
        on(event: 'ready', listener: () => void): this;
        on(event: 'error', listener: (error: Error) => void): this;
        on(event: 'message', listener: (msg: OscMessage, timeTag: TimeTag, info: MessageInfo) => void): this;
        on(event: 'bundle', listener: (bundle: OscBundle, timeTag: TimeTag, info: MessageInfo) => void): this;
        on(event: string, listener: (msg: OscMessage) => void): this;
        close(): void;
        open(): void;
        send(msg: { address: string; args: { type: string; value: number | string }[] }): void;
    }
}