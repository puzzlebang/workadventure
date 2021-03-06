import {gameManager} from "../Game/GameManager";
import {TextField} from "../Components/TextField";
import {ClickButton} from "../Components/ClickButton";
import Image = Phaser.GameObjects.Image;
import Rectangle = Phaser.GameObjects.Rectangle;
import {PLAYER_RESOURCES} from "../Entity/Character";
import {GameSceneInitInterface} from "../Game/GameScene";

//todo: put this constants in a dedicated file
export const SelectCharacterSceneName = "SelectCharacterScene";
enum LoginTextures {
    playButton = "play_button",
    icon = "icon",
    mainFont = "main_font"
}

export interface SelectCharacterSceneInitDataInterface {
    name: string
}

export class SelectCharacterScene extends Phaser.Scene {
    private readonly nbCharactersPerRow = 4;
    private textField: TextField;
    private pressReturnField: TextField;
    private logo: Image;
    private loginName: string;

    private selectedRectangle: Rectangle;
    private selectedRectangleXPos = 0; // Number of the character selected in the rows
    private selectedRectangleYPos = 0; // Number of the character selected in the columns
    private selectedPlayer: Phaser.Physics.Arcade.Sprite;
    private players: Array<Phaser.Physics.Arcade.Sprite> = new Array<Phaser.Physics.Arcade.Sprite>();

    constructor() {
        super({
            key: SelectCharacterSceneName
        });
    }

    init({ name }: SelectCharacterSceneInitDataInterface) {
        this.loginName = name;
    }

    preload() {
        this.load.image(LoginTextures.playButton, "resources/objects/play_button.png");
        this.load.image(LoginTextures.icon, "resources/logos/tcm_full.png");
        // Note: arcade.png from the Phaser 3 examples at: https://github.com/photonstorm/phaser3-examples/tree/master/public/assets/fonts/bitmap
        this.load.bitmapFont(LoginTextures.mainFont, 'resources/fonts/arcade.png', 'resources/fonts/arcade.xml');
        //add player png
        PLAYER_RESOURCES.forEach((playerResource: any) => {
            this.load.spritesheet(
                playerResource.name,
                playerResource.img,
                {frameWidth: 32, frameHeight: 32}
            );
        });
    }

    create() {
        this.textField = new TextField(this, this.game.renderer.width / 2, 50, 'Select your character');
        this.textField.setOrigin(0.5).setCenterAlign()

        this.pressReturnField = new TextField(this, this.game.renderer.width / 2, 230, 'Press enter to start');
        this.pressReturnField.setOrigin(0.5).setCenterAlign()

        let rectangleXStart = this.game.renderer.width / 2 - (this.nbCharactersPerRow / 2) * 32 + 16;

        this.selectedRectangle = this.add.rectangle(rectangleXStart, 90, 32, 32).setStrokeStyle(2, 0xFFFFFF);

        this.logo = new Image(this, this.game.renderer.width - 30, this.game.renderer.height - 20, LoginTextures.icon);
        this.add.existing(this.logo);

        this.input.keyboard.on('keyup-ENTER', () => {
            return this.login(this.loginName);
        });

        this.input.keyboard.on('keydown-RIGHT', () => {
            if (this.selectedRectangleXPos < this.nbCharactersPerRow - 1) {
                this.selectedRectangleXPos++;
            }
            this.updateSelectedPlayer();
        });
        this.input.keyboard.on('keydown-LEFT', () => {
            if (this.selectedRectangleXPos > 0) {
                this.selectedRectangleXPos--;
            }
            this.updateSelectedPlayer();
        });
        this.input.keyboard.on('keydown-DOWN', () => {
            if (this.selectedRectangleYPos < Math.ceil(PLAYER_RESOURCES.length / this.nbCharactersPerRow) - 1) {
                this.selectedRectangleYPos++;
            }
            this.updateSelectedPlayer();
        });
        this.input.keyboard.on('keydown-UP', () => {
            if (this.selectedRectangleYPos > 0) {
                this.selectedRectangleYPos--;
            }
            this.updateSelectedPlayer();
        });

        /*create user*/
        this.createCurrentPlayer();

        if (window.localStorage) {
            let playerNumberStr: string = window.localStorage.getItem('selectedPlayer') ?? '0';
            let playerNumber: number = Number(playerNumberStr);
            this.selectedRectangleXPos = playerNumber % this.nbCharactersPerRow;
            this.selectedRectangleYPos = Math.floor(playerNumber / this.nbCharactersPerRow);
            this.updateSelectedPlayer();
        }
    }

