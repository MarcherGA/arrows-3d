import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  DirectionalLight,
  Color4,
} from "@babylonjs/core";
import { GameManager } from "./game/GameManager";
import "./levels"; // Import levels to auto-register them
import { GameConfig } from "./config/GameConfig";
import { UIManager } from "./ui/UIManager";
import { AutoplayManager } from "./tutorial/AutoplayManager";
import { SoundManager, SoundType } from "./audio/SoundManager";

/**
 * Initialize and run the game
 */
class Game {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene: Scene;
  private gameManager: GameManager;
  private uiManager: UIManager;
  private autoplayManager: AutoplayManager;
  private soundManager: SoundManager;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // Initialize Babylon.js engine
    this.engine = new Engine(this.canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });

    // Create scene
    this.scene = this.createScene();

    // Initialize UI manager
    this.uiManager = new UIManager();

    // Initialize sound manager (uses new AudioV2 engine, independent of scene)
    this.soundManager = new SoundManager();

    // Initialize game manager with sound manager
    this.gameManager = new GameManager(this.scene, this.uiManager, this.soundManager);

    // Initialize autoplay manager for tutorial
    this.autoplayManager = new AutoplayManager(this.scene, this.gameManager);

    // Setup game callbacks
    this.setupGameCallbacks();

    // Initialize game asynchronously
    this.initializeGame();

    // Start render loop
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });

    // Handle window resize
    window.addEventListener("resize", () => {
      this.engine.resize();
    });
  }

  /**
   * Create Babylon.js scene with camera and lighting
   */
  private createScene(): Scene {
    const scene = new Scene(this.engine);

    // Transparent background to show HTML background image
    scene.clearColor = new Color4(0, 0, 0, 0);

    const { INITIAL_ALPHA, INITIAL_BETA, INITIAL_RADIUS, MIN_RADIUS, MAX_RADIUS, BETA_MIN, BETA_MAX } =
      GameConfig.CAMERA;

    // Setup camera
    const camera = new ArcRotateCamera(
      "camera",
      INITIAL_ALPHA,
      INITIAL_BETA,
      INITIAL_RADIUS,
      Vector3.Zero(),
      scene
    );
    camera.attachControl(this.canvas, true);

    // Camera limits
    camera.lowerRadiusLimit = MIN_RADIUS;
    camera.upperRadiusLimit = MAX_RADIUS;
    camera.lowerBetaLimit = BETA_MIN;
    camera.upperBetaLimit = BETA_MAX;

    // Disable default camera rotation (we rotate the objects instead)
    camera.inputs.removeByType("ArcRotateCameraPointersInput");

    // Hemispheric light for ambient lighting
    const hemisphericLight = new HemisphericLight(
      "hemisphericLight",
      new Vector3(0, 1, 0),
      scene
    );
    hemisphericLight.intensity = 1.5;

    // Directional light for shadows and depth
    const directionalLight = new DirectionalLight(
      "directionalLight",
      new Vector3(-1, -2, -1),
      scene
    );
    directionalLight.position = new Vector3(10, 20, 10);
    directionalLight.intensity = 0.2;

    return scene;
  }

  /**
   * Setup game event callbacks
   */
  private setupGameCallbacks(): void {
    // Handle win condition
    this.gameManager.onWin(() => {
      console.log("🎉 You won!");
      setTimeout(() => {
        this.uiManager.showWinOverlay();
      }, 500);
    });

    // Setup overlay button handlers
    this.uiManager.onHomeButton(() => {
      this.uiManager.hideWinOverlay();
      // TODO: Navigate to home screen when implemented
      console.log("Home button clicked");
    });

    this.uiManager.onPlayButton(() => {
      this.uiManager.hideWinOverlay();
      this.gameManager.loadNextLevel();
    });

    // Track block removal
    this.gameManager.onBlockRemoved((remaining) => {
      console.log(`Blocks remaining: ${remaining}`);
    });
  }

  /**
   * Get the scene instance
   */
  public getScene(): Scene {
    return this.scene;
  }

  /**
   * Get the engine instance
   */
  public getEngine(): Engine {
    return this.engine;
  }

  /**
   * Initialize game assets and start gameplay
   */
  private async initializeGame(): Promise<void> {
    // Initialize audio system in the background (non-blocking for fast startup)
    this.soundManager.initialize().then(() => {
      console.log('Audio system initialized');
      // Start background music after a short delay
      setTimeout(() => {
        this.soundManager.play(SoundType.BACKGROUND_MUSIC);
      }, 500);
    }).catch(error => {
      console.error('Failed to initialize audio:', error);
      // Game continues without audio
    });

    // Start game from level 1 (don't wait for audio)
    this.gameManager.startGame();

    // Wait for everything to be fully loaded and rendered
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Start the autoplay sequence
    this.autoplayManager.start();
  }
}

// Initialize the game when DOM is ready
const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const game = new Game(canvas);

// Expose to window for debugging
(window as any).game = game;
