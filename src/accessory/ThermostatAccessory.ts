import {Categories, CharacteristicSetCallback, CharacteristicValue, Formats, Logger, Perms, PlatformAccessory, Service, Units} from 'homebridge';

import {Plugin} from '../plugin/Plugin';
import {Device, EQ3MQTTClient} from '../client/EQ3MQTTClient';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class ThermostatAccessory {
  private thermostatService?: Service;
  private batteryService?: Service;
  private readonly device: Device;
  private readonly log: Logger;

  constructor(
    private readonly platform: Plugin,
    private readonly accessory: PlatformAccessory,
    private readonly client: EQ3MQTTClient,
  ) {
    accessory.category = Categories.THERMOSTAT;

    this.device = accessory.context.device;
    this.log = platform.log;

    this.initializeThermostatService();
    this.initializeBatteryService();
  }

  private initializeThermostatService() {
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
        format: Formats.UINT8,
        maxValue: HEAT_ON,
        minValue: HEAT_OFF,
        validValues: [0, 1],
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      });
    this.thermostatService.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
      .setProps({
        format: Formats.UINT8,
        maxValue: HEAT_ON,
        minValue: HEAT_OFF,
        validValues: [HEAT_OFF, HEAT_ON],
        perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.NOTIFY],
      })
      .on('set', this.setTargetHeatingCoolingStatus.bind(this));
    this.client.on('change:state', status => {
      let isHeating = true;

      if (status.mode === 'holiday') {
        isHeating = false;
      }

      if (status.window === 'open') {
        isHeating = false;
      }

      this.thermostatService?.getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState)
        .updateValue(isHeating ? HEAT_ON : HEAT_OFF);
      this.thermostatService?.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
        .updateValue(isHeating ? HEAT_ON : HEAT_OFF);
    });

    const MIN_TEMP = 5;
    const MAX_TEMP = 29.5;
    this.thermostatService.getCharacteristic(this.platform.Characteristic.TargetTemperature)
      .setProps({
        minValue: MIN_TEMP,
        maxValue: MAX_TEMP,
        minStep: .5,
        unit: Units.CELSIUS,
      })
      .on('set', this.setTargetTemperature.bind(this));
    this.client.on('change:temp', targetTemp => {
      this.thermostatService!.getCharacteristic(this.platform.Characteristic.TargetTemperature)
        .updateValue(targetTemp);
    });
  }

  private initializeBatteryService() {
    this.log.info('Adding Thermostat service');

    this.batteryService =
      this.accessory.getService(this.platform.Service.Thermostat) ||
      this.accessory.addService(this.platform.Service.Thermostat);

    this.batteryService.getCharacteristic(this.platform.Characteristic.ChargingState)
      .updateValue(2); //Not chargable

    this.batteryService.getCharacteristic(this.platform.Characteristic.BatteryLevel).updateValue(100);
    this.batteryService.getCharacteristic(this.platform.Characteristic.StatusLowBattery).updateValue(0);
    this.client.on('change:battery', state => {
      const batteryLevel = state === 'GOOD' ? 100 : 10;
      const statusLowBattery = state === 'GOOD' ? 0 : 1;

      this.batteryService!.getCharacteristic(this.platform.Characteristic.BatteryLevel)
        .updateValue(batteryLevel);
      this.batteryService!.getCharacteristic(this.platform.Characteristic.StatusLowBattery)
        .updateValue(statusLowBattery);
    });
  }

  private setTargetHeatingCoolingStatus(
    value: CharacteristicValue,
    callback: CharacteristicSetCallback,
  ): void {
    this.log.info(`Set Target Heating Cooling State to ${value}`);

    const heatUp = value === 'HEAT';
    this.client.setPower(this.device.bleaddr, heatUp);

    callback(null);
  }

  private setTargetTemperature(
    value: CharacteristicValue,
    callback: CharacteristicSetCallback,
  ): void {
    this.log.info(`Set Target Temperature to ${value}`);

    this.client.setTemp(this.device.bleaddr, value as number);

    callback(null);
  }
}
