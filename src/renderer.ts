import { World } from './world';
import { Logger } from './logger';
import * as blessed from 'blessed';
import * as contrib from 'blessed-contrib';
import { Animal } from './animal';

export class Renderer {
  private screen: blessed.Widgets.Screen;
  private worldBox: blessed.Widgets.BoxElement;
  private worldInfoBox: blessed.Widgets.BoxElement;
  private logBox: blessed.Widgets.Log;
  private statsBox: blessed.Widgets.BoxElement;
  private helpBox: blessed.Widgets.BoxElement;
  private world: World;
  private logger: Logger;
  private selectedAnimalIndex: number = 0;
  private showHelp: boolean = false;
  private disasterInfo: { active: boolean, type: string, duration: number, intensity: number } = {
    active: false,
    type: '',
    duration: 0,
    intensity: 0
  };
  
  constructor(world: World, logger: Logger) {
    this.world = world;
    this.logger = logger;
    
    // Initialize blessed screen
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Animal Simulator',
      fullUnicode: true
    });
    
    // Create layout
    this.worldBox = blessed.box({
      top: 0,
      left: 0,
      width: '70%',
      height: '60%',  // Reduced height to make room for world info
      content: '',
      tags: true,
      label: ' World ',
      border: {
        type: 'line'
      },
      style: {
        fg: 'white',
        border: {
          fg: 'cyan'
        }
      }
    });
    
    // Add a separate world info box
    this.worldInfoBox = blessed.box({
      top: '60%',
      left: 0,
      width: '70%',
      height: '10%',  // Small box for world info and legend
      content: '',
      tags: true,
      label: ' World Info ',
      border: {
        type: 'line'
      },
      style: {
        fg: 'white',
        border: {
          fg: 'green'
        }
      }
    });
    
    // Use a Log widget instead of a Box for better log handling
    this.logBox = blessed.log({
      top: '70%',
      left: 0,
      width: '100%',
      height: '30%',
      tags: true,
      label: ' Animal Logs ',
      border: {
        type: 'line'
      },
      style: {
        fg: 'white',
        border: {
          fg: 'cyan'
        }
      },
      scrollable: true,
      scrollbar: {
        ch: '│',
        track: {
          bg: 'black'
        },
        style: {
          inverse: true
        }
      },
      mouse: true,
      alwaysScroll: true
    });
    
    this.statsBox = blessed.box({
      top: 0,
      left: '70%',
      width: '30%',
      height: '70%',
      content: '',
      tags: true,
      label: ' Statistics ',
      border: {
        type: 'line'
      },
      style: {
        fg: 'white',
        border: {
          fg: 'cyan'
        }
      },
      scrollable: true,
      scrollbar: {
        ch: '│',
        track: {
          bg: 'black'
        },
        style: {
          inverse: true
        }
      },
      mouse: true,
      alwaysScroll: true
    });
    
    // Create help box (initially hidden)
    this.helpBox = blessed.box({
      top: 'center',
      left: 'center',
      width: '80%',
      height: '80%',
      content: this.getHelpContent(),
      tags: true,
      label: ' Help ',
      border: {
        type: 'line'
      },
      style: {
        fg: 'white',
        border: {
          fg: 'yellow'
        }
      },
      hidden: true,
      scrollable: true,
      scrollbar: {
        ch: '│',
        track: {
          bg: 'black'
        },
        style: {
          inverse: true
        }
      },
      mouse: true,
      alwaysScroll: true,
      keys: true,
      vi: true
    });
    
    // Add components to screen
    this.screen.append(this.worldBox);
    this.screen.append(this.worldInfoBox);  // Add the new box
    this.screen.append(this.logBox);
    this.screen.append(this.statsBox);
    this.screen.append(this.helpBox);
    
    // Set up key handlers
    this.setupKeyHandlers();
    
    // Register with logger to receive log events
    logger.setLogCallback((message) => {
      this.logBox.log(message);
      this.screen.render();
    });
    
    // Render the screen
    this.screen.render();
  }
  
  private setupKeyHandlers(): void {
    // Quit on Escape, q, or Control-C
    this.screen.key(['escape', 'q', 'C-c'], () => process.exit(0));
    
    // Toggle help screen with 'h'
    this.screen.key('h', () => {
      this.showHelp = !this.showHelp;
      this.helpBox.hidden = !this.showHelp;
      this.screen.render();
    });
    
    // Animal selection with arrow keys
    this.screen.key('right', () => {
      const animals = this.world.getAllAnimals();
      if (animals.length > 0) {
        this.selectedAnimalIndex = (this.selectedAnimalIndex + 1) % animals.length;
        this.render();
      }
    });
    
    this.screen.key('left', () => {
      const animals = this.world.getAllAnimals();
      if (animals.length > 0) {
        this.selectedAnimalIndex = (this.selectedAnimalIndex - 1 + animals.length) % animals.length;
        this.render();
      }
    });
    
    // Speed controls
    this.screen.key('+', () => {
      this.logger.log("Simulation speed increased");
      this.screen.emit('speed', 0.75); // Emit custom event for speed change
    });
    
    this.screen.key('-', () => {
      this.logger.log("Simulation speed decreased");
      this.screen.emit('speed', 1.25); // Emit custom event for speed change
    });
    
    // Add pause/unpause key
    this.screen.key('p', () => {
      this.screen.emit('pause'); // Emit custom event for pause toggle
      this.logger.log("Simulation pause toggled");
    });
  }
  
  onSpeedChange(callback: (factor: number) => void): void {
    this.screen.on('speed', callback);
  }
  
  onPauseToggle(callback: () => void): void {
    this.screen.on('pause', callback);
  }
  
  private getHelpContent(): string {
    return `{bold}{green-fg}Animal Simulator Help{/green-fg}{/bold}

{yellow-fg}Navigation Controls:{/yellow-fg}
• {bold}Left/Right Arrows{/bold}: Select previous/next animal
• {bold}H{/bold}: Toggle this help screen
• {bold}Q{/bold} or {bold}Esc{/bold}: Quit the simulation

{yellow-fg}Simulation Controls:{/yellow-fg}
• {bold}P{/bold}: Pause/Unpause simulation
• {bold}+{/bold}: Increase simulation speed
• {bold}−{/bold}: Decrease simulation speed

{yellow-fg}World Symbols:{/yellow-fg}
• {bold}F, f, °{/bold}: Adult Fluffles (different sizes)
• {bold}•{/bold}: Baby Fluffles (not mature yet)
• {bold}♥{/bold}: Fluffles that are mating
• {bold}♣, ♠, ·{/bold}: Grass (different densities)
• {bold}≈{/bold}: Water
• {bold}▲{/bold}: Rocks/Mountains

{cyan-fg}Life Cycle:{/cyan-fg}
• Fluffles are born as babies (•)
• They mature around age 25 (varies by genetics)
• They can mate only when mature (takes 4 turns)
• Their lifespan is around 100 (varies by genetics)
• Population pressure affects reproduction success

{cyan-fg}Tip:{/cyan-fg} Watch how animals with different DNA behave differently!`;
  }
  
  updateDisasterInfo(active: boolean, type: string, duration: number, intensity: number): void {
    this.disasterInfo.active = active;
    this.disasterInfo.type = type;
    this.disasterInfo.duration = duration;
    this.disasterInfo.intensity = intensity;
  }
  
  render(): void {
    // Render world with improved visuals and highlight selected animal
    const worldGrid = this.world.render();
    const animals = this.world.getAllAnimals();
    
    // Make sure the selected animal index is valid
    if (this.selectedAnimalIndex >= animals.length && animals.length > 0) {
      this.selectedAnimalIndex = animals.length - 1;
    }
    
    // Highlight the selected animal if any
    if (animals.length > 0) {
      const selectedAnimal = animals[this.selectedAnimalIndex];
      if (selectedAnimal) {  // Make sure the animal exists
        const pos = selectedAnimal.getPosition();
        
        // Add a highlight marker around the selected animal
        if (this.world.isPositionValid(pos)) {
          worldGrid[pos.y][pos.x] = `{inverse}${worldGrid[pos.y][pos.x]}{/inverse}`;
        }
      }
    }
    
    // Remove legend from world content and put it in the world info box
    let worldContent = '';
    for (const row of worldGrid) {
      worldContent += row.join('') + '\n';
    }
    
    this.worldBox.setContent(worldContent);
    
    // Create world info content with legend and terrain stats
    let worldInfoContent = '{bold}Legend:{/bold} ';
    worldInfoContent += '{green-fg}♣{/green-fg}=Grass ';
    worldInfoContent += '{blue-fg}≈{/blue-fg}=Water ';
    worldInfoContent += '{white-fg}▲{/white-fg}=Rock ';
    worldInfoContent += '{magenta-fg}F{/magenta-fg}=Adult ';
    worldInfoContent += '{cyan-fg}•{/cyan-fg}=Baby ';
    worldInfoContent += '{red-fg}♥{/red-fg}=Mating ';
    worldInfoContent += '{yellow-fg}⚔{/yellow-fg}=Fighting\n';
    
    // Add terrain statistics
    const terrainStats = this.world.getTerrainStats();
    worldInfoContent += `{bold}Terrain:{/bold} `;
    worldInfoContent += `Grass: ${terrainStats.grass} tiles | `;
    worldInfoContent += `Water: ${terrainStats.water} tiles | `;
    worldInfoContent += `Rock: ${terrainStats.rock} tiles | `;
    worldInfoContent += `Avg. Food: ${terrainStats.averageFood.toFixed(1)}`;
    
    // Add disaster info if active
    if (this.disasterInfo.active) {
      worldInfoContent += `\n{bold}{red-fg}DISASTER:{/red-fg}{/bold} ${this.disasterInfo.type} `;
      worldInfoContent += `(${Math.round(this.disasterInfo.intensity * 100)}% intensity, `;
      worldInfoContent += `${this.disasterInfo.duration} ticks remaining)`;
    }
    
    this.worldInfoBox.setContent(worldInfoContent);
    
    // Render stats with improved formatting
    let statsContent = '{bold}Animal Simulator Stats{/bold}\n\n';
    
    const populationPressure = this.world.getPopulationPressure();
    const maxPopulation = this.world.getMaxPopulation();
    
    // Show population status with color coding
    let populationColor = 'green';
    if (populationPressure > 7) populationColor = 'red';
    else if (populationPressure > 5) populationColor = 'yellow';
    
    statsContent += `{yellow-fg}Total Animals:{/yellow-fg} ${animals.length}/${maxPopulation}\n`;
    statsContent += `{yellow-fg}Population Pressure:{/yellow-fg} ${this.createProgressBar(populationPressure, 10, true)}\n\n`;
    
    if (animals.length > 0 && this.selectedAnimalIndex < animals.length) {
      const animal = animals[this.selectedAnimalIndex];
      const stats = animal.getStats();
      const pos = animal.getPosition();
      
      statsContent += `{green-fg}Selected Animal:{/green-fg} ${animal.getId().substring(0, 8)}...\n`;
      statsContent += `{green-fg}Animal ${this.selectedAnimalIndex + 1} of ${animals.length}{/green-fg}\n`;
      statsContent += `{cyan-fg}Position:{/cyan-fg} (${pos.x}, ${pos.y})\n`;
      statsContent += `{cyan-fg}Health:{/cyan-fg} ${this.createProgressBar(stats.health, 100)}\n`;
      statsContent += `{cyan-fg}Energy:{/cyan-fg} ${this.createProgressBar(stats.energy, 100)}\n`;
      statsContent += `{cyan-fg}Age:{/cyan-fg} ${stats.age}\n`;
      statsContent += `{cyan-fg}Hunger:{/cyan-fg} ${this.createProgressBar(stats.hunger, 100, true)}\n\n`;
      
      statsContent += '{bold}DNA:{/bold}\n';
      const dna = animal.getDNA();
      dna.getAllGenes().forEach(gene => {
        statsContent += `{magenta-fg}${gene.name}:{/magenta-fg} ${gene.value.toFixed(2)}\n`;
      });
      
      // Add controls reminder
      statsContent += '\n{bold}Controls:{/bold} ← → to select animals | H for help';
    } else if (animals.length === 0) {
      // No animals left
      statsContent += '{red-fg}No animals alive in the simulation!{/red-fg}\n';
      statsContent += 'The population has gone extinct.\n\n';
      statsContent += 'Press Q to quit or restart the simulation.';
    }
    
    // Add disaster info to stats if active
    if (this.disasterInfo.active) {
      statsContent += '\n{bold}{red-fg}DISASTER ACTIVE{/red-fg}{/bold}\n';
      statsContent += `{red-fg}Type:{/red-fg} ${this.disasterInfo.type}\n`;
      statsContent += `{red-fg}Intensity:{/red-fg} ${Math.round(this.disasterInfo.intensity * 100)}%\n`;
      statsContent += `{red-fg}Remaining:{/red-fg} ${this.disasterInfo.duration} ticks\n`;
    }
    
    // Add key commands reminder at the bottom of the stats box
    statsContent += '\n\n{bold}Key Commands:{/bold}\n';
    statsContent += '← → : Select animal | H: Help | +/-: Speed | Q: Quit';
    
    this.statsBox.setContent(statsContent);
    
    // Render the screen
    this.screen.render();
  }
  
  private createProgressBar(value: number, max: number, inverse: boolean = false): string {
    const width = 15;
    const filledWidth = Math.round((value / max) * width);
    const emptyWidth = width - filledWidth;
    
    let color = 'green';
    if (inverse) {
      // For inverse bars like hunger, red means high (bad)
      if (value > 70) color = 'red';
      else if (value > 40) color = 'yellow';
    } else {
      // For normal bars like health, red means low (bad)
      if (value < 30) color = 'red';
      else if (value < 60) color = 'yellow';
    }
    
    const filled = `{${color}-fg}${'█'.repeat(filledWidth)}{/${color}-fg}`;
    const empty = '░'.repeat(emptyWidth);
    
    return `[${filled}${empty}] ${value}/${max}`;
  }
} 