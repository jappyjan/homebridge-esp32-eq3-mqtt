"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EQ3MQTTClient = void 0;
const mqtt_1 = require("mqtt");
const events_1 = require("events");
const utils_1 = require("../utils");
class EQ3MQTTClient extends events_1.EventEmitter {
    constructor(props) {
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
        this.client = mqtt_1.connect('mqtt://' + props.host, {
            port: props.port,
        });
        this.client.on('connect', () => {
            this.log.debug('connected to MQTT broker!');
            const topicsToSubscribe = [
                this.outTopic + '/#',
            ];
            new Promise((resolve) => {
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
    handleDeviceList(payload) {
        const deviceList = JSON.parse(payload);
        this.log.debug('received device list', deviceList.devices);
        this.emit('devices-discovered', deviceList.devices);
        deviceList.devices.forEach(device => {
            this.setDisplayLock(device.bleaddr, true);
        });
    }
    handleStatusUpdate(payload) {
        const status = JSON.parse(payload);
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
    sendCommand(deviceBleAddress, action, param) {
        this.client.publish(this.inTopic + '/trv', `${deviceBleAddress} ${action} ${param || ''}`.trim());
    }
    scanForDevices() {
        this.log.debug('send scan command');
        this.client.publish(this.inTopic + '/scan', 'scan');
    }
    setBoostMode(deviceBleAddress, on) {
        let action = 'unboost';
        if (on) {
            action = 'boost';
        }
        this.log.info(`set boost mode to ${action}`);
        this.sendCommand(deviceBleAddress, action);
    }
    setMode(deviceBleAddress, mode) {
        this.log.info(`set mode to ${mode}`);
        this.sendCommand(deviceBleAddress, mode);
    }
    setOffsetTemp(deviceBleAddress, offset) {
        this.log.info(`set offset-temperature to ${offset}`);
        this.sendCommand(deviceBleAddress, 'offset', utils_1.roundToHalf(offset).toString());
    }
    setTemp(deviceBleAddress, temp) {
        this.log.info(`set temperature to ${temp}`);
        this.sendCommand(deviceBleAddress, 'settemp', utils_1.roundToHalf(temp).toString());
    }
    setPower(deviceBleAddress, on) {
        let action = 'off';
        if (on) {
            action = 'on';
        }
        this.log.info(`set power to ${action}`);
        this.sendCommand(deviceBleAddress, action);
    }
    setDisplayLock(deviceBleAddress, locked) {
        let action = 'lock';
        if (locked) {
            action = 'unlock';
        }
        this.log.info(`set display lock to ${action}`);
        this.sendCommand(deviceBleAddress, action);
    }
}
exports.EQ3MQTTClient = EQ3MQTTClient;
//# sourceMappingURL=EQ3MQTTClient.js.map