import { ConfettiManager } from './ConfettiManager';

/**
 * Manages UI elements like level number and currency display
 */
export class UIManager {
  private levelElement: HTMLElement | null;
  private currencyElement: HTMLElement | null;
  private currency: number = 0;
  private currentLevel: number = 1;

  // Win overlay elements
  private winOverlay: HTMLElement | null;
  private overlayBackground: HTMLElement | null;
  private overlayLevelElement: HTMLElement | null;
  private totalCurrencyElement: HTMLElement | null;
  private levelCurrencyElement: HTMLElement | null;
  private homeButton: HTMLElement | null;
  private playButton: HTMLElement | null;

  // Confetti manager
  private confettiManager: ConfettiManager;

  constructor() {
    this.levelElement = document.querySelector('.level-num');
    this.currencyElement = document.querySelector('.currency-val');

    // Win overlay elements
    this.winOverlay = document.querySelector('#winOverlay');
    this.overlayBackground = document.querySelector('#overlayBackground');
    this.overlayLevelElement = document.querySelector('#overlayLevel');
    this.totalCurrencyElement = document.querySelector('#totalCurrency');
    this.levelCurrencyElement = document.querySelector('#levelCurrency');
    this.homeButton = document.querySelector('#homeButton');
    this.playButton = document.querySelector('#playButton');

    // Initialize confetti manager
    this.confettiManager = new ConfettiManager();
  }

  /**
   * Set the level number displayed in the UI
   */
  public setLevel(levelNumber: number): void {
    this.currentLevel = levelNumber;
    if (this.levelElement) {
      this.levelElement.textContent = levelNumber.toString();
    }
    if (this.overlayLevelElement) {
      this.overlayLevelElement.textContent = levelNumber.toString();
    }
  }

  /**
   * Reset currency to 0
   */
  public resetCurrency(): void {
    this.currency = 0;
    this.updateCurrencyDisplay();
  }

  /**
   * Increment currency by 1
   */
  public incrementCurrency(): void {
    this.currency++;
    this.updateCurrencyDisplay();
    this.showCurrencyGain(1);
  }

  /**
   * Update the currency display in the UI
   */
  private updateCurrencyDisplay(): void {
    if (this.currencyElement) {
      this.currencyElement.textContent = this.currency.toString();
    }
  }

  /**
   * Show floating currency gain animation
   */
  private showCurrencyGain(amount: number): void {
    const currencyContainer = document.querySelector('.currency-container');
    if (!currencyContainer) return;

    // Create the floating element
    const gainElement = document.createElement('div');
    gainElement.className = 'currency-gain';

    // Create icon
    const iconDiv = document.createElement('div');
    iconDiv.className = 'currency-gain-icon';
    const img = document.createElement('img');
    img.src = '/icons/dollars.png';
    img.alt = 'Currency';
    iconDiv.appendChild(img);

    // Create text
    const textSpan = document.createElement('span');
    textSpan.textContent = `+${amount}`;

    // Assemble
    gainElement.appendChild(iconDiv);
    gainElement.appendChild(textSpan);

    // Add to container
    currencyContainer.appendChild(gainElement);

    // Remove after animation completes
    setTimeout(() => {
      if (gainElement.parentNode) {
        gainElement.parentNode.removeChild(gainElement);
      }
    }, 1500);
  }

  /**
   * Get current currency value
   */
  public getCurrency(): number {
    return this.currency;
  }

  /**
   * Show the win overlay with current level and currency information
   */
  public showWinOverlay(): void {
    if (this.winOverlay) {
      // Update overlay with current data
      if (this.totalCurrencyElement) {
        this.totalCurrencyElement.textContent = this.currency.toString();
      }
      if (this.levelCurrencyElement) {
        this.levelCurrencyElement.textContent = this.currency.toString();
      }
      if (this.overlayLevelElement) {
        this.overlayLevelElement.textContent = this.currentLevel.toString();
      }

      // Show the background overlay
      if (this.overlayBackground) {
        this.overlayBackground.classList.add('show');
      }

      // Show the overlay
      this.winOverlay.classList.add('show');

      // Start confetti animation
      this.confettiManager.start();
    }
  }

  /**
   * Hide the win overlay
   */
  public hideWinOverlay(): void {
    if (this.winOverlay) {
      this.winOverlay.classList.remove('show');

      // Hide the background overlay
      if (this.overlayBackground) {
        this.overlayBackground.classList.remove('show');
      }

      // Stop confetti animation
      this.confettiManager.stop();
    }
  }

  /**
   * Set callback for home button
   */
  public onHomeButton(callback: () => void): void {
    if (this.homeButton) {
      this.homeButton.addEventListener('click', callback);
    }
  }

  /**
   * Set callback for play button (next level/replay)
   */
  public onPlayButton(callback: () => void): void {
    if (this.playButton) {
      this.playButton.addEventListener('click', callback);
    }
  }
}
