import { CreateAudioEngineAsync } from '@babylonjs/core/AudioV2/webAudio/webAudioEngine';
import { CreateSoundAsync, CreateStreamingSoundAsync } from '@babylonjs/core/AudioV2/abstractAudio/audioEngineV2';
import type { AudioEngineV2 } from '@babylonjs/core/AudioV2/abstractAudio/audioEngineV2';
import type { StaticSound } from '@babylonjs/core/AudioV2/abstractAudio/staticSound';
import type { StreamingSound } from '@babylonjs/core/AudioV2/abstractAudio/streamingSound';
import { SoundState } from '@babylonjs/core/AudioV2/soundState';

/**
 * Sound types available in the game
 */
export const SoundType = {
  BLOCK_CLICKED: 'block_clicked',
  BLOCK_BLOCKED: 'block_blocked',
  LEVEL_COMPLETE: 'level_complete',
  BACKGROUND_MUSIC: 'background_music'
} as const;

export type SoundType = typeof SoundType[keyof typeof SoundType];

/**
 * Union type for sound objects
 */
type Sound = StaticSound | StreamingSound;

/**
 * Configuration for a sound effect
 */
interface SoundConfig {
  path: string;
  volume: number;
  loop: boolean;
  isStreaming: boolean;
}

/**
 * Strategy for volume calculation (Strategy Pattern)
 * Follows Single Responsibility Principle: handles only volume calculations
 */
class VolumeCalculator {
  private masterVolume = 1.0;
  private sfxVolume = 1.0;
  private musicVolume = 1.0;

  /**
   * Calculate effective volume based on sound type and volume levels
   */
  calculate(soundType: SoundType, baseVolume: number): number {
    const categoryVolume = soundType === SoundType.BACKGROUND_MUSIC
      ? this.musicVolume
      : this.sfxVolume;
    return baseVolume * categoryVolume * this.masterVolume;
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
  }
}

/**
 * Factory for creating sounds (Factory Pattern)
 * Follows Single Responsibility Principle: handles only sound creation
 * Follows Open/Closed Principle: can be extended with new sound types
 */
class SoundFactory {
  /**
   * Create a sound based on configuration using the new AudioV2 API
   */
  static async createSound(
    soundType: SoundType,
    config: SoundConfig,
    volume: number,
    engine: AudioEngineV2
  ): Promise<Sound> {
    console.log(`Loading sound: ${soundType} from ${config.path} (${config.isStreaming ? 'streaming' : 'static'})...`);

    try {
      let sound: Sound;

      if (config.isStreaming) {
        sound = await CreateStreamingSoundAsync(
          soundType,
          config.path,
          {
            loop: config.loop,
            autoplay: false,
            volume,
            maxInstances: 1 // Only one instance for streaming sounds (background music)
          },
          engine
        );
      } else {
        sound = await CreateSoundAsync(
          soundType,
          config.path,
          {
            loop: config.loop,
            autoplay: false,
            volume,
            maxInstances: 1 // Limit to 1 instance to reuse the same sound object
          },
          engine
        );
      }

      console.log(`✓ Sound loaded: ${soundType}`);
      return sound;

    } catch (error) {
      console.error(`✗ Error loading sound ${soundType}:`, error);
      throw error;
    }
  }
}

/**
 * Sound Manager following SOLID principles:
 * - Single Responsibility: Orchestrates sound lifecycle and playback
 * - Open/Closed: Extensible for new sound types without modifying core logic
 * - Liskov Substitution: All sounds extend AbstractSound
 * - Interface Segregation: Separated concerns into calculators and factories
 * - Dependency Inversion: Depends on AudioEngineV2 and AbstractSound abstractions
 *
 * Follows DRY principles by:
 * - Centralizing volume calculations in VolumeCalculator
 * - Reusing sound creation logic in SoundFactory
 * - Centralizing sound configurations in one place
 *
 * Implementation based on Babylon.js 8.0+ audio best practices:
 * - Uses new async audio engine API (CreateAudioEngineAsync)
 * - Uses CreateStreamingSoundAsync for background music to conserve memory
 * - Uses CreateSoundAsync for sound effects for better control
 * - Handles browser autoplay policies gracefully with unlockAsync
 */
export class SoundManager {
  private sounds: Map<SoundType, Sound> = new Map();
  private audioEngine: AudioEngineV2 | null = null;
  private volumeCalculator: VolumeCalculator;
  private isInitialized = false;

  // DRY: Sound configurations centralized in one place
  private readonly soundConfigs: ReadonlyMap<SoundType, SoundConfig> = new Map([
    // Sound effects use static loading (full file in memory)
    [SoundType.BLOCK_CLICKED, {
      path: '/sounds/block-moved.ogg',
      volume: 0.3,
      loop: false,
      isStreaming: false
    }],
    [SoundType.BLOCK_BLOCKED, {
      path: '/sounds/block-blocked.ogg',
      volume: 0.3,
      loop: false,
      isStreaming: false
    }],
    [SoundType.LEVEL_COMPLETE, {
      path: '/sounds/win-sound.ogg',
      volume: 0.5,
      loop: false,
      isStreaming: false
    }],
    // Background music uses streaming to save memory
    [SoundType.BACKGROUND_MUSIC, {
      path: '/sounds/background-music.ogg',
      volume: 0.1,
      loop: true,
      isStreaming: true
    }]
  ]);

  constructor() {
    this.volumeCalculator = new VolumeCalculator();
  }

