"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThermostatAccessory = void 0;
/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
class ThermostatAccessory {
    constructor(platform, accessory, client) {
        this.platform = platform;
        this.accessory = accessory;
        this.client = client;
        this.status = {
            temp: 0,
            targetTemp: 0,
            on: false,
        };
        accessory.category = 9 /* THERMOSTAT */;
        this.device = accessory.context.device;
        this.log = platform.log;
        this.initializeService();
    }
    initializeService() {
        this.log.info('Adding Thermostat service');
        this.thermostatService =
            this.accessory.getService(this.platform.Service.Thermostat) ||
                this.accessory.addService(this.platform.Service.Thermostat);
        // 0 = CELSIUS, 1 = FAHRENHEIT
        this.thermostatService.setCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits, 0);
        const HEAT_ON = 1;
        const HEAT_OFF = 0;
        this.thermostatService.getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState)
            .setProps({
            format: "uint8" /* UINT8 */,
            maxValue: HEAT_ON,
            minValue: HEAT_OFF,
            validValues: [0, 1],
            perms: ["pr" /* PAIRED_READ */, "ev" /* NOTIFY */],
        })
            .on('get', (c) => c(null, this.status.on ? HEAT_OFF : HEAT_ON));
        this.client.on('change:state', status => {
            var _a;
            let isHeating = true;
            if (status.mode === 'holiday') {
                isHeating = false;
            }
            if (status.window === 'open') {
                isHeating = false;
            }
            this.status.on = isHeating;
            (_a = this.thermostatService) === null || _a === void 0 ? void 0 : _a.setCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState, isHeating ? 'HEAT' : 'OFF');
        });
        this.thermostatService.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
            .setProps({
            format: "uint8" /* UINT8 */,
            maxValue: HEAT_ON,
            minValue: HEAT_OFF,
            validValues: [HEAT_OFF, HEAT_ON],
            perms: ["pr" /* PAIRED_READ */, "pw" /* PAIRED_WRITE */, "ev" /* NOTIFY */],
        })
            .on('set', this.setTargetHeatingCoolingStatus.bind(this))
            .on('get', (c) => c(null, this.status.on ? HEAT_OFF : HEAT_ON));
        const MIN_TEMP = 5;
        const MAX_TEMP = 29.5;
        this.thermostatService.getCharacteristic(this.platform.Characteristic.TargetTemperature)
            .setProps({
            minValue: MIN_TEMP,
            maxValue: MAX_TEMP,
            minStep: .5,
            unit: "celsius" /* CELSIUS */,
        })
            .on('set', this.setTargetTemperature.bind(this))
            .on('get', (c) => c(null, this.status.targetTemp));
        this.client.on('change:temp', targetTemp => {
            this.status.targetTemp = targetTemp;
        });
    }
    setTargetHeatingCoolingStatus(value, callback) {
        this.log.info(`Set Target Heating Cooling State to ${value}`);
        const heatUp = value === 'HEAT';
        this.client.setPower(this.device.bleaddr, heatUp);
        callback(null);
    }
    setTargetTemperature(value, callback) {
        this.log.info(`Set Target Temperature to ${value}`);
        this.client.setTemp(this.device.bleaddr, value);
        callback(null);
    }
}
exports.ThermostatAccessory = ThermostatAccessory;
//# sourceMappingURL=ThermostatAccessory.js.map