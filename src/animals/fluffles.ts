import { Animal } from '../animal';
import { DNA } from '../dna';
import { Position, World } from '../world';
import { Logger } from '../logger';

export class Fluffles extends Animal {
  private matingPartner: string | null = null;
  private matingProgress: number = 0;
  private readonly MATING_DURATION = 4;
  
  constructor(dna: DNA, position: Position, world: World, logger: Logger) {
    super(dna, position, world, logger);
    
    // If no DNA is provided, initialize with standard genes
    if (dna.getAllGenes().length === 0) {
      // Create a new DNA with fluffles-specific tweaks to standard values
      const flufflesDNA = DNA.createStandard({
        size: 0.3,        // Fluffles are small
        speed: 0.7,       // Fluffles are fast
        metabolism: 0.7,  // Fluffles have high metabolism
        vision: 0.6,      // Fluffles have good vision
        intelligence: 0.4, // Fluffles are moderately intelligent
        aggression: 0.2,  // Fluffles are not aggressive
        socialBehavior: 0.6, // Fluffles are somewhat social
        reproductiveUrge: 0.8, // Fluffles reproduce quickly
        maturityAge: 0.4   // Fluffles mature relatively quickly
      });
      
      // Copy all genes to this animal's DNA
      flufflesDNA.getAllGenes().forEach(gene => {
        this.dna.addGene(gene);
      });
    }
  }
  
  protected act(): void {
    // If currently mating, continue the mating process
    if (this.matingPartner !== null) {
      this.continueMating();
      return;
    }
    
    // Get relevant genes that affect behavior
    const intelligenceGene = this.dna.getGene('intelligence');
    const aggressionGene = this.dna.getGene('aggression');
    const socialGene = this.dna.getGene('socialBehavior');
    const reproductiveUrgeGene = this.dna.getGene('reproductiveUrge');
    
    // Intelligence affects decision making
    const intelligence = intelligenceGene ? intelligenceGene.value : 0.3;
    
    // Get population pressure
    const populationPressure = this.world.getPopulationPressure();
    
    // Check if we should be aggressive (more likely when hungry or low energy)
    const shouldAttack = this.shouldBeAggressive();
    
    // Make smarter decisions based on intelligence
    const randomFactor = Math.random();
    
    // Higher intelligence means more likely to make optimal decisions
    if (randomFactor < intelligence) {
      // Make the best decision based on current needs
      if (this.stats.hunger > 70) {
        // Very hungry, prioritize food
        if (shouldAttack && (this.stats.hunger > 80 || this.stats.energy < 50)) {
          // Try hunting instead of foraging when very hungry
          this.huntOthers();
        } else {
          this.searchForFood();
        }
      } 
      else if (this.stats.energy < 30) {
        // Low energy, rest
        this.rest();
      }
      else if (this.stats.hunger > 40) {
        // Somewhat hungry, look for food
        if (shouldAttack && (this.stats.hunger > 60 || this.stats.energy < 50)) {
          // Try hunting instead of foraging
          this.huntOthers();
        } else {
          this.searchForFood();
        }
      }
      else if (reproductiveUrgeGene && 
               reproductiveUrgeGene.value > 0.6 && 
               this.stats.energy > 70 && 
               populationPressure < 7 &&
               this.isAdult()) {  // Only seek mates when mature and population isn't too high
        // High reproductive urge and enough energy, look for mates
        this.searchForMates();
      }
      else if (socialGene && socialGene.value > 0.7 && populationPressure < 8 && !shouldAttack) {
        // Highly social, seek other fluffles (unless very overcrowded or aggressive)
        this.seekCompany();
      }
      else if (shouldAttack && this.stats.energy < 50) {
        // Become aggressive when energy is low
        this.huntOthers();
      }
      else {
        // Otherwise, explore
        this.wander();
      }
    } else {
      // Less intelligent animals make more random choices
      const choice = Math.random();
      
      if (shouldAttack && this.stats.energy < 50 && choice < 0.4) {
        this.huntOthers();
      } else if (choice < 0.4) {
        this.searchForFood();
      } else if (choice < 0.6) {
        this.rest();
      } else {
        this.wander();
      }
    }
  }
  
