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
  private overlayLevelElement: HTMLElement | null;
  private totalCurrencyElement: HTMLElement | null;
  private levelCurrencyElement: HTMLElement | null;
  private homeButton: HTMLElement | null;
  private playButton: HTMLElement | null;

  constructor() {
    this.levelElement = document.querySelector('.level-num');
    this.currencyElement = document.querySelector('.currency-val');

    // Win overlay elements
    this.winOverlay = document.querySelector('#winOverlay');
    this.overlayLevelElement = document.querySelector('#overlayLevel');
    this.totalCurrencyElement = document.querySelector('#totalCurrency');
    this.levelCurrencyElement = document.querySelector('#levelCurrency');
    this.homeButton = document.querySelector('#homeButton');
    this.playButton = document.querySelector('#playButton');
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

      // Show the overlay
      this.winOverlay.classList.add('show');
    }
  }

  /**
   * Hide the win overlay
   */
  public hideWinOverlay(): void {
    if (this.winOverlay) {
      this.winOverlay.classList.remove('show');
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
