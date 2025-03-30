import * as fs from 'fs';
import * as path from 'path';

export class Logger {
  private logs: string[] = [];
  private logCallback: ((message: string) => void) | null = null;
  private consoleOutput: boolean;
  private fileOutput: boolean;
  private logFile: fs.WriteStream | null = null;
  
  constructor(consoleOutput: boolean = true, fileOutput: boolean = true) {
    this.consoleOutput = consoleOutput;
    this.fileOutput = fileOutput;
    
    if (fileOutput) {
      this.setupLogFile();
    }
  }
  
  private setupLogFile(): void {
    // Create logs directory if it doesn't exist
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir);
    }
    
    // Create a timestamped log file
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const logFilePath = path.join(logsDir, `simulation-${timestamp}.log`);
    
    this.logFile = fs.createWriteStream(logFilePath, { flags: 'a' });
    this.log(`Log file created at ${logFilePath}`);
  }
  
  log(message: string): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ${message}`;
    
    this.logs.push(formattedMessage);
    
    if (this.consoleOutput) {
      console.log(formattedMessage);
    }
    
    if (this.fileOutput && this.logFile) {
      this.logFile.write(formattedMessage + '\n');
    }
    
    if (this.logCallback) {
      this.logCallback(formattedMessage);
    }
  }
  
  setLogCallback(callback: (message: string) => void): void {
    this.logCallback = callback;
    
    // Send the last few logs to the callback to populate the log view
    const lastLogs = this.getLastLogs(10);
    lastLogs.forEach(log => callback(log));
  }
  
  getLogs(): string[] {
    return [...this.logs];
  }
  
  getLastLogs(count: number): string[] {
    return this.logs.slice(-count);
  }
  
  clearLogs(): void {
    this.logs = [];
  }
  
  close(): void {
    if (this.logFile) {
      this.logFile.end();
      this.logFile = null;
    }
  }
} 