  // New method to handle the mating process
  private continueMating(): void {
    // Check if partner still exists
    const partner = this.world.getAnimal(this.matingPartner!);
    if (!partner) {
      // Partner disappeared, cancel mating
      this.matingPartner = null;
      this.matingProgress = 0;
      return;
    }
    
    // Increment mating progress
    this.matingProgress++;
    
    // Check if mating is complete
    if (this.matingProgress >= this.MATING_DURATION) {
      // Attempt reproduction
      const offspring = this.reproduce(partner);
      
      // Reset mating state
      this.matingPartner = null;
      this.matingProgress = 0;
      
      if (offspring) {
        this.logger.log(`Fluffles ${this.id.substring(0, 6)} and ${partner.getId().substring(0, 6)} successfully produced offspring!`);
      }
    } else {
      // Stay close to partner during mating
      const partnerPos = partner.getPosition();
      if (Math.abs(partnerPos.x - this.position.x) + Math.abs(partnerPos.y - this.position.y) > 1) {
        // Move toward partner if separated
        this.moveToward(partnerPos);
      }
    }
  }
  
  // Update the searchForMates method to initiate mating
  private searchForMates(): void {
    const nearbyAnimals = this.world.getAnimalsInRadius(this.position, 2);
    
    for (const animal of nearbyAnimals) {
      if (animal.getId() !== this.id && animal instanceof Fluffles) {
        // Check if the other animal is mature
        if (!animal.isAdult()) continue;
        
        const pos = animal.getPosition();
        const distance = Math.abs(pos.x - this.position.x) + Math.abs(pos.y - this.position.y);
        
        if (distance <= 1) {
          // Adjacent animal, initiate mating
          this.startMating(animal.getId());
          return;
        } else if (distance <= 2) {
          // Nearby animal, move toward it
          this.moveToward(pos);
          return;
        }
      }
    }
    
    // If no potential mates found, just wander
    this.wander();
  }
  
  // New method to start the mating process
  private startMating(partnerId: string): void {
    // Only start if not already mating
    if (this.matingPartner === null) {
      this.matingPartner = partnerId;
      this.matingProgress = 0;
      
      if (Math.random() < 0.3) {
        this.logger.log(`Fluffles ${this.id.substring(0, 6)} started mating with ${partnerId.substring(0, 6)}`);
      }
    }
  }
  
  protected createOffspring(dna: DNA, position: Position): Animal {
    return new Fluffles(dna, position, this.world, this.logger);
  }
  
  render(): string {
    // Render the fluffles based on its fur color and other attributes
    const furColorGene = this.dna.getGene('furColor');
    const sizeGene = this.dna.getGene('size');
    const energyLevel = this.stats.energy;
    
    // Different symbols based on size
    let symbol = 'f';
    if (sizeGene) {
      if (sizeGene.value > 0.7) symbol = 'F';
      else if (sizeGene.value < 0.3) symbol = '°';
    }
    
    // If currently mating, use a special symbol
    if (this.matingPartner !== null) {
      symbol = '♥';
    }
    
    // If not mature yet, use a baby symbol
    if (!this.isAdult()) {
      symbol = '•';
    }
    
    // Color based on fur color gene
    let color = 'white';
    if (furColorGene) {
      if (furColorGene.value > 0.8) color = 'red';
      else if (furColorGene.value > 0.6) color = 'yellow';
      else if (furColorGene.value > 0.4) color = 'magenta';
      else if (furColorGene.value > 0.2) color = 'blue';
      else color = 'white';
    }
    
    // Add brightness based on energy level
    let brightness = '';
    if (energyLevel < 30) brightness = '-fg';
    else brightness = '-fg';
    
    return `{${color}${brightness}}${symbol}{/${color}${brightness}}`;
  }
  
  private wander(): void {
    // Simple random movement
    const directions = ['north', 'east', 'south', 'west'] as const;
    const randomDirection = directions[Math.floor(Math.random() * directions.length)];
    this.move(randomDirection);
  }
  
