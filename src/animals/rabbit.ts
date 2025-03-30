import { Animal } from '../animal';
import { DNA } from '../dna';
import { Position, World } from '../world';
import { Logger } from '../logger';

export class Rabbit extends Animal {
  constructor(dna: DNA, position: Position, world: World, logger: Logger) {
    super(dna, position, world, logger);
    
    // If no DNA is provided, initialize with standard genes
    if (dna.getAllGenes().length === 0) {
      // Create a new DNA with rabbit-specific tweaks to standard values
      const rabbitDNA = DNA.createStandard({
        size: 0.3,        // Rabbits are small
        speed: 0.7,       // Rabbits are fast
        metabolism: 0.7,  // Rabbits have high metabolism
        vision: 0.6,      // Rabbits have good vision
        intelligence: 0.4, // Rabbits are moderately intelligent
        aggression: 0.2,  // Rabbits are not aggressive
        socialBehavior: 0.6, // Rabbits are somewhat social
        reproductiveUrge: 0.8 // Rabbits reproduce quickly
      });
      
      // Copy all genes to this animal's DNA
      rabbitDNA.getAllGenes().forEach(gene => {
        this.dna.addGene(gene);
      });
    }
  }
  
  protected act(): void {
    // Get relevant genes that affect behavior
    const intelligenceGene = this.dna.getGene('intelligence');
    const aggressionGene = this.dna.getGene('aggression');
    const socialGene = this.dna.getGene('socialBehavior');
    const reproductiveUrgeGene = this.dna.getGene('reproductiveUrge');
    
    // Intelligence affects decision making
    const intelligence = intelligenceGene ? intelligenceGene.value : 0.3;
    
    // Get population pressure
    const populationPressure = this.world.getPopulationPressure();
    
    // Make smarter decisions based on intelligence
    const randomFactor = Math.random();
    
    // Higher intelligence means more likely to make optimal decisions
    if (randomFactor < intelligence) {
      // Make the best decision based on current needs
      if (this.stats.hunger > 70) {
        // Very hungry, prioritize food
        this.searchForFood();
      } 
      else if (this.stats.energy < 30) {
        // Low energy, rest
        this.rest();
      }
      else if (this.stats.hunger > 40) {
        // Somewhat hungry, look for food
        this.searchForFood();
      }
      else if (reproductiveUrgeGene && 
               reproductiveUrgeGene.value > 0.6 && 
               this.stats.energy > 70 && 
               populationPressure < 7) {  // Only seek mates when population isn't too high
        // High reproductive urge and enough energy, look for mates
        this.searchForMates();
      }
      else if (socialGene && socialGene.value > 0.7 && populationPressure < 8) {
        // Highly social, seek other rabbits (unless very overcrowded)
        this.seekCompany();
      }
      else {
        // Otherwise, explore
        this.wander();
      }
    } else {
      // Less intelligent animals make more random choices
      const choice = Math.random();
      
      if (choice < 0.4) {
        this.searchForFood();
      } else if (choice < 0.6) {
        this.rest();
      } else {
        this.wander();
      }
    }
  }
  
  private searchForFood(): void {
    // Check current position for food
    const currentTile = this.world.getTile(this.position);
    if (currentTile && currentTile.foodValue > 0) {
      const consumed = this.world.consumeFood(this.position, 5);
      this.eat(consumed);
      return;
    }
    
    // Look in adjacent tiles for food
    const directions: ('north' | 'east' | 'south' | 'west')[] = ['north', 'east', 'south', 'west'];
    
    // Shuffle directions for randomness
    for (let i = directions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [directions[i], directions[j]] = [directions[j], directions[i]];
    }
    
    // Check each direction
    for (const direction of directions) {
      const newPos = {...this.position};
      
      switch (direction) {
        case 'north': newPos.y = Math.max(0, newPos.y - 1); break;
        case 'east': newPos.x = Math.min(this.world.getWidth() - 1, newPos.x + 1); break;
        case 'south': newPos.y = Math.min(this.world.getHeight() - 1, newPos.y + 1); break;
        case 'west': newPos.x = Math.max(0, newPos.x - 1); break;
      }
      
      const tile = this.world.getTile(newPos);
      if (tile && tile.foodValue > 0) {
        this.move(direction);
        return;
      }
    }
    
    // If no food found in adjacent tiles, just wander
    this.wander();
  }
  
  private rest(): void {
    // Resting recovers energy but increases hunger
    this.stats.energy = Math.min(100, this.stats.energy + 5);
    this.logger.log(`Rabbit ${this.id} is resting. Energy: ${this.stats.energy}`);
  }
  
  private wander(): void {
    // Move in a random direction
    const directions: ('north' | 'east' | 'south' | 'west')[] = ['north', 'east', 'south', 'west'];
    const randomDirection = directions[Math.floor(Math.random() * directions.length)];
    
    this.move(randomDirection);
  }
  
  protected createOffspring(dna: DNA, position: Position): Animal {
    return new Rabbit(dna, position, this.world, this.logger);
  }
  
  render(): string {
    // Render the rabbit based on its fur color and other attributes
    const furColorGene = this.dna.getGene('furColor');
    const sizeGene = this.dna.getGene('size');
    const energyLevel = this.stats.energy;
    
    // Different symbols based on size
    let symbol = 'r';
    if (sizeGene) {
      if (sizeGene.value > 0.7) symbol = 'R';
      else if (sizeGene.value < 0.3) symbol = '°';
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
  
  // New method to seek company of other rabbits
  private seekCompany(): void {
    const nearbyAnimals = this.world.getAnimalsInRadius(this.position, 3);
    
    let closestRabbit: Animal | null = null;
    
    if (nearbyAnimals.length > 0) {
      // Find the closest rabbit
      let closestDistance = Infinity;
      
      for (const animal of nearbyAnimals) {
        if (animal.getId() !== this.id) { // Not self
          const pos = animal.getPosition();
          const distance = Math.abs(pos.x - this.position.x) + Math.abs(pos.y - this.position.y);
          
          if (distance < closestDistance) {
            closestRabbit = animal;
            closestDistance = distance;
          }
        }
      }
      
      if (closestRabbit) {
        // Move toward the closest rabbit
        const targetPos = closestRabbit.getPosition();
        this.moveToward(targetPos);
        return;
      }
    }
    
    // If no rabbits found, just wander
    this.wander();
  }
  
  // New method to search for potential mates
  private searchForMates(): void {
    const nearbyAnimals = this.world.getAnimalsInRadius(this.position, 2);
    
    let closestRabbit: Animal | null = null;
    
    for (const animal of nearbyAnimals) {
      if (animal.getId() !== this.id) { // Not self
        const pos = animal.getPosition();
        const distance = Math.abs(pos.x - this.position.x) + Math.abs(pos.y - this.position.y);
        
        if (distance <= 1) {
          // Adjacent animal, try to reproduce
          this.reproduce(animal);
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
} 