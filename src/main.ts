import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { GameManager } from "./game/GameManager";
import "./levels"; // Import levels to auto-register them
import { GameConfig } from "./config/GameConfig";
import { UIManager } from "./ui/UIManager";
import { AutoplayManager } from "./tutorial/AutoplayManager";
import { SoundManager, SoundType } from "./audio/SoundManager";

// Side-effects imports to prevent tree-shaking
import "@babylonjs/core/PostProcesses/postProcess";
import "@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderPipeline";
import "@babylonjs/core/Materials/Textures/Loaders/";
import "@babylonjs/core/Animations/";
import "@babylonjs/core/Culling/ray";
import '@babylonjs/core/Engines/Extensions/'; // Ensure audio engine is included
import "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/loaders/glTF";




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

    const { INITIAL_ALPHA, INITIAL_BETA, INITIAL_RADIUS, ENABLE_ZOOM, MIN_RADIUS, MAX_RADIUS, BETA_MIN, BETA_MAX } =
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
    if (ENABLE_ZOOM) {
      // Allow user to zoom in/out
      camera.lowerRadiusLimit = MIN_RADIUS;
      camera.upperRadiusLimit = MAX_RADIUS;
    } else {
      // Lock zoom at initial radius - levels can override this in GameManager
      camera.lowerRadiusLimit = INITIAL_RADIUS;
      camera.upperRadiusLimit = INITIAL_RADIUS;
    }
    camera.lowerBetaLimit = BETA_MIN;
    camera.upperBetaLimit = BETA_MAX;

    // Disable default camera rotation (we rotate the objects instead)
    camera.inputs.removeByType("ArcRotateCameraPointersInput");

    const { HEMISPHERIC_INTENSITY, HEMISPHERIC_DIRECTION, DIRECTIONAL_INTENSITY, DIRECTIONAL_DIRECTION, DIRECTIONAL_POSITION } = GameConfig.LIGHTING;

    // Hemispheric light for ambient lighting
    const hemisphericLight = new HemisphericLight(
      "hemisphericLight",
      new Vector3(HEMISPHERIC_DIRECTION.x, HEMISPHERIC_DIRECTION.y, HEMISPHERIC_DIRECTION.z),
      scene
    );
    hemisphericLight.intensity = HEMISPHERIC_INTENSITY;

    // Directional light for shadows and depth
    const directionalLight = new DirectionalLight(
      "directionalLight",
      new Vector3(DIRECTIONAL_DIRECTION.x, DIRECTIONAL_DIRECTION.y, DIRECTIONAL_DIRECTION.z),
      scene
    );
    directionalLight.position = new Vector3(DIRECTIONAL_POSITION.x, DIRECTIONAL_POSITION.y, DIRECTIONAL_POSITION.z);
    directionalLight.intensity = DIRECTIONAL_INTENSITY;

    return scene;
  }

  /**
   * Setup game event callbacks
   */
  private setupGameCallbacks(): void {
    // Handle win condition
    this.gameManager.onWin(() => {
      setTimeout(() => {
        this.uiManager.showWinOverlay();
      }, GameConfig.UI.WIN_OVERLAY_DELAY);
    });

    // Setup overlay button handlers
    this.uiManager.onHomeButton(() => {
      this.uiManager.hideWinOverlay();
      // TODO: Navigate to home screen when implemented
    });

    this.uiManager.onPlayButton(() => {
      this.uiManager.hideWinOverlay();
      this.gameManager.loadNextLevel();
    });

    // Track block removal
    this.gameManager.onBlockRemoved(() => {
      // Block removal tracking (optional: could update UI here)
    });

    // Handle timeout (idle or max engagement time)
    this.gameManager.onTimeout(() => {
      // Show win overlay as CTA (in real playable ad, this would trigger app store redirect)
      this.uiManager.showWinOverlay();
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
