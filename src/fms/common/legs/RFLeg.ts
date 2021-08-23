import { Waypoint } from '../Waypoint';
import { AltitudeConstraint, Leg, PathVector, PathVectorType, SpeedConstraint } from "./index";
import { Degrees, Location, NauticalMiles } from "../../../shared/types/Common";

export class RFLeg implements Leg {

    public to: Waypoint;

    private readonly mDistance: NauticalMiles;

    private readonly mCourse: Degrees;

    private readonly arcRadius: NauticalMiles;

    constructor(to: Waypoint, course: number, distance: number, arcRadius: number) {
        this.to = to;
        this.mCourse = course;
        this.mDistance = distance;
        this.arcRadius = arcRadius;
    }

    get identifier(): string {
        return this.to.identifier;
    }

    get altitudeConstraint(): AltitudeConstraint | undefined
    {
        return this.to.altitudeConstraint;
    }

    get bearing(): Degrees
    {
        return this.mCourse;
    }

    get distance(): NauticalMiles
    {
        return this.mDistance;
    }

    getDistanceToGo(ppos: Location): NauticalMiles
    {
        return 0;
    }

    getGuidanceParameters(ppos: Location, trueTrack: Degrees)
    {
        return undefined as any;
    }

    getNominalRollAngle(gs: number): Degrees
    {
        return 0;
    }

    getPseudoWaypointLocation(distanceBeforeTerminator: number): Location | undefined
    {
        return undefined;
    }

    get initialLocation(): Location | undefined
    {
        return undefined;
    }

    isAbeam(ppos: Location)
    {
        return false;
    }

    get isCircularArc(): boolean
    {
        return false;
    }

    get speedConstraint(): SpeedConstraint | undefined
    {
        return this.to.speedConstraint;
    }

    get terminatorLocation(): Location | undefined
    {
        return this.to.coordinates;
    }

    public getPredictedPath(): PathVector[] {
        return [
                {
                type: PathVectorType.Arc,
                startPoint: this.from.coordinates,
                centrePoint: this.centre.coordinates,
                sweepAngle: (this.clockwise ? -1 : 1) * this.angle,
            },
        ];
    }
}
