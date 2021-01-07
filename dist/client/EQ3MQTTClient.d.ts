/// <reference types="node" />
import { Logger } from 'homebridge';
import { EventEmitter } from 'events';
export interface Device {
    rssi: number;
    bleaddr: string;
}
declare type Mode = 'auto' | 'manual' | 'holiday';
interface Status {
    trv: string;
    temp: string;
    offsetTemp: string;
    mode: Mode;
    boost: 'active' | 'inactive';
    state: 'locked' | 'unlocked';
    battery: 'GOOD' | 'LOW';
    window: 'open' | 'closed';
}
interface Options {
    mqttId: string;
    logger: Logger;
    host: string;
    port: number;
}
export declare interface EQ3MQTTClient {
    on<U extends keyof Events>(event: U, listener: Events[U]): this;
    emit<U extends keyof Events>(event: U, ...args: Parameters<Events[U]>): boolean;
}
interface Events {
    'devices-discovered': (devices: Device[]) => void;
    'change:temp': (temp: number) => void;
    'change:offsetTemp': (temp: number) => void;
    'change:mode': (mode: Mode) => void;
    'change:boost': (boost: boolean) => void;
    'change:displayOn': (on: boolean) => void;
    'change:battery': (state: 'GOOD' | 'LOW') => void;
    'change:window': (open: boolean) => void;
    'change:state': (state: Status) => void;
}
export declare class EQ3MQTTClient extends EventEmitter {
    private readonly client;
    private readonly log;
    private readonly inTopic;
    private readonly outTopic;
    constructor(props: Options);
    private handleDeviceList;
    private handleStatusUpdate;
    private sendCommand;
    scanForDevices(): void;
    setBoostMode(deviceBleAddress: string, on: boolean): void;
    setMode(deviceBleAddress: string, mode: 'manual' | 'auto'): void;
    setOffsetTemp(deviceBleAddress: string, offset: number): void;
    setTemp(deviceBleAddress: string, temp: number): void;
    setPower(deviceBleAddress: string, on: boolean): void;
}
export {};
//# sourceMappingURL=EQ3MQTTClient.d.ts.map