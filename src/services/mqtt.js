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
      protocol: 'wss:',
      hostname: AWS_IOT.endpoint,
      path: '/mqtt',
      headers: { host: AWS_IOT.endpoint },
      query: {},
    },
    { expiresIn: 3600 },
  );

  const params = Object.entries(signed.query)
    .flatMap(([k, v]) => (Array.isArray(v) ? v.map(vi => [k, vi]) : [[k, v]]))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  return `wss://${AWS_IOT.endpoint}/mqtt?${params}`;
}

export async function mqttConnect() {
  if (client) return;
  reconnectEnabled = true;

  let url;
  try {
    url = await buildSignedUrl();
  } catch (e) {
    console.error('Cognito/SigV4 fallito:', e);
    if (onStatusCallback) onStatusCallback('error');
    return;
  }

  client = mqtt.connect(url, {
    clientId: `casa_app_${Date.now()}`,
    clean: true,
    reconnectPeriod: 0,   // gestiamo noi il reconnect per rinnovare l'URL firmato
    connectTimeout: 10000,
    protocolVersion: 4,
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
    if (reconnectEnabled) {
      // Nuovo URL firmato ad ogni riconnessione (le credenziali Cognito scadono in ~1h)
      setTimeout(() => {
        client = null;
        mqttConnect();
      }, 5000);
    }
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
