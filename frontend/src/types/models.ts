export interface PhaseTemplate {
  name: string;
  duration_min: number;
  duration_max: number;
  description?: string;
  automation_settings?: {
    light_schedule?: string;
    vpd_target?: number;
  };
}

export interface PlantPhaseInstance {
  id: string;
  name: string;
  start_date?: string;
  duration_min: number;
  duration_max: number;
  description?: string;
  is_active: boolean;
  is_completed: boolean;
  notes?: string;
  automation_settings?: {
    light_schedule?: string;
    vpd_target?: number;
  };
}

export interface GrowArea {
  id: number;
  name: string;
  type: 'indoor' | 'outdoor';
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  equipment: {
    lights: string[];
    fans: string[];
    humidifier?: string;
    dehumidifier?: string;
    heater?: string;
  };
  sensors: {
    temperature: string;
    humidity: string;
    co2?: string;
    light_intensity?: string;
  };
  automation_enabled: boolean;
  target_vpd_by_phase: {
    germination: number;
    seedling: number;
    vegetation: number;
    flowering: number;
  };
  created_at: Date;
  updated_at: Date;
  plants?: Plant[];
}

// Legacy enum removed - now using dynamic phase names

export interface PlantEvent {
  id: string;
  timestamp: string;
  type: 'watering' | 'feeding' | 'observation' | 'training' | 'harvest' | 'transplant' | 'custom';
  title: string;
  description?: string;
  data?: {
    // Watering data
    amount_ml?: number;
    ph_level?: number;
    ec_ppm?: number;
    water_temperature?: number;
    runoff_ph?: number;
    runoff_ec?: number;
    
    // Feeding data
    nutrients?: Array<{
      name: string;
      amount_ml: number;
      npk_ratio?: string;
    }>;
    
    // Observation data
    observation_type?: 'health' | 'training' | 'deficiency' | 'pest' | 'general';
    severity?: 'low' | 'medium' | 'high';
    resolved?: boolean;
    
    // Training data
    training_method?: string;
    
    // Harvest data
    wet_weight?: number;
    dry_weight?: number;
    
    // Photos for any event type
    photos?: string[];
    
    // Custom data for extensibility
    custom_fields?: { [key: string]: any };
  };
  notes?: string;
  phase_id?: string; // Link to which phase this event occurred in
}

export interface Plant {
  id: number;
  grow_area_id: number;
  name: string;
  strain: string;
  breeder?: string;
  phenotype?: string;
  phases: PlantPhaseInstance[];
  events: PlantEvent[];
  light_schedule: {
    vegetation: string;
    flowering: string;
  };
  medium: 'soil' | 'hydro' | 'coco' | 'dwc';
  pot_size_liters: number;
  training_methods: string[];
  notes?: string;
  is_active: boolean;
  is_mother_plant: boolean;
  created_at: Date;
  updated_at: Date;
  // Current phase computed from phases array
}

export interface Strain {
  id: number;
  name: string;
  abbreviation?: string;
  type: string;
  is_autoflower: boolean;
  flowering_time_min: number;
  flowering_time_max: number;
  description?: string;
  breeder?: string;
  thc_content?: number;
  cbd_content?: number;
  phase_templates: PhaseTemplate[];
  created_at: Date;
  updated_at: Date;
}

export interface WateringLog {
  id: number;
  plant_id: number;
  timestamp: Date;
  amount_ml: number;
  ph_level?: number;
  ec_ppm?: number;
  water_temperature?: number;
  runoff_ph?: number;
  runoff_ec?: number;
  notes?: string;
}

export interface FeedingLog {
  id: number;
  plant_id: number;
  timestamp: Date;
  nutrients: Array<{
    name: string;
    amount_ml: number;
    npk_ratio?: string;
  }>;
  ph_level?: number;
  ec_ppm?: number;
  notes?: string;
}

export interface ObservationLog {
  id: number;
  plant_id: number;
  timestamp: Date;
  observation_type: 'health' | 'training' | 'deficiency' | 'pest' | 'general';
  description: string;
  severity?: 'low' | 'medium' | 'high';
  photos?: string[];
  resolved: boolean;
}