  /**
   * Initialize the audio engine and load all sounds
   * This should be called during game initialization
   * @returns Promise that resolves when audio system is ready
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('SoundManager already initialized');
      return;
    }

    console.log('🔊 Initializing SoundManager with new AudioV2 engine...');

    try {
      // Create the new async audio engine
      this.audioEngine = await CreateAudioEngineAsync();

      // Unlock audio engine to handle browser autoplay restrictions
      await this.audioEngine.unlockAsync();
      console.log('✓ Audio engine created and unlocked');

      // Load all sounds in parallel using Promise.allSettled to continue even if some fail
      const loadPromises = Array.from(this.soundConfigs.entries()).map(
        ([soundType, config]) => this.loadSound(soundType, config)
      );

      await Promise.allSettled(loadPromises);

      this.isInitialized = true;
      console.log('✅ SoundManager initialized successfully');

    } catch (error) {
      console.error('Failed to initialize SoundManager:', error);
      // Continue gracefully without sounds
      this.isInitialized = true;
    }
  }

  /**
   * Load a single sound using the factory pattern
   * DRY: Reuses SoundFactory for all sound creation logic
   */
  private async loadSound(soundType: SoundType, config: SoundConfig): Promise<void> {
    if (!this.audioEngine) {
      throw new Error('Audio engine not initialized');
    }

    try {
      const effectiveVolume = this.volumeCalculator.calculate(soundType, config.volume);
      const sound = await SoundFactory.createSound(soundType, config, effectiveVolume, this.audioEngine);
      this.sounds.set(soundType, sound);
    } catch (error) {
      console.error(`Failed to load sound ${soundType}, continuing without it`);
      // Don't throw - allow game to continue without this sound
    }
  }

  /**
   * Play a sound effect
   * Handles browser autoplay restrictions gracefully
   * @param soundType - The type of sound to play
   * @param volume - Optional volume override (0.0 to 1.0)
   * @returns true if sound was played, false if sound doesn't exist or can't play
   */
  public play(soundType: SoundType, volume?: number): boolean {
    const sound = this.sounds.get(soundType);

    if (!sound) {
      console.warn(`Sound not found: ${soundType}`);
      return false;
    }

    try {
      // Calculate and apply volume
      const config = this.soundConfigs.get(soundType);
      const effectiveVolume = this.volumeCalculator.calculate(
        soundType,
        volume ?? config?.volume ?? 1.0
      );

      // Set volume (this affects all instances)
      sound.volume = effectiveVolume;

      // Play the sound
      // Note: With maxInstances: 1, calling play() will automatically stop any
      // existing instance and reuse it, preventing memory leaks
      sound.play();

      return true;

    } catch (error) {
      console.warn(`Failed to play sound ${soundType}:`, error);
      return false;
    }
  }

  /**
   * Stop a playing sound
   */
  public stop(soundType: SoundType): void {
    const sound = this.sounds.get(soundType);
    if (sound && sound.state === SoundState.Started) {
      sound.stop();
    }
  }

  /**
   * Pause a playing sound
   */
  public pause(soundType: SoundType): void {
    const sound = this.sounds.get(soundType);
    if (sound && sound.state === SoundState.Started) {
      sound.pause();
    }
  }

  /**
   * Resume a paused sound
   */
  public resume(soundType: SoundType): void {
    const sound = this.sounds.get(soundType);
    if (sound && sound.state === SoundState.Paused) {
      sound.resume();
    }
  }

  /**
   * Set master volume for all sounds
   * DRY: Delegates to VolumeCalculator
   */
  public setMasterVolume(volume: number): void {
    this.volumeCalculator.setMasterVolume(volume);
    this.updateAllVolumes();
  }

  /**
   * Set volume for all sound effects
   * DRY: Delegates to VolumeCalculator
   */
  public setSFXVolume(volume: number): void {
    this.volumeCalculator.setSFXVolume(volume);
    this.updateAllVolumes();
  }

  /**
   * Set volume for background music
   * DRY: Delegates to VolumeCalculator
   */
  public setMusicVolume(volume: number): void {
    this.volumeCalculator.setMusicVolume(volume);
    this.updateAllVolumes();
  }

  /**
   * Update volumes for all loaded sounds based on current settings
   * DRY: Reuses volume calculation logic from VolumeCalculator
   */
  private updateAllVolumes(): void {
    this.sounds.forEach((sound, soundType) => {
      const config = this.soundConfigs.get(soundType);
      const effectiveVolume = this.volumeCalculator.calculate(soundType, config?.volume ?? 1.0);
      sound.volume = effectiveVolume;
    });
  }

  /**
   * Mute all sounds
   */
  public muteAll(): void {
    this.sounds.forEach(sound => {
      sound.volume = 0;
    });
  }

  /**
   * Unmute all sounds
   */
  public unmuteAll(): void {
    this.updateAllVolumes();
  }

  /**
   * Check if a sound is currently playing
   */
  public isPlaying(soundType: SoundType): boolean {
    const sound = this.sounds.get(soundType);
    return sound ? sound.state === SoundState.Started : false;
  }

  /**
   * Dispose of all sounds and clean up resources
   * Should be called when the game is shutting down
   */
  public dispose(): void {
    this.sounds.forEach(sound => {
      sound.dispose();
    });
    this.sounds.clear();

    if (this.audioEngine) {
      this.audioEngine.dispose();
      this.audioEngine = null;
    }

    this.isInitialized = false;
  }

  /**
   * Get initialization status
   */
  public getIsInitialized(): boolean {
    return this.isInitialized;
  }
}
