// ============================================================
// mqtt.js — Connessione MQTT ad AWS IoT Core
//
// Usa mqtt.js over WebSocket.
// L'autenticazione può essere via Cognito o certificato.
// Per ora usa connessione con credenziali Cognito.
// ============================================================

import mqtt from 'mqtt';
import { AWS_IOT } from '../config';
import { parsePayload } from './parser';

let client = null;
let onDataCallback = null;
let onStatusCallback = null;

/**
 * Connette ad AWS IoT Core via WebSocket.
 * @param {object} credentials - { accessKeyId, secretAccessKey, sessionToken }
 */
export function mqttConnect(credentials) {
  if (client) return;

  const url = AWS_IOT.endpoint;

  // TODO: firmare la URL con SigV4 usando le credenziali Cognito
  // Per sviluppo iniziale, usa connessione diretta se il broker lo permette
  client = mqtt.connect(url, {
    clientId: `casa_app_${Date.now()}`,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 10000,
    // Se usi certificato client:
    // key: ..., cert: ..., ca: ...
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

/**
 * Pubblica un comando su casa/cmd.
 * @param {string} cmd - es. "0:1", "5:0", "STATO"
 */
export function mqttSendCommand(cmd) {
  if (!client || !client.connected) {
    console.warn('MQTT non connesso, comando ignorato:', cmd);
    return;
  }
  client.publish(AWS_IOT.topicCmd, cmd, { qos: 1 });
}

/**
 * Disconnette MQTT.
 */
export function mqttDisconnect() {
  if (client) {
    client.end(true);
    client = null;
  }
}

/**
 * Registra callback per dati ricevuti.
 * @param {function} cb - riceve { devices, alarms }
 */
export function onMqttData(cb) { onDataCallback = cb; }

/**
 * Registra callback per stato connessione.
 * @param {function} cb - riceve 'connected'|'disconnected'|'error'
 */
export function onMqttStatus(cb) { onStatusCallback = cb; }
