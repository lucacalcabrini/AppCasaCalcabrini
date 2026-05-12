import mqtt from 'mqtt';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-browser';
import { AWS_IOT } from '../config';
import { parsePayload } from './parser';

let client = null;
let onDataCallback = null;
let onStatusCallback = null;
let reconnectEnabled = false;

const credentialsProvider = fromCognitoIdentityPool({
  identityPoolId: AWS_IOT.identityPoolId,
  clientConfig: { region: AWS_IOT.region },
});

async function buildSignedUrl() {
  const credentials = await credentialsProvider();

  const signer = new SignatureV4({
    credentials,
    region: AWS_IOT.region,
    service: 'iotdevicegateway',
    sha256: Sha256,
  });

  const signed = await signer.presign(
    {
      method: 'GET',
      protocol: 'https:',  // IoT verifica la firma in canonical form HTTPS, non WSS
      hostname: AWS_IOT.endpoint,
      path: '/mqtt',
      headers: { host: AWS_IOT.endpoint },
      query: {},
    },
    { expiresIn: 3600 },
  );

  const params = Object.entries(signed.query)
    .flatMap(([k, v]) => (Array.isArray(v) ? v.map(vi => [k, vi]) : [[k, v]]))
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

  return `wss://${AWS_IOT.endpoint}/mqtt?${params}`;
}

export async function mqttConnect() {
  if (client) return;
  reconnectEnabled = true;

  client = mqtt.connect(`wss://${AWS_IOT.endpoint}/mqtt`, {
    clientId: `casa_app_${Date.now()}`,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 10000,
    protocolVersion: 4,
    transformWsUrl: async () => {
      try {
        return await buildSignedUrl();
      } catch (e) {
        console.error('SigV4 signing fallito:', e);
        throw e;
      }
    },
  });

  client.on('connect', () => {
    console.log('MQTT connesso ad AWS IoT Core');
    if (onStatusCallback) onStatusCallback('connected');
    client.subscribe(AWS_IOT.topicStato, { qos: 0 });
  });

  client.on('message', (topic, message) => {
    if (topic === AWS_IOT.topicStato) {
      const data = parsePayload(message.toString());
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
  reconnectEnabled = false;
  if (client) {
    client.end(true);
    client = null;
  }
}

export function onMqttData(cb) { onDataCallback = cb; }
export function onMqttStatus(cb) { onStatusCallback = cb; }
