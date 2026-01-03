/**
 * Manages confetti animation that plays when level is completed
 */
export class ConfettiManager {
  private confettiContainer: HTMLElement | null = null;
  private animationInterval: number | null = null;
  private isPlaying: boolean = false;
  private confettiPieces: HTMLElement[] = [];

  // Configuration
  private readonly SPAWN_INTERVAL = 150; // milliseconds between confetti spawns

  constructor() {
    this.createConfettiContainer();
  }

  /**
   * Create the confetti container element
   */
  private createConfettiContainer(): void {
    this.confettiContainer = document.createElement('div');
    this.confettiContainer.id = 'confettiContainer';
    this.confettiContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1001;
      overflow: hidden;
    `;
    document.body.appendChild(this.confettiContainer);
  }

  /**
   * Start the confetti animation loop
   */
  public start(): void {
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.spawnConfettiLoop();
  }

  /**
   * Stop the confetti animation and clean up
   */
  public stop(): void {
    this.isPlaying = false;

    if (this.animationInterval !== null) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }

    // Remove all confetti pieces
    this.confettiPieces.forEach(piece => {
      if (piece.parentNode) {
        piece.parentNode.removeChild(piece);
      }
    });
    this.confettiPieces = [];
  }

  /**
   * Spawn confetti pieces in a loop
   */
  private spawnConfettiLoop(): void {
    // Spawn initial batch
    for (let i = 0; i < 10; i++) {
      this.createConfettiPiece();
    }

    // Continue spawning while playing
    this.animationInterval = window.setInterval(() => {
      if (this.isPlaying) {
        this.createConfettiPiece();
      }
    }, this.SPAWN_INTERVAL);
  }

  /**
   * Create a single confetti piece
   */
  private createConfettiPiece(): void {
    if (!this.confettiContainer) return;

    const confetti = document.createElement('div');
    confetti.className = 'confetti-piece';

    // Random colors
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f7dc6f', '#bb8fce', '#85c1e2', '#52c7b8', '#ffa07a'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    // Random starting position across the top
    const startX = Math.random() * 100;

    // Random animation properties
    const duration = 2000 + Math.random() * 2000; // 2-4 seconds
    const delay = Math.random() * 200; // 0-200ms delay
    const rotation = Math.random() * 360; // Random initial rotation
    const sway = 50 + Math.random() * 100; // How much it sways side to side

    confetti.style.cssText = `
      position: absolute;
      width: 10px;
      height: 10px;
      background-color: ${color};
      top: -20px;
      left: ${startX}%;
      transform: rotate(${rotation}deg);
      animation: confettiFall ${duration}ms linear ${delay}ms forwards;
      --sway: ${sway}px;
    `;

    this.confettiContainer.appendChild(confetti);
    this.confettiPieces.push(confetti);

    // Remove after animation completes
    setTimeout(() => {
      if (confetti.parentNode) {
        confetti.parentNode.removeChild(confetti);
      }
      const index = this.confettiPieces.indexOf(confetti);
      if (index > -1) {
        this.confettiPieces.splice(index, 1);
      }
    }, duration + delay + 100);
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.stop();
    if (this.confettiContainer?.parentNode) {
      this.confettiContainer.parentNode.removeChild(this.confettiContainer);
    }
    this.confettiContainer = null;
  }
}
