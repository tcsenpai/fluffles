import { Animal } from './animal';
import { Logger } from './logger';

export interface Position {
  x: number;
  y: number;
}

export interface Tile {
  type: 'grass' | 'water' | 'rock';
  foodValue: number;
}

export class World {
  private width: number;
  private height: number;
  private grid: Tile[][];
  private animals: Map<string, Animal>;
  private logger: Logger;
  private maxPopulation: number;
  private populationPressure: number = 0; // Tracks environmental stress
  
  constructor(width: number, height: number, logger: Logger) {
    this.width = width;
    this.height = height;
    this.animals = new Map();
    this.logger = logger;
    
    // Set maximum population based on world size
    // A reasonable limit is about 30% of the total tiles
    this.maxPopulation = Math.floor(width * height * 0.3);
    
    // Initialize the grid
    this.grid = [];
    for (let y = 0; y < height; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < width; x++) {
        // Random tile type
        const rand = Math.random();
        let type: Tile['type'] = 'grass';
        let foodValue = 0;
        
        if (rand < 0.7) {
          type = 'grass';
          foodValue = 10;
        } else if (rand < 0.9) {
          type = 'water';
          foodValue = 5;
        } else {
          type = 'rock';
          foodValue = 0;
        }
        
        row.push({ type, foodValue });
      }
      this.grid.push(row);
    }
    
    this.logger.log(`Created world with dimensions ${width}x${height}`);
  }
  
  getWidth(): number {
    return this.width;
  }
  
  getHeight(): number {
    return this.height;
  }
  
  getTile(position: Position): Tile | null {
    if (this.isPositionValid(position)) {
      return this.grid[position.y][position.x];
    }
    return null;
  }
  
  isPositionValid(position: Position): boolean {
    return position.x >= 0 && position.x < this.width && 
           position.y >= 0 && position.y < this.height;
  }
  
  addAnimal(animal: Animal): boolean {
    // Check if we're at population capacity
    if (this.animals.size >= this.maxPopulation) {
      // Only allow adding if it's a special case (like initial setup)
      if (this.populationPressure < 5) {
        this.populationPressure++;
        this.logger.log(`Warning: Population approaching maximum capacity (${this.animals.size}/${this.maxPopulation})`);
      }
      return false;
    }
    
    this.animals.set(animal.getId(), animal);
    
    // Calculate population pressure (0-10 scale)
    this.populationPressure = Math.min(10, Math.floor((this.animals.size / this.maxPopulation) * 10));
    
    if (this.animals.size % 5 === 0) {
      this.logger.log(`Population now at ${this.animals.size} animals (${Math.round((this.animals.size / this.maxPopulation) * 100)}% of capacity)`);
    }
    
    return true;
  }
  
  removeAnimal(id: string): void {
    this.animals.delete(id);
    this.logger.log(`Removed animal ${id} from the world`);
  }
  
  getAnimal(id: string): Animal | undefined {
    return this.animals.get(id);
  }
  
  getAllAnimals(): Animal[] {
    return Array.from(this.animals.values());
  }
  
  update(): void {
    // Update all animals
    this.animals.forEach(animal => {
      // Apply population pressure effects
      if (this.populationPressure > 5) {
        // High population pressure makes food scarcer
        animal.applyEnvironmentalStress(this.populationPressure);
      }
      
      animal.update();
    });
    
    // Regrow food in grass tiles, but slower when overpopulated
    const regrowthRate = Math.max(0.01, 0.1 - (this.populationPressure * 0.01));
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.grid[y][x];
        if (tile.type === 'grass' && tile.foodValue < 10) {
          tile.foodValue += regrowthRate;
        }
      }
    }
  }
  
  consumeFood(position: Position, amount: number): number {
    const tile = this.getTile(position);
    if (!tile) return 0;
    
    const consumed = Math.min(tile.foodValue, amount);
    tile.foodValue -= consumed;
    return consumed;
  }
  
  // Get a string representation of the world for rendering
  render(): string[][] {
    const representation: string[][] = [];
    
    // Initialize with terrain
    for (let y = 0; y < this.height; y++) {
      const row: string[] = [];
      for (let x = 0; x < this.width; x++) {
        const tile = this.grid[y][x];
        switch (tile.type) {
          case 'grass':
            // Show different grass density based on food value with colors
            if (tile.foodValue > 7) {
              row.push('{green-fg}♣{/green-fg}'); // Lush grass
            } else if (tile.foodValue > 3) {
              row.push('{green-fg}♠{/green-fg}'); // Medium grass
            } else {
              row.push('{green-fg}·{/green-fg}'); // Sparse grass
            }
            break;
          case 'water':
            row.push('{blue-fg}≈{/blue-fg}'); // Water
            break;
          case 'rock':
            row.push('{white-fg}▲{/white-fg}'); // Rock/mountain
            break;
        }
      }
      representation.push(row);
    }
    
    // Add animals with colors based on their attributes
    this.animals.forEach(animal => {
      const pos = animal.getPosition();
      if (this.isPositionValid(pos)) {
        representation[pos.y][pos.x] = animal.render();
      }
    });
    
    return representation;
  }
  
  getAnimalsInRadius(center: Position, radius: number): Animal[] {
    const result: Animal[] = [];
    
    this.animals.forEach(animal => {
      const pos = animal.getPosition();
      const distance = Math.abs(pos.x - center.x) + Math.abs(pos.y - center.y);
      
      if (distance <= radius) {
        result.push(animal);
      }
    });
    
    return result;
  }
  
  getPopulationPressure(): number {
    return this.populationPressure;
  }
  
  getMaxPopulation(): number {
    return this.maxPopulation;
  }
  
  getTerrainStats(): { grass: number, water: number, rock: number, averageFood: number } {
    let grassCount = 0;
    let waterCount = 0;
    let rockCount = 0;
    let totalFood = 0;
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.grid[y][x];
        
        switch (tile.type) {
          case 'grass':
            grassCount++;
            totalFood += tile.foodValue;
            break;
          case 'water':
            waterCount++;
            break;
          case 'rock':
            rockCount++;
            break;
        }
      }
    }
    
    const averageFood = grassCount > 0 ? totalFood / grassCount : 0;
    
    return {
      grass: grassCount,
      water: waterCount,
      rock: rockCount,
      averageFood
    };
  }
} 