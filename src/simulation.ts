import { World } from './world';
import { Logger } from './logger';
import { Renderer } from './renderer';
import { DNA } from './dna';
import { Fluffles } from './animals/fluffles';

export class Simulation {
  private world: World;
  private logger: Logger;
  private renderer: Renderer;
  private running: boolean = false;
  private tickInterval: number = 800; // milliseconds
  private timer: NodeJS.Timeout | null = null;
  private disasterActive: boolean = false;
  private disasterType: string = '';
  private disasterDuration: number = 0;
  private disasterIntensity: number = 0;
  private paused: boolean = false;
  
  constructor(worldWidth: number, worldHeight: number) {
    // Create logger with console output disabled but file output enabled
    this.logger = new Logger(false, true);
    this.world = new World(worldWidth, worldHeight, this.logger);
    this.renderer = new Renderer(this.world, this.logger);
    
    // Slower tick rate for better visualization
    this.tickInterval = 800; // milliseconds
    
    // Connect speed controls
    this.renderer.onSpeedChange((factor: number) => {
      this.tickInterval = Math.max(100, Math.min(2000, this.tickInterval * factor));
      this.logger.log(`Simulation speed changed to ${Math.round(1000/this.tickInterval)} ticks/second`);
      
      // Restart the timer if running
      if (this.running && this.timer) {
        clearInterval(this.timer);
        this.timer = setInterval(() => {
          this.tick();
        }, this.tickInterval);
      }
    });
    
    // Connect disaster info to renderer
    this.renderer.updateDisasterInfo(this.disasterActive, this.disasterType, this.disasterDuration, this.disasterIntensity);
    
    // Connect pause toggle
    this.renderer.onPauseToggle(() => {
      this.paused = !this.paused;
      this.logger.log(`Simulation ${this.paused ? 'paused' : 'resumed'}`);
    });
    
    this.logger.log('Simulation initialized');
  }
  
  initialize(numFluffles: number): void {
    // Limit initial population to the world's capacity
    const maxPopulation = this.world.getMaxPopulation();
    const actualFluffles = Math.min(numFluffles, maxPopulation);
    
    if (actualFluffles < numFluffles) {
      this.logger.log(`Limiting initial population to ${actualFluffles} (world capacity)`);
    }
    
    // Add initial animals
    for (let i = 0; i < actualFluffles; i++) {
      const dna = new DNA();
      const position = {
        x: Math.floor(Math.random() * this.world.getWidth()),
        y: Math.floor(Math.random() * this.world.getHeight())
      };
      
      const fluffles = new Fluffles(dna, position, this.world, this.logger);
      this.world.addAnimal(fluffles);
    }
    
    this.logger.log(`Added ${actualFluffles} fluffles to the world`);
  }
  
  start(): void {
    if (this.running) return;
    
    this.running = true;
    this.logger.log('Simulation started');
    
    // Start the simulation loop
    this.timer = setInterval(() => {
      this.tick();
    }, this.tickInterval);
  }
  
  stop(): void {
    if (!this.running) return;
    
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    this.logger.log('Simulation stopped');
    this.logger.close();
  }
  
  tick(): void {
    // Skip updates if paused
    if (this.paused) {
      // Still render to show the paused state
      this.renderer.render();
      return;
    }
    
    // Update the world
    this.world.update();
    
    // Check for reproduction opportunities
    this.checkReproduction();
    
    // Handle ongoing disasters
    if (this.disasterActive) {
      this.updateDisaster();
    } else {
      // Occasionally introduce environmental challenges or disasters
      if (Math.random() < 0.005) { // 0.5% chance per tick
        this.introduceChallenge();
      }
      
      // Even more rarely, trigger a major disaster
      if (Math.random() < 0.001) { // 0.1% chance per tick
        this.triggerDisaster();
      }
    }
    
    // Render the current state
    this.renderer.render();
  }
  
  private checkReproduction(): void {
    // This is now handled by the Fluffles class's mating behavior
    // We don't need to check for reproduction here anymore
  }
  
  private introduceChallenge(): void {
    const challengeType = Math.random();
    
    if (challengeType < 0.3) {
      // Food shortage
      this.logger.log("Environmental event: Food shortage affecting the ecosystem");
      this.reduceWorldFood(0.3); // Reduce food by 30%
    } else if (challengeType < 0.6) {
      // Disease
      this.logger.log("Environmental event: Disease spreading among animals");
      this.applyDisease();
    } else {
      // Harsh weather
      this.logger.log("Environmental event: Harsh weather conditions");
      this.applyHarshWeather();
    }
  }
  
  private reduceWorldFood(percentage: number): void {
    // Implementation to reduce food in the world
    for (let y = 0; y < this.world.getHeight(); y++) {
      for (let x = 0; x < this.world.getWidth(); x++) {
        const position = { x, y };
        const tile = this.world.getTile(position);
        if (tile && tile.type === 'grass') {
          const reduction = tile.foodValue * percentage;
          this.world.consumeFood(position, reduction);
        }
      }
    }
  }
  
  private applyDisease(): void {
    // Implementation to apply disease effects to some animals
    const animals = this.world.getAllAnimals();
    const affectedCount = Math.ceil(animals.length * 0.2); // Affect 20% of population
    
    for (let i = 0; i < affectedCount; i++) {
      const randomIndex = Math.floor(Math.random() * animals.length);
      const animal = animals[randomIndex];
      
      // Apply health reduction
      const stats = animal.getStats();
      stats.health -= 20;
      
      if (Math.random() < 0.3) {
        this.logger.log(`Animal ${animal.getId().substring(0, 6)} affected by disease`);
      }
    }
  }
  
