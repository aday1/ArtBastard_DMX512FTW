declare module 'dmxnet' {
    interface DmxnetOptions {
        log?: {
            level: string;
        };
        oem?: number;
        esta?: number;
        sName?: string;
        lName?: string;
        hosts?: string[];
    }

    interface SenderOptions {
        ip: string;
        subnet: number;
        universe: number;
        net: number;
        port: number;
        base_refresh_interval: number;
    }

    interface ReceiverOptions {
        subnet: number;
        universe: number;
        net: number;
    }

    export interface PollData {
        ip: string;
        mac: string;
        name: string;
    }

    class Sender {
        ip: string;
        universe: number;
        iface: string;
        sName: string;
        setChannel(channel: number, value: number): void;
        reset(): void;
    }

    class Receiver {
        on(event: 'poll', listener: (data: PollData) => void): this;
        on(event: string, listener: Function): this;
        removeListener(event: string, listener: Function): this;
    }

    class Dmxnet {
        constructor(options: DmxnetOptions);
        newSender(options: SenderOptions): Sender;
        newReceiver(options: ReceiverOptions): Receiver;
    }

    const dmxnet: {
        dmxnet: typeof Dmxnet;
    };

    export default dmxnet;
}