    update(time: number, delta: number): void {
        this.pressReturnField.setVisible(!!(Math.floor(time / 500) % 2));
    }

    private async login(name: string) {
        return gameManager.connect(name, this.selectedPlayer.texture.key).then(() => {
            // Do we have a start URL in the address bar? If so, let's redirect to this address
            let instanceAndMapUrl = this.findMapUrl();
            if (instanceAndMapUrl !== null) {
                let [mapUrl, instance] = instanceAndMapUrl;
                let key = gameManager.loadMap(mapUrl, this.scene, instance);
                this.scene.start(key, {
                    startLayerName: window.location.hash ? window.location.hash.substr(1) : undefined
                } as GameSceneInitInterface);
                return mapUrl;
            } else {
                // If we do not have a map address in the URL, let's ask the server for a start map.
                return gameManager.loadStartMap().then((scene : any) => {
                    if (!scene) {
                        return;
                    }
                    let key = gameManager.loadMap(window.location.protocol + "//" + scene.mapUrlStart, this.scene, scene.startInstance);
                    this.scene.start(key);
                    return scene;
                }).catch((err) => {
                    console.error(err);
                    throw err;
                });
            }
        }).catch((err) => {
            console.error(err);
            throw err;
        });
    }

    /**
     * Returns the map URL and the instance from the current URL
     */
    private findMapUrl(): [string, string]|null {
        let path = window.location.pathname;
        if (!path.startsWith('/_/')) {
            return null;
        }
        let instanceAndMap = path.substr(3);
        let firstSlash = instanceAndMap.indexOf('/');
        if (firstSlash === -1) {
            return null;
        }
        let instance = instanceAndMap.substr(0, firstSlash);
        return [window.location.protocol+'//'+instanceAndMap.substr(firstSlash+1), instance];
    }

    createCurrentPlayer(): void {
        for (let i = 0; i <PLAYER_RESOURCES.length; i++) {
            let playerResource = PLAYER_RESOURCES[i];

            let col = i % this.nbCharactersPerRow;
            let row = Math.floor(i / this.nbCharactersPerRow);

            let [x, y] = this.getCharacterPosition(col, row);
            let player = this.physics.add.sprite(x, y, playerResource.name, 0);
            player.setBounce(0.2);
            player.setCollideWorldBounds(true);
            this.anims.create({
                key: playerResource.name,
                frames: this.anims.generateFrameNumbers(playerResource.name, {start: 0, end: 2,}),
                frameRate: 10,
                repeat: -1
            });
            player.setInteractive().on("pointerdown", () => {
                this.selectedRectangleXPos = col;
                this.selectedRectangleYPos = row;
                this.updateSelectedPlayer();
            });
            this.players.push(player);
        }
        this.selectedPlayer = this.players[0];
        this.selectedPlayer.play(PLAYER_RESOURCES[0].name);
    }

    /**
     * Returns pixel position by on column and row number
     */
    private getCharacterPosition(x: number, y: number): [number, number] {
        return [
            this.game.renderer.width / 2 + 16 + (x - this.nbCharactersPerRow / 2) * 32,
            y * 32 + 90
        ];
    }

    private updateSelectedPlayer(): void {
        this.selectedPlayer.anims.pause();
        let [x, y] = this.getCharacterPosition(this.selectedRectangleXPos, this.selectedRectangleYPos);
        this.selectedRectangle.setX(x);
        this.selectedRectangle.setY(y);
        let playerNumber = this.selectedRectangleXPos + this.selectedRectangleYPos * this.nbCharactersPerRow;
        let player = this.players[playerNumber];
        player.play(PLAYER_RESOURCES[playerNumber].name);
        this.selectedPlayer = player;
        if (window.localStorage) {
            window.localStorage.setItem('selectedPlayer', String(playerNumber));
        }
    }
}
