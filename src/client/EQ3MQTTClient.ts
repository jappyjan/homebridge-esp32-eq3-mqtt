import {Logger} from 'homebridge';
import {Client, connect as MQTTConnect} from 'mqtt';
import {EventEmitter} from 'events';
import {roundToHalf} from '../utils';

interface DeviceList {
  devices: Device[];
}

export interface Device {
  rssi: number;
  bleaddr: string;
}

type Mode = 'auto' | 'manual' | 'holiday';

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
  on<U extends keyof Events>(
    event: U, listener: Events[U],
  ): this;

  emit<U extends keyof Events>(
    event: U, ...args: Parameters<Events[U]>
  ): boolean;
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

export class EQ3MQTTClient extends EventEmitter {
  private readonly client: Client;
  private readonly log: Logger;
  private readonly inTopic: string;
  private readonly outTopic: string;

  constructor(props: Options) {
    super();
    this.log = props.logger;

    if (props.mqttId.startsWith('/')) {
      props.mqttId = props.mqttId.substr(1);
    }
    if (props.mqttId.endsWith('/')) {
      props.mqttId = props.mqttId.substr(0, props.mqttId.length - 1);
    }

    this.inTopic = `/${props.mqttId}radin`;
    this.outTopic = `/${props.mqttId}radout`;

    this.log.info(`in topic: ${this.inTopic}`);
    this.log.info(`out topic: ${this.outTopic}`);

    this.log.debug(`connecting to MQTT broker. mqtt://${props.host}:${props.port}`);
    this.client = MQTTConnect('mqtt://' + props.host, {
      port: props.port,
    });

    this.client.on('connect', () => {
      this.log.debug('connected to MQTT broker!');

      const topicsToSubscribe = [
        this.outTopic + '/#',
      ];

      new Promise<void>((resolve) => {
        let subscriptionsCount = 0;
        topicsToSubscribe.forEach(topic => {
          this.client.subscribe(topic, (err, granted) => {
            subscriptionsCount++;
            if (subscriptionsCount >= topicsToSubscribe.length) {
              resolve();
            }

            if (err) {
              this.log.error(`error during subscribe (${topic})`, err);
              return;
            }

            this.log.debug('subscription granted', granted);
          });
        });
      }).then(() => this.scanForDevices());
    });

    this.client.on('message', async (topic, payload) => {
      const message = payload.toString();

      this.log.debug('received mqtt', topic);
      switch (topic) {
        case this.outTopic + '/devlist':
          this.handleDeviceList(message);
          break;

        case this.outTopic + '/status':
          this.handleStatusUpdate(message);
          break;
      }
    });
  }

  private handleDeviceList(payload: string) {
    const deviceList = JSON.parse(payload) as DeviceList;
    this.log.debug('received device list', deviceList.devices);
    this.emit('devices-discovered', deviceList.devices);

    deviceList.devices.forEach(device => {
      this.setDisplayLock(device.bleaddr, true);
    });
  }

  private handleStatusUpdate(payload: string) {
    const status = JSON.parse(payload) as Status;

    this.log.debug('received status', status);

    this.emit('change:temp', Number(status.temp));
    this.emit('change:offsetTemp', Number(status.offsetTemp));
    this.emit('change:mode', status.mode);
    this.emit('change:boost', status.boost === 'active');
    this.emit('change:displayOn', status.state === 'unlocked');
    this.emit('change:battery', status.battery);
    this.emit('change:window', status.window === 'open');
    this.emit('change:state', status);
  }

  private sendCommand(deviceBleAddress: string, action: string, param?: string) {
    this.client.publish(this.inTopic + '/trv', `${deviceBleAddress} ${action} ${param || ''}`.trim());
  }

  public scanForDevices() {
    this.log.debug('send scan command');
    this.client.publish(this.inTopic + '/scan', 'scan');
  }

  public setBoostMode(deviceBleAddress: string, on: boolean) {
    let action = 'unboost';
    if (on) {
      action = 'boost';
    }

    this.log.info(`set boost mode to ${action}`);

    this.sendCommand(deviceBleAddress, action);
  }

  public setMode(deviceBleAddress: string, mode: 'manual' | 'auto') {
    this.log.info(`set mode to ${mode}`);
    this.sendCommand(deviceBleAddress, mode);
  }

  public setOffsetTemp(deviceBleAddress: string, offset: number) {
    this.log.info(`set offset-temperature to ${offset}`);
    this.sendCommand(deviceBleAddress, 'offset', roundToHalf(offset).toString());
  }

  public setTemp(deviceBleAddress: string, temp: number) {
    this.log.info(`set temperature to ${temp}`);
    this.sendCommand(deviceBleAddress, 'settemp', roundToHalf(temp).toString());
  }

  public setPower(deviceBleAddress: string, on: boolean) {
    let action = 'off';
    if (on) {
      action = 'on';
    }

    this.log.info(`set power to ${action}`);

    this.sendCommand(deviceBleAddress, action);
  }

  public setDisplayLock(deviceBleAddress: string, locked: boolean) {
    let action = 'unlock';
    if (locked) {
      action = 'lock';
    }

    this.log.info(`set display lock to ${action}`);

    this.sendCommand(deviceBleAddress, action);
  }
}
