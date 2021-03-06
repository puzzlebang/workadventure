import {PlayerAnimationNames} from "./Animation";
import {GameScene, Textures} from "../Game/GameScene";
import {MessageUserPositionInterface, PointInterface} from "../../Connection";
import {ActiveEventList, UserInputEvent, UserInputManager} from "../UserInput/UserInputManager";
import {Character} from "../Entity/Character";


export const hasMovedEventName = "hasMoved";
export interface CurrentGamerInterface extends Character{
    moveUser(delta: number) : void;
    say(text : string) : void;
}

export class Player extends Character implements CurrentGamerInterface {
    userInputManager: UserInputManager;
    previousDirection: string;
    wasMoving: boolean;

    constructor(
        Scene: GameScene,
        x: number,
        y: number,
        name: string,
        PlayerTexture: string,
        direction: string,
        moving: boolean
    ) {
        super(Scene, x, y, PlayerTexture, name, direction, moving, 1);

        //create input to move
        this.userInputManager = new UserInputManager(Scene);

        //the current player model should be push away by other players to prevent conflict
        this.setImmovable(false);
    }

    moveUser(delta: number): void {
        //if user client on shift, camera and player speed
        let direction = null;
        let moving = false;

        let activeEvents = this.userInputManager.getEventListForGameTick();
        let speedMultiplier = activeEvents.get(UserInputEvent.SpeedUp) ? 25 : 9;
        let moveAmount = speedMultiplier * 20;

        let x = 0;
        let y = 0;
        if (activeEvents.get(UserInputEvent.MoveUp)) {
            y = - moveAmount;
            direction = PlayerAnimationNames.WalkUp;
            moving = true;
        } else if (activeEvents.get(UserInputEvent.MoveDown)) {
            y = moveAmount;
            direction = PlayerAnimationNames.WalkDown;
            moving = true;
        }
        if (activeEvents.get(UserInputEvent.MoveLeft)) {
            x = -moveAmount;
            direction = PlayerAnimationNames.WalkLeft;
            moving = true;
        } else if (activeEvents.get(UserInputEvent.MoveRight)) {
            x = moveAmount;
            direction = PlayerAnimationNames.WalkRight;
            moving = true;
        }
        if (x !== 0 || y !== 0) {
            this.move(x, y);
            this.emit(hasMovedEventName, {moving, direction, x: this.x, y: this.y});
        } else {
            if (this.wasMoving) {
                //direction = PlayerAnimationNames.None;
                this.stop();
                this.emit(hasMovedEventName, {moving, direction: this.previousDirection, x: this.x, y: this.y});
            }
        }

        if (direction !== null) {
            this.previousDirection = direction;
        }
        this.wasMoving = moving;
    }
}
