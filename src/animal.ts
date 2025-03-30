import { DNA, Gene } from './dna';
import { Position, World } from './world';
import { Logger } from './logger';

export interface AnimalStats {
  health: number;
  energy: number;
  age: number;
  hunger: number;
}

export abstract class Animal {
  protected id: string;
  protected dna: DNA;
  protected position: Position;
  protected stats: AnimalStats;
  protected world: World;
  protected logger: Logger;
  
  constructor(dna: DNA, position: Position, world: World, logger: Logger) {
    this.id = crypto.randomUUID();
    this.dna = dna;
    this.position = position;
    this.world = world;
    this.logger = logger;
    
    // Initialize stats based on DNA
    this.stats = {
      health: 100,
      energy: 100,
      age: 0,
      hunger: 0
    };
    
    this.logger.log(`Animal ${this.id} was born at position (${position.x}, ${position.y})`);
  }
  
  getId(): string {
    return this.id;
  }
  
  getDNA(): DNA {
    return this.dna;
  }
  
  getPosition(): Position {
    return {...this.position};
  }
  
  getStats(): AnimalStats {
    return {...this.stats};
  }
  
  setPosition(position: Position): void {
    this.position = position;
  }
  
  // Update the animal's state for one time step
  update(): void {
    // Increment age
    this.stats.age += 1;
    
    // Increase hunger
    this.stats.hunger = Math.min(100, this.stats.hunger + 1);
    
    // Decrease energy slightly
    this.stats.energy = Math.max(0, this.stats.energy - 0.5);
    
    // Check for death conditions
    if (this.stats.health <= 0 || this.stats.hunger >= 100) {
      this.die();
      return;
    }
    
    // Check for old age death
    const lifespanGene = this.dna.getGene('lifespan');
    const baseLifespan = 100;
    const lifespanModifier = lifespanGene ? lifespanGene.value * 50 : 0; // 0 to +50 range
    const maxAge = baseLifespan + lifespanModifier;
    
    // Chance of death increases with age
    if (this.stats.age > maxAge * 0.7) {
      const deathChance = (this.stats.age - (maxAge * 0.7)) / (maxAge * 0.3);
      if (Math.random() < deathChance * 0.1) {
        this.logger.log(`Animal ${this.id.substring(0, 6)} died of old age at ${this.stats.age}`);
        this.die();
        return;
      }
    }
    
    // If still alive, perform actions
    this.act();
  }
  
  protected calculateEnergyConsumption(): number {
    // Base energy consumption
    let consumption = 1;
    
    // Size affects energy consumption
    const sizeGene = this.dna.getGene('size');
    if (sizeGene) {
      consumption += sizeGene.value * 2; // Larger animals consume more energy
    }
    
    // Activity level affects energy consumption
    const activityGene = this.dna.getGene('activity');
    if (activityGene) {
      consumption += activityGene.value * 1.5;
    }
    
    return consumption;
  }
  
  protected abstract act(): void;
  
  protected move(direction: 'north' | 'east' | 'south' | 'west'): void {
    const newPosition = {...this.position};
    
    switch (direction) {
      case 'north':
        newPosition.y = Math.max(0, newPosition.y - 1);
        break;
      case 'east':
        newPosition.x = Math.min(this.world.getWidth() - 1, newPosition.x + 1);
        break;
      case 'south':
        newPosition.y = Math.min(this.world.getHeight() - 1, newPosition.y + 1);
        break;
      case 'west':
        newPosition.x = Math.max(0, newPosition.x - 1);
        break;
    }
    
    // Check if the new position is valid
    if (this.world.isPositionValid(newPosition)) {
      this.position = newPosition;
      this.stats.energy -= 1; // Moving costs energy
      
      // Only log movements occasionally to reduce spam
      if (Math.random() < 0.05) {
        this.logger.log(`Animal ${this.id.substring(0, 6)} moved to (${this.position.x}, ${this.position.y})`);
      }
    }
  }
  
  protected eat(foodValue: number): void {
    this.stats.hunger = Math.max(0, this.stats.hunger - foodValue);
    this.stats.energy = Math.min(100, this.stats.energy + foodValue / 2);
    
    // Only log eating occasionally
    if (Math.random() < 0.2) {
      this.logger.log(`Animal ${this.id.substring(0, 6)} ate food with value ${foodValue}`);
    }
  }
  
  protected die(): void {
    this.world.removeAnimal(this.id);
    this.logger.log(`Animal ${this.id} has died at age ${this.stats.age}`);
  }
  
