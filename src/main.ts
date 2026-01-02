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
import { Level1, Level2 } from "./levels/Level1";
import { CAMERA } from "./constants";
import { UIManager } from "./ui/UIManager";

/**
 * Initialize and run the game
 */
class Game {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene: Scene;
  private gameManager: GameManager;
  private uiManager: UIManager;

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

    // Initialize game manager
    this.gameManager = new GameManager(this.scene, this.uiManager);

    // Setup game callbacks
    this.setupGameCallbacks();

    // Load first level
    this.gameManager.loadLevel(Level1);

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

    // Setup camera
    const camera = new ArcRotateCamera(
      "camera",
      CAMERA.INITIAL_ALPHA,
      CAMERA.INITIAL_BETA,
      CAMERA.INITIAL_RADIUS,
      Vector3.Zero(),
      scene
    );
    camera.attachControl(this.canvas, true);

    // Camera limits
    camera.lowerRadiusLimit = CAMERA.MIN_RADIUS;
    camera.upperRadiusLimit = CAMERA.MAX_RADIUS;
    camera.lowerBetaLimit = CAMERA.BETA_MIN;
    camera.upperBetaLimit = CAMERA.BETA_MAX;

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
      this.gameManager.restart(Level1);
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
}

// Initialize the game when DOM is ready
const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const game = new Game(canvas);

// Expose to window for debugging
(window as any).game = game;
