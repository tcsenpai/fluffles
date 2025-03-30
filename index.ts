import { Simulation } from './src/simulation';

// Create and start the simulation with a size that fits most terminals
const simulation = new Simulation(30, 15);
simulation.initialize(5); // Start with fewer fluffles for clarity

// Display startup message
console.log("Starting Fluffles Simulator...");
console.log("Press 'q' to quit");

simulation.start();

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down simulation...');
  simulation.stop();
  process.exit(0);
});

process.on('exit', () => {
  // Ensure simulation is stopped properly
  simulation.stop();
}); 