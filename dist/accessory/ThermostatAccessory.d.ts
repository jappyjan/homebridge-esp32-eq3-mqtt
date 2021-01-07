import { PlatformAccessory } from 'homebridge';
import { Plugin } from '../plugin/Plugin';
import { EQ3MQTTClient } from '../client/EQ3MQTTClient';
/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export declare class ThermostatAccessory {
    private readonly platform;
    private readonly accessory;
    private readonly client;
    private thermostatService?;
    private readonly device;
    private readonly log;
    private status;
    constructor(platform: Plugin, accessory: PlatformAccessory, client: EQ3MQTTClient);
    initializeService(): void;
    private setTargetHeatingCoolingStatus;
    private setTargetTemperature;
}
//# sourceMappingURL=ThermostatAccessory.d.ts.map