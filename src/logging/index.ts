// Simple logging implementation para house-scraper

export type LogLevel = "success" | "fail" | "neutral" | "control" | "highlight";

const colors = {
  success: "\x1b[32m", // Verde
  fail: "\x1b[31m", // Vermelho
  neutral: "\x1b[37m", // Branco
  control: "\x1b[36m", // Ciano
  highlight: "\x1b[33m", // Amarelo
  reset: "\x1b[0m" // Reset
};

export const broadcast = (
  message: string,
  level: LogLevel = "neutral"
): void => {
  const color = colors[level] || colors.neutral;
  const timestamp = new Date().toISOString();
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
};

export const tabBroadcast = (
  message: string,
  level: LogLevel = "neutral"
): void => {
  broadcast(`  ${message}`, level);
};

export const coloredText = (text: string, level: LogLevel): string => {
  const color = colors[level] || colors.neutral;
  return `${color}${text}${colors.reset}`;
};

export class Timer {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  elapsedTime(): string {
    const elapsed = Date.now() - this.startTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  reset(): void {
    this.startTime = Date.now();
  }
}

export class TrackETA {
  private total: number;
  private completed: number = 0;
  private startTime: number;
  private description: string;

  constructor(total: number, description: string = "Processing") {
    this.total = total;
    this.description = description;
    this.startTime = Date.now();
  }

  incTask(): void {
    this.completed += 1;
  }

  getProgress(): string {
    const percentage = Math.round((this.completed / this.total) * 100);
    const elapsed = Date.now() - this.startTime;
    const avgTimePerTask = elapsed / this.completed;
    const remaining = this.total - this.completed;
    const eta = remaining * avgTimePerTask;

    const etaMinutes = Math.floor(eta / 60000);
    const etaSeconds = Math.floor((eta % 60000) / 1000);

    return `(${this.completed}/${this.total} - ${percentage}% - ETA: ${etaMinutes}m ${etaSeconds}s)`;
  }

  finish(): void {
    const elapsed = Date.now() - this.startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);

    broadcast(
      `${this.description} concluído em ${minutes}m ${seconds}s`,
      "success"
    );
  }
}
