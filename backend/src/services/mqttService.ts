import * as mqtt from 'mqtt';
import { CONFIG } from '../config/settings';
import { AppDataSource } from '../database';
import { GrowArea, Plant } from '../models';

export class MQTTService {
  private client: mqtt.MqttClient | null = null;
  private isConnected = false;

  async connect() {
    if (this.client) return;
    
    // Skip MQTT in development if broker is not available
    if (process.env.NODE_ENV !== 'production' && CONFIG.MQTT.BROKER === 'localhost') {
      console.log('MQTT connection skipped in development mode');
      return;
    }

    const options: mqtt.IClientOptions = {
      host: CONFIG.MQTT.BROKER,
      port: CONFIG.MQTT.PORT,
      username: CONFIG.MQTT.USERNAME,
      password: CONFIG.MQTT.PASSWORD,
      clientId: `growflow_${Date.now()}`,
      clean: true,
      connectTimeout: 30000,
      reconnectPeriod: 1000,
    };

    this.client = mqtt.connect(options);

    this.client.on('connect', () => {
      console.log('MQTT connected');
      this.isConnected = true;
      this.setupAutoDiscovery();
    });

    this.client.on('error', (error) => {
      console.error('MQTT error:', error);
    });

    this.client.on('close', () => {
      console.log('MQTT disconnected');
      this.isConnected = false;
    });
  }

  private async setupAutoDiscovery() {
    if (!this.isConnected || !this.client) return;

    try {
      const growAreas = await AppDataSource.getRepository(GrowArea).find({ relations: ['plants'] });
      
      for (const growArea of growAreas) {
        await this.publishGrowAreaDiscovery(growArea);
        
        for (const plant of growArea.plants || []) {
          await this.publishPlantDiscovery(plant);
        }
      }
    } catch (error) {
      console.error('Auto-discovery setup failed:', error);
    }
  }

  private async publishGrowAreaDiscovery(growArea: GrowArea) {
    if (!this.client) return;

    const baseConfig = {
      device: {
        identifiers: [`grow_area_${growArea.id}`],
        name: growArea.name,
        manufacturer: 'GrowFlow',
        model: 'Grow Area',
        sw_version: '1.0.0'
      },
      availability: {
        topic: `${CONFIG.MQTT.TOPIC_PREFIX}/status`,
        payload_available: 'online',
        payload_not_available: 'offline'
      }
    };

    const sensors = [
      {
        name: `${growArea.name} Temperature`,
        unique_id: `grow_area_${growArea.id}_temperature`,
        state_topic: `${CONFIG.MQTT.TOPIC_PREFIX}/grow_area/${growArea.id}/temperature`,
        unit_of_measurement: '°C',
        device_class: 'temperature',
        ...baseConfig
      },
      {
        name: `${growArea.name} Humidity`,
        unique_id: `grow_area_${growArea.id}_humidity`,
        state_topic: `${CONFIG.MQTT.TOPIC_PREFIX}/grow_area/${growArea.id}/humidity`,
        unit_of_measurement: '%',
        device_class: 'humidity',
        ...baseConfig
      },
      {
        name: `${growArea.name} VPD`,
        unique_id: `grow_area_${growArea.id}_vpd`,
        state_topic: `${CONFIG.MQTT.TOPIC_PREFIX}/grow_area/${growArea.id}/vpd`,
        unit_of_measurement: 'kPa',
        ...baseConfig
      }
    ];

    for (const sensor of sensors) {
      const topic = `homeassistant/sensor/growflow/${sensor.unique_id}/config`;
      this.client.publish(topic, JSON.stringify(sensor), { retain: true });
    }
  }

  private async publishPlantDiscovery(plant: Plant) {
    if (!this.client) return;

    const baseConfig = {
      device: {
        identifiers: [`plant_${plant.id}`],
        name: plant.name,
        manufacturer: 'GrowFlow',
        model: 'Plant',
        sw_version: '1.0.0'
      }
    };

    const sensors = [
      {
        name: `${plant.name} Phase`,
        unique_id: `plant_${plant.id}_phase`,
        state_topic: `${CONFIG.MQTT.TOPIC_PREFIX}/plant/${plant.id}/phase`,
        ...baseConfig
      },
      {
        name: `${plant.name} Days in Phase`,
        unique_id: `plant_${plant.id}_days_in_phase`,
        state_topic: `${CONFIG.MQTT.TOPIC_PREFIX}/plant/${plant.id}/days_in_phase`,
        unit_of_measurement: 'days',
        ...baseConfig
      }
    ];

    for (const sensor of sensors) {
      const topic = `homeassistant/sensor/growflow/${sensor.unique_id}/config`;
      this.client.publish(topic, JSON.stringify(sensor), { retain: true });
    }
  }

  publishGrowAreaData(growAreaId: number, data: { temperature?: number; humidity?: number; vpd?: number }) {
    if (!this.isConnected || !this.client) return;

    const baseTopic = `${CONFIG.MQTT.TOPIC_PREFIX}/grow_area/${growAreaId}`;
    
    if (data.temperature !== undefined) {
      this.client.publish(`${baseTopic}/temperature`, data.temperature.toString());
    }
    
    if (data.humidity !== undefined) {
      this.client.publish(`${baseTopic}/humidity`, data.humidity.toString());
    }
    
    if (data.vpd !== undefined) {
      this.client.publish(`${baseTopic}/vpd`, data.vpd.toFixed(2));
    }
  }

  publishPlantData(plantId: number, data: { phase?: string; daysInPhase?: number }) {
    if (!this.isConnected || !this.client) return;

    const baseTopic = `${CONFIG.MQTT.TOPIC_PREFIX}/plant/${plantId}`;
    
    if (data.phase) {
      this.client.publish(`${baseTopic}/phase`, data.phase);
    }
    
    if (data.daysInPhase !== undefined) {
      this.client.publish(`${baseTopic}/days_in_phase`, data.daysInPhase.toString());
    }
  }

  publishStatus(status: 'online' | 'offline') {
    if (!this.client) return;
    this.client.publish(`${CONFIG.MQTT.TOPIC_PREFIX}/status`, status, { retain: true });
  }

  disconnect() {
    if (this.client) {
      this.publishStatus('offline');
      this.client.end();
      this.client = null;
      this.isConnected = false;
    }
  }
}

export const mqttService = new MQTTService();