  // Method for reproduction
  reproduce(partner: Animal): Animal | null {
    // Check if both animals are mature
    if (!this.isAdult() || !partner.isAdult()) {
      return null;
    }
    
    // Check if both animals have enough energy to reproduce
    if (this.stats.energy < 50 || partner.getStats().energy < 50) {
      return null;
    }
    
    // Get population pressure from the world
    const populationPressure = this.world.getPopulationPressure();
    
    // Make reproduction harder when population is high
    const reproductiveUrgeGene = this.dna.getGene('reproductiveUrge');
    const reproductiveUrge = reproductiveUrgeGene ? reproductiveUrgeGene.value : 0.5;
    
    // Calculate success chance based on population pressure and reproductive urge
    const successChance = Math.max(0.1, reproductiveUrge - (populationPressure * 0.08));
    
    if (Math.random() > successChance) {
      // Failed reproduction attempt due to environmental factors
      this.stats.energy -= 10; // Still costs some energy to try
      return null;
    }
    
    // Combine DNA
    const childDNA = DNA.combine(this.dna, partner.getDNA());
    
    // Possibly mutate
    const mutatedDNA = childDNA.mutate();
    
    // Create a new animal of the same type
    const childPosition = {
      x: Math.floor((this.position.x + partner.getPosition().x) / 2),
      y: Math.floor((this.position.y + partner.getPosition().y) / 2)
    };
    
    // Consume energy for reproduction
    this.stats.energy -= 30;
    
    this.logger.log(`Animal ${this.id.substring(0, 6)} reproduced with ${partner.getId().substring(0, 6)}`);
    
    // The specific animal type will be created by the derived class
    const offspring = this.createOffspring(mutatedDNA, childPosition);
    
    // Check if the world accepted the new animal
    if (!this.world.addAnimal(offspring)) {
      this.logger.log(`Offspring couldn't survive due to overpopulation`);
      return null;
    }
    
    return offspring;
  }
  
  protected abstract createOffspring(dna: DNA, position: Position): Animal;
  
  // Method for rendering the animal
  abstract render(): string;
  
  applyEnvironmentalStress(pressureLevel: number): void {
    // Higher pressure means more competition for resources
    if (pressureLevel > 7) {
      // Severe pressure
      this.stats.hunger += 0.5; // Animals get hungrier faster
      this.stats.energy -= 0.3; // Animals tire more quickly
      
      // Chance of health decline due to overcrowding
      if (Math.random() < 0.05) {
        this.stats.health -= 1;
        if (Math.random() < 0.1) {
          this.logger.log(`Animal ${this.id.substring(0, 6)} suffering from overcrowding`);
        }
      }
    } else if (pressureLevel > 5) {
      // Moderate pressure
      this.stats.hunger += 0.3;
      this.stats.energy -= 0.1;
    }
  }
  
  protected isAdult(): boolean {
    // Check if the animal has reached maturity
    const lifespanGene = this.dna.getGene('lifespan');
    const maturityGene = this.dna.getGene('maturityAge');
    
    // Default maturity age is 25, but can be modified by genes
    const baseMaturityAge = 25;
    const maturityModifier = maturityGene ? maturityGene.value * 20 - 10 : 0; // -10 to +10 range
    const maturityAge = Math.max(15, baseMaturityAge + maturityModifier);
    
    return this.stats.age >= maturityAge;
  }
  
  protected attack(target: Animal): boolean {
    // Check if we have enough energy to attack
    if (this.stats.energy < 20) {
      return false;
    }
    
    // Get relevant genes
    const aggressionGene = this.dna.getGene('aggression');
    const speedGene = this.dna.getGene('speed');
    const targetSpeedGene = target.getDNA().getGene('speed');
    
    // Calculate attack success chance based on genes
    const aggression = aggressionGene ? aggressionGene.value : 0.3;
    const speed = speedGene ? speedGene.value : 0.5;
    const targetSpeed = targetSpeedGene ? targetSpeedGene.value : 0.5;
    
    // Speed difference affects chance to catch prey
    const speedAdvantage = Math.max(0, speed - targetSpeed);
    
    // Calculate success chance
    const successChance = 0.3 + (aggression * 0.4) + (speedAdvantage * 0.3);
    
    // Attacking costs energy
    this.stats.energy -= 15;
    
    if (Math.random() < successChance) {
      // Attack succeeded
      this.logger.log(`Animal ${this.id.substring(0, 6)} successfully attacked ${target.getId().substring(0, 6)}`);
      
      // Gain energy and reduce hunger from the kill
      const energyGain = 30 + Math.floor(Math.random() * 20);
      this.stats.energy = Math.min(100, this.stats.energy + energyGain);
      this.stats.hunger = Math.max(0, this.stats.hunger - 40);
      
      // Target dies
      target.die();
      return true;
    } else {
      // Attack failed
      if (Math.random() < 0.3) {
        this.logger.log(`Animal ${this.id.substring(0, 6)} failed to catch ${target.getId().substring(0, 6)}`);
      }
      return false;
    }
  }
  
  protected shouldBeAggressive(): boolean {
    // Get relevant genes
    const aggressionGene = this.dna.getGene('aggression');
    const friendshipGene = this.dna.getGene('friendship');
    
    // Calculate base aggression
    const aggression = aggressionGene ? aggressionGene.value : 0.3;
    const friendship = friendshipGene ? friendshipGene.value : 0.5;
    
    // Low energy increases aggression
    const energyFactor = Math.max(0, 1 - (this.stats.energy / 100));
    
    // Hunger increases aggression - this is now a stronger factor
    const hungerFactor = this.stats.hunger / 100;
    
    // Calculate overall aggression tendency
    // Hunger now has a higher weight (0.4) compared to energy (0.2)
    const aggressionTendency = (aggression * 0.3) + (energyFactor * 0.2) + (hungerFactor * 0.4) - (friendship * 0.3);
    
    return Math.random() < aggressionTendency;
  }
} 