  private searchForFood(): void {
    // Look for food in adjacent tiles
    const adjacentPositions = [
      { x: this.position.x, y: this.position.y - 1 }, // North
      { x: this.position.x + 1, y: this.position.y }, // East
      { x: this.position.x, y: this.position.y + 1 }, // South
      { x: this.position.x - 1, y: this.position.y }  // West
    ];
    
    // Check each adjacent position for food
    let bestFoodPosition: Position | null = null;
    let bestFoodValue = 0;
    
    for (const pos of adjacentPositions) {
      if (this.world.isPositionValid(pos)) {
        const tile = this.world.getTile(pos);
        if (tile && tile.type === 'grass' && tile.foodValue > bestFoodValue) {
          bestFoodValue = tile.foodValue;
          bestFoodPosition = pos;
        }
      }
    }
    
    if (bestFoodPosition && bestFoodValue > 0) {
      // Move toward the food
      if (bestFoodPosition.y < this.position.y) {
        this.move('north');
      } else if (bestFoodPosition.x > this.position.x) {
        this.move('east');
      } else if (bestFoodPosition.y > this.position.y) {
        this.move('south');
      } else if (bestFoodPosition.x < this.position.x) {
        this.move('west');
      }
      
      // Eat if we're on a grass tile
      const currentTile = this.world.getTile(this.position);
      if (currentTile && currentTile.type === 'grass' && currentTile.foodValue > 0) {
        const foodEaten = this.world.consumeFood(this.position, Math.min(5, currentTile.foodValue));
        this.eat(foodEaten);
      }
    } else {
      // No food found, just wander
      this.wander();
    }
  }
  
  private rest(): void {
    // Stay in place and recover energy
    this.stats.energy = Math.min(100, this.stats.energy + 10);
    
    if (Math.random() < 0.1) {
      this.logger.log(`Fluffles ${this.id.substring(0, 6)} is resting and recovering energy`);
    }
  }
  
  private seekCompany(): void {
    const nearbyAnimals = this.world.getAnimalsInRadius(this.position, 3);
    
    if (nearbyAnimals.length > 0) {
      // Find the closest fluffles
      let closestFluffles: Animal | null = null;
      let closestDistance = Infinity;
      
      for (const animal of nearbyAnimals) {
        if (animal.getId() !== this.id) { // Not self
          const pos = animal.getPosition();
          const distance = Math.abs(pos.x - this.position.x) + Math.abs(pos.y - this.position.y);
          
          if (distance < closestDistance) {
            closestFluffles = animal;
            closestDistance = distance;
          }
        }
      }
      
      if (closestFluffles) {
        // Move toward the closest fluffles
        const targetPos = closestFluffles.getPosition();
        this.moveToward(targetPos);
        return;
      }
    }
    
    // If no fluffles found, just wander
    this.wander();
  }
  
  // Helper method to move toward a target position
  private moveToward(targetPos: Position): void {
    // Determine which direction gets us closer to the target
    const dx = targetPos.x - this.position.x;
    const dy = targetPos.y - this.position.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      // Move horizontally
      if (dx > 0) {
        this.move('east');
      } else {
        this.move('west');
      }
    } else {
      // Move vertically
      if (dy > 0) {
        this.move('south');
      } else {
        this.move('north');
      }
    }
  }
  
  // Add a new method for hunting other animals
  private huntOthers(): void {
    const nearbyAnimals = this.world.getAnimalsInRadius(this.position, 2);
    
    // Filter out self
    const potentialTargets = nearbyAnimals.filter(animal => animal.getId() !== this.id);
    
    if (potentialTargets.length > 0) {
      // Find the closest target
      let closestTarget: Animal | null = null;
      let closestDistance = Infinity;
      
      for (const animal of potentialTargets) {
        const pos = animal.getPosition();
        const distance = Math.abs(pos.x - this.position.x) + Math.abs(pos.y - this.position.y);
        
        if (distance < closestDistance) {
          closestTarget = animal;
          closestDistance = distance;
        }
      }
      
      if (closestTarget) {
        if (closestDistance <= 1) {
          // Adjacent animal, attack it
          this.attack(closestTarget);
        } else {
          // Move toward the target
          const targetPos = closestTarget.getPosition();
          this.moveToward(targetPos);
        }
        return;
      }
    }
    
    // If no targets found, just wander
    this.wander();
  }
} 