  private applyHarshWeather(): void {
    // Implementation to apply harsh weather effects
    const animals = this.world.getAllAnimals();
    
    animals.forEach(animal => {
      // Harsh weather affects energy levels
      const stats = animal.getStats();
      stats.energy = Math.max(10, stats.energy - 10);
    });
  }
  
  setTickInterval(interval: number): void {
    this.tickInterval = interval;
    
    // Restart the timer if running
    if (this.running && this.timer) {
      clearInterval(this.timer);
      this.timer = setInterval(() => {
        this.tick();
      }, this.tickInterval);
    }
  }
  
  // Add a method to limit log frequency
  private shouldLog(animalId: string): boolean {
    // Only log about 10% of animal actions to reduce log spam
    return Math.random() < 0.1;
  }
  
  // Add a method to trigger major disasters
  private triggerDisaster(): void {
    const disasterTypes = ['earthquake', 'drought', 'disease', 'coldSnap'];
    const disasterType = disasterTypes[Math.floor(Math.random() * disasterTypes.length)];
    
    // Set disaster parameters
    this.disasterActive = true;
    this.disasterType = disasterType;
    this.disasterDuration = 20 + Math.floor(Math.random() * 30); // 20-50 ticks
    this.disasterIntensity = 0.5 + (Math.random() * 0.5); // 0.5-1.0 intensity
    
    this.logger.log(`MAJOR DISASTER: A ${disasterType} has struck the world! (Intensity: ${Math.round(this.disasterIntensity * 100)}%)`);
    
    // Apply initial disaster effects
    this.applyDisasterEffects();
    
    // Update renderer with new disaster info
    this.renderer.updateDisasterInfo(this.disasterActive, this.disasterType, this.disasterDuration, this.disasterIntensity);
  }
  
  // Add a method to update ongoing disasters
  private updateDisaster(): void {
    // Continue applying effects
    this.applyDisasterEffects();
    
    // Decrease duration
    this.disasterDuration--;
    
    // Check if disaster has ended
    if (this.disasterDuration <= 0) {
      this.logger.log(`The ${this.disasterType} has ended. The world begins to recover.`);
      this.disasterActive = false;
      this.disasterType = '';
    }
    
    // Update renderer with current disaster info
    this.renderer.updateDisasterInfo(this.disasterActive, this.disasterType, this.disasterDuration, this.disasterIntensity);
  }
  
  // Add a method to apply disaster effects
  private applyDisasterEffects(): void {
    const animals = this.world.getAllAnimals();
    
    switch (this.disasterType) {
      case 'earthquake':
        // Earthquakes damage terrain and injure animals
        if (Math.random() < 0.3) {
          // Damage random terrain
          for (let i = 0; i < 5; i++) {
            const x = Math.floor(Math.random() * this.world.getWidth());
            const y = Math.floor(Math.random() * this.world.getHeight());
            const position = { x, y };
            
            const tile = this.world.getTile(position);
            if (tile && tile.type === 'grass') {
              // Reduce food value
              this.world.consumeFood(position, tile.foodValue * this.disasterIntensity);
            }
          }
        }
        
        // Injure random animals
        animals.forEach(animal => {
          if (Math.random() < this.disasterIntensity * 0.2) {
            const stats = animal.getStats();
            stats.health -= Math.floor(20 * this.disasterIntensity);
            
            if (Math.random() < 0.1) {
              this.logger.log(`Animal ${animal.getId().substring(0, 6)} was injured by the earthquake`);
            }
          }
        });
        break;
        
      case 'drought':
        // Droughts reduce food everywhere
        if (this.disasterDuration % 5 === 0) {
          for (let y = 0; y < this.world.getHeight(); y++) {
            for (let x = 0; x < this.world.getWidth(); x++) {
              const position = { x, y };
              const tile = this.world.getTile(position);
              if (tile && tile.type === 'grass') {
                // Reduce food value
                this.world.consumeFood(position, tile.foodValue * 0.1 * this.disasterIntensity);
              }
            }
          }
          
          if (Math.random() < 0.3) {
            this.logger.log("The drought continues to wither the vegetation...");
          }
        }
        
        // Animals get thirstier
        animals.forEach(animal => {
          const stats = animal.getStats();
          stats.hunger += this.disasterIntensity * 2;
        });
        break;
        
      case 'disease':
        // Disease spreads among animals
        animals.forEach(animal => {
          if (Math.random() < this.disasterIntensity * 0.15) {
            const stats = animal.getStats();
            stats.health -= Math.floor(10 * this.disasterIntensity);
            
            if (Math.random() < 0.05) {
              this.logger.log(`Animal ${animal.getId().substring(0, 6)} is suffering from the disease`);
            }
          }
        });
        break;
        
      case 'coldSnap':
        // Cold snap reduces energy and can kill animals
        animals.forEach(animal => {
          const stats = animal.getStats();
          
          // Energy drains faster in cold
          stats.energy -= this.disasterIntensity * 2;
          
          // Very cold can cause health damage
          if (Math.random() < this.disasterIntensity * 0.1) {
            stats.health -= Math.floor(5 * this.disasterIntensity);
            
            if (Math.random() < 0.05) {
              this.logger.log(`Animal ${animal.getId().substring(0, 6)} is suffering from the cold`);
            }
          }
        });
        break;
    }
  }
} 