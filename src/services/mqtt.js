import mqtt from 'mqtt';
import { AWS_IOT } from '../config';
import { parsePayload } from './parser';

let client = null;
let onDataCallback = null;
let onStatusCallback = null;
let reconnectEnabled = false;

const WS_URL =
  `wss://${AWS_IOT.endpoint}/mqtt` +
  `?x-amz-customauthorizer-name=${AWS_IOT.authorizerName}` +
  `&token=${AWS_IOT.authorizerToken}`;

export function mqttConnect() {
  if (client) return;
  reconnectEnabled = true;

  client = mqtt.connect(WS_URL, {
    clientId: `casa_app_${Date.now()}`,
    clean: true,
    reconnectPeriod: 0,
    connectTimeout: 10000,
    protocolVersion: 4,
    wsOptions: {
      protocols: ['mqtt'],
    },
  });

  client.on('connect', () => {
    console.log('[MQTT] connesso ad AWS IoT Core');
    if (onStatusCallback) onStatusCallback('connected');
    client.subscribe(AWS_IOT.topicStato, { qos: 0 });
  });

  client.on('message', (topic, message) => {
    if (topic === AWS_IOT.topicStato) {
      const data = parsePayload(message.toString());
      if (onDataCallback) onDataCallback(data);
    }
  });

  client.on('close', (...args) => {
    if (onStatusCallback) onStatusCallback('disconnected');
    if (reconnectEnabled) {
      client = null;
      setTimeout(() => mqttConnect(), 5000);
    }
  });

  client.on('error', (err) => {
    if (onStatusCallback) onStatusCallback('error');
  });
}

export function mqttSendCommand(cmd) {
  if (!client || !client.connected) return;
  client.publish(AWS_IOT.topicCmd, cmd, { qos: 1 });
}

export function mqttDisconnect() {
  reconnectEnabled = false;
  if (client) {
    client.end(true);
    client = null;
  }
}

export function onMqttData(cb) { onDataCallback = cb; }
export function onMqttStatus(cb) { onStatusCallback = cb; }
