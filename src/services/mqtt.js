import mqtt from 'mqtt';
import { AWS_IOT } from '../config';
import { parsePayload } from './parser';

let client = null;
let onDataCallback = null;
let onStatusCallback = null;

export function mqttConnect(credentials) {
  if (client) return;

  const url = AWS_IOT.endpoint;

  client = mqtt.connect(url, {
    clientId: `casa_app_${Date.now()}`,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 10000,
  });

  client.on('connect', () => {
    console.log('MQTT connesso ad AWS IoT Core');
    if (onStatusCallback) onStatusCallback('connected');
    client.subscribe(AWS_IOT.topicStato, { qos: 0 });
  });

  client.on('message', (topic, message) => {
    if (topic === AWS_IOT.topicStato) {
      const raw = message.toString();
      const data = parsePayload(raw);
      if (onDataCallback) onDataCallback(data);
    }
  });

  client.on('close', () => {
    if (onStatusCallback) onStatusCallback('disconnected');
  });

  client.on('error', (err) => {
    console.error('MQTT errore:', err);
    if (onStatusCallback) onStatusCallback('error');
  });
}

export function mqttSendCommand(cmd) {
  if (!client || !client.connected) {
    console.warn('MQTT non connesso, comando ignorato:', cmd);
    return;
  }
  client.publish(AWS_IOT.topicCmd, cmd, { qos: 1 });
}

export function mqttDisconnect() {
  if (client) {
    client.end(true);
    client = null;
  }
}

export function onMqttData(cb) { onDataCallback = cb; }
export function onMqttStatus(cb) { onStatusCallback = cb; }
