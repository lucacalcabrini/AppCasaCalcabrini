import mqtt from 'mqtt';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';
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

// SigV4 presigned URL via browser-native crypto.subtle.
// aws4 (header-based) non è usabile per WebSocket nel browser perché
// l'API WebSocket non permette headers custom — serve il presigned URL con query string.

async function sha256hex(msg) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmac(key, msg) {
  const k = await crypto.subtle.importKey(
    'raw',
    typeof key === 'string' ? new TextEncoder().encode(key) : key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg)));
}

async function buildSignedUrl() {
  const { accessKeyId, secretAccessKey, sessionToken } = await credentialsProvider();

  const now = new Date();
  const datetime = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const date = datetime.slice(0, 8);
  const scope = `${date}/${AWS_IOT.region}/iotdevicegateway/aws4_request`;

  // Parametri canonical query string (ordinati alfabeticamente, senza X-Amz-Signature)
  const queryEntries = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', `${accessKeyId}/${scope}`],
    ['X-Amz-Date', datetime],
    ['X-Amz-Expires', '86400'],
    ...(sessionToken ? [['X-Amz-Security-Token', sessionToken]] : []),
    ['X-Amz-SignedHeaders', 'host'],
  ].sort(([a], [b]) => (a < b ? -1 : 1));

  const canonicalQS = queryEntries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const canonicalRequest = [
    'GET',
    '/mqtt',
    canonicalQS,
    `host:${AWS_IOT.endpoint}\n`,
    'host',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // SHA256('')
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    datetime,
    scope,
    await sha256hex(canonicalRequest),
  ].join('\n');

  const kDate    = await hmac('AWS4' + secretAccessKey, date);
  const kRegion  = await hmac(kDate,    AWS_IOT.region);
  const kService = await hmac(kRegion,  'iotdevicegateway');
  const kSigning = await hmac(kService, 'aws4_request');
  const sigBytes = await hmac(kSigning, stringToSign);
  const signature = [...sigBytes].map(b => b.toString(16).padStart(2, '0')).join('');

  const url = `wss://${AWS_IOT.endpoint}/mqtt?${canonicalQS}&X-Amz-Signature=${signature}`;
  console.debug('[MQTT] URL firmato:', url);
  return url;
}

export async function mqttConnect() {
  if (client) return;
  reconnectEnabled = true;

  let url;
  try {
    url = await buildSignedUrl();
  } catch (e) {
    console.error('[MQTT] buildSignedUrl fallito:', e);
    if (onStatusCallback) onStatusCallback('error');
    return;
  }

  client = mqtt.connect(url, {
    clientId: `casa_app_${Date.now()}`,
    clean: true,
    reconnectPeriod: 0,
    connectTimeout: 10000,
    protocolVersion: 4,
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
    const wsEvent = args[0];
    console.warn('[MQTT] close — code:', wsEvent?.code ?? 'n/d',
      '| reason:', wsEvent?.reason ?? 'n/d',
      '| wasClean:', wsEvent?.wasClean ?? 'n/d');
    if (onStatusCallback) onStatusCallback('disconnected');
    if (reconnectEnabled) {
      client = null;
      setTimeout(() => mqttConnect(), 5000);
    }
  });

  client.on('error', (err) => {
    console.error('[MQTT] error — message:', err?.message, '| code:', err?.code, '| full:', err);
    if (onStatusCallback) onStatusCallback('error');
  });
}

export function mqttSendCommand(cmd) {
  if (!client || !client.connected) {
    console.warn('[MQTT] non connesso, comando ignorato:', cmd);
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
