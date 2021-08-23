import { GuidanceParameters } from "../ControlLaws";
import { Guidable } from "../Guidable";
import { AltitudeDescriptor, SpeedDescriptor } from "../../../shared/types/ProcedureLeg";
import { Degrees, Feet, Knots, Location, NauticalMiles } from "../../../shared/types/Common";

export interface AltitudeConstraint {
    type: AltitudeDescriptor,
    altitude1: Feet,
    altitude2: Feet | undefined,
}

export interface SpeedConstraint {
    type: SpeedDescriptor,
    speed: Knots,
}

export enum PathVectorType {
    Line,
    Arc,
}

/**
 * path vectors are generated for the ND etc.
 */
export interface PathVector {
    type: PathVectorType,
    startPoint: Location,
    /**
     * end point of line
     */
    endPoint?: Location,
    /**
     * centre of arc
     */
    centrePoint?: Location,
    /**
     * conventional right-hand angle i.e. +ve = anti-clockwise, -ve = clockwise
     */
    sweepAngle?: Degrees,
}

export abstract class Leg implements Guidable {
    abstract isCircularArc: boolean;

    abstract bearing: Degrees;

    abstract distance: NauticalMiles;

    abstract speedConstraint: SpeedConstraint | undefined;

    abstract altitudeConstraint: AltitudeConstraint | undefined;

    abstract initialLocation: Location | undefined;

    abstract terminatorLocation: Location | undefined;

    abstract getPseudoWaypointLocation(distanceBeforeTerminator: NauticalMiles): Location | undefined;

    abstract getGuidanceParameters(ppos: Location, trueTrack: Degrees): GuidanceParameters;

    public getNominalRollAngle?(gs: number): Degrees {
        return 0;
    }

    abstract getDistanceToGo(ppos: Location): NauticalMiles;

    abstract isAbeam(ppos: Location): boolean;

    getPredictedPath?(): PathVector[] {
        return [];
    }
}
