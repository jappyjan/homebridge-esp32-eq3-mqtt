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
  private readonly device: Device;
  private readonly log: Logger;
  private status = {
    temp: 0,
    targetTemp: 0,
    on: false,
  };

  constructor(
    private readonly platform: Plugin,
    private readonly accessory: PlatformAccessory,
    private readonly client: EQ3MQTTClient,
  ) {
    accessory.category = Categories.THERMOSTAT;

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
        format: Formats.UINT8,
        maxValue: HEAT_ON,
        minValue: HEAT_OFF,
        validValues: [0, 1],
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      })
      .on('get', (c) => c(null, this.status.on ? HEAT_OFF : HEAT_ON));
    this.client.on('change:state', status => {
      let isHeating = true;

      if (status.mode === 'holiday') {
        isHeating = false;
      }

      if (status.window === 'open') {
        isHeating = false;
      }

      this.status.on = isHeating;

      this.thermostatService?.setCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState, isHeating ? 'HEAT' : 'OFF');
    });

    this.thermostatService.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
      .setProps({
        format: Formats.UINT8,
        maxValue: HEAT_ON,
        minValue: HEAT_OFF,
        validValues: [HEAT_OFF, HEAT_ON],
        perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.NOTIFY],
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
        unit: Units.CELSIUS,
      })
      .on('set', this.setTargetTemperature.bind(this))
      .on('get', (c) => c(null, this.status.targetTemp));
    this.client.on('change:temp', targetTemp => {
      this.status.targetTemp = targetTemp;
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
