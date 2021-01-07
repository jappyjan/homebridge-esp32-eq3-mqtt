"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Plugin = void 0;
const settings_1 = require("../settings");
const EQ3MQTTClient_1 = require("../client/EQ3MQTTClient");
const ThermostatAccessory_1 = require("../accessory/ThermostatAccessory");
class Plugin {
    constructor(log, config, api) {
        this.log = log;
        this.config = config;
        this.api = api;
        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap.Characteristic;
        // this is used to track restored cached accessories
        this.accessories = [];
        this.log.info('Finished initializing platform:', this.config.name);
        this.client = new EQ3MQTTClient_1.EQ3MQTTClient({
            host: config.host,
            port: config.port,
            mqttId: config.mqttId,
            logger: this.log,
        });
        this.client.scanForDevices();
        // When this event is fired it means Homebridge has restored all cached accessories from disk.
        // Dynamic Platform plugins should only register new accessories after this event was fired,
        // in order to ensure they weren't added to homebridge already. This event can also be used
        // to start discovery of new accessories.
        this.api.on('didFinishLaunching', () => {
            this.log.debug('Executed didFinishLaunching callback');
            // run the method to discover / register your devices as accessories
            this.discoverDevices();
        });
    }
    /**
     * This function is invoked when homebridge restores cached accessories from disk at startup.
     * It should be used to setup event handlers for characteristics and update respective values.
     */
    configureAccessory(accessory) {
        this.log.info('Loading accessory from cache:', accessory.displayName);
        // add the restored accessory to the accessories cache so we can track if it has already been registered
        this.accessories.push(accessory);
    }
    /**
     * This is an example method showing how to register discovered accessories.
     * Accessories must only be registered once, previously created accessories
     * must not be registered again to prevent "duplicate UUID" errors.
     */
    discoverDevices() {
        this.client.on('devices-discovered', devices => {
            this.accessories.forEach(accessory => {
                this.removeAccessory(accessory);
            });
            devices.forEach(device => {
                this.addAccessory(device);
            });
        });
    }
    getUid(device) {
        return this.api.hap.uuid.generate(`jappyjan-eq3-esp32-mqtt_${device.bleaddr}`);
    }
    addAccessory(device) {
        // the accessory does not yet exist, so we need to create it
        this.log.info('Adding new accessory - ble-addrr: ', device.bleaddr);
        // create a new accessory
        const accessory = new this.api.platformAccessory(device.bleaddr, this.getUid(device), 31 /* TELEVISION */);
        // store a copy of the device object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.device = device;
        // create the accessory handler for the newly create accessory
        // this is imported from `platformAccessory.ts`
        new ThermostatAccessory_1.ThermostatAccessory(this, accessory, this.client);
        // link the accessory to your platform
        this.api.registerPlatformAccessories(settings_1.PLUGIN_NAME, settings_1.PLATFORM_NAME, [accessory]);
    }
    removeAccessory(accessory) {
        this.api.unregisterPlatformAccessories(settings_1.PLUGIN_NAME, settings_1.PLATFORM_NAME, [accessory]);
        this.log.info('Removing existing accessory from cache:', accessory.displayName);
    }
}
exports.Plugin = Plugin;
//# sourceMappingURL=Plugin.js.map