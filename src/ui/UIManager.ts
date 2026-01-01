/**
 * Manages UI elements like level number and currency display
 */
export class UIManager {
  private levelElement: HTMLElement | null;
  private currencyElement: HTMLElement | null;
  private currency: number = 0;

  constructor() {
    this.levelElement = document.querySelector('.level-num');
    this.currencyElement = document.querySelector('.currency-val');
  }

  /**
   * Set the level number displayed in the UI
   */
  public setLevel(levelNumber: number): void {
    if (this.levelElement) {
      this.levelElement.textContent = levelNumber.toString